# Split Ledger And Admin Endpoints Design

## Goal

Split the SDK client configuration and service construction across the real API surfaces:

- ledger API services use `ledgerEndpoint`
- participant-admin services use `adminEndpoint`

This is an intentional breaking cleanup. The old single `endpoint` option should be removed rather than preserved behind aliases.

## Decision Summary

- replace `endpoint` with `ledgerEndpoint` and `adminEndpoint`
- keep one public `CantonClient`
- route each public service to the endpoint that matches its gRPC boundary
- allow client construction when one endpoint is missing
- fail lazily only when a service from the missing surface is used
- support shared gRPC channel security with per-surface overrides
- document the service-to-endpoint map explicitly in both `README.md` and `DOCUMENTATION.md`

## Public Options Shape

`CantonClientOptions` should become:

```ts
new CantonClientOptions({
    transportKind: TransportKind.grpc,
    ledgerEndpoint: "https://ledger.example.com",
    adminEndpoint: "https://admin.example.com",
    grpcChannelSecurity: GrpcChannelSecurity.tls,
    ledgerGrpcChannelSecurity: GrpcChannelSecurity.tls,
    adminGrpcChannelSecurity: GrpcChannelSecurity.plaintext,
    defaultRequestTimeoutMs: 5000,
    grpcConnectTimeoutMs: 3000,
    authProvider,
    commandSigner,
});
```

### Added Properties

- `ledgerEndpoint?: string`
- `adminEndpoint?: string`
- `grpcChannelSecurity?: GrpcChannelSecurity`
- `ledgerGrpcChannelSecurity?: GrpcChannelSecurity`
- `adminGrpcChannelSecurity?: GrpcChannelSecurity`

### Removed Property

- `endpoint`

### Shared Properties That Stay Shared

- `transportKind`
- `defaultRequestTimeoutMs`
- `grpcConnectTimeoutMs`
- `authProvider`
- `commandSigner`

## Endpoint Security Resolution

gRPC security should resolve per surface with a shared default:

- ledger services use `ledgerGrpcChannelSecurity ?? grpcChannelSecurity ?? GrpcChannelSecurity.tls`
- admin services use `adminGrpcChannelSecurity ?? grpcChannelSecurity ?? GrpcChannelSecurity.tls`

Reasoning:

- most deployments can still configure one shared policy
- mixed deployments can opt into different ledger and admin policies
- the shape stays flat and C#-style instead of introducing nested endpoint objects

JSON transport behavior is unaffected by this security split.

## Public Service Boundaries

### Ledger Endpoint Services

These services should bind to `ledgerEndpoint`:

- `versionService`
- `healthService`
- `packageService`
- `commandService`
- `commandSubmissionService`
- `commandCompletionService`
- `stateService`
- `updateService`
- `eventQueryService`
- `contractService`

### Admin Endpoint Services

These services should bind to `adminEndpoint`:

- `partyManagementService`
- `userManagementService`
- `participantPackageService`

## Routing Rules

### Health

`healthService` stays on the ledger endpoint because it wraps `grpc.health.v1.Health.Check` against the ledger API host, not the Canton participant-admin API.

### Ledger Package Reads

`packageService` stays on the ledger endpoint because it mirrors `com.daml.ledger.api.v2.PackageService`.

### Participant Package Operations

`participantPackageService` stays on the admin endpoint because it mirrors Canton participant-admin package operations and reads.

### JSON

JSON should follow the same endpoint split where methods are actually supported:

- ledger-surface JSON methods use `ledgerEndpoint`
- admin-surface JSON methods use `adminEndpoint`
- unsupported JSON methods still throw `NotSupportedError`

## Construction And Missing Endpoint Behavior

`CantonClient` should continue to construct even when only one endpoint is provided.

Examples:

- ledger-only client: valid
- admin-only client: valid
- both endpoints present: valid
- neither endpoint present: valid construction, but no actual service calls will work

Failures should happen lazily at service use time, not at client construction time.

### Missing Endpoint Failure Model

When a service is used and its surface endpoint is missing, the SDK should throw a dedicated SDK error rather than a generic low-level failure.

Recommended error:

- `EndpointNotConfiguredError`

Expected message shape:

- `"The ledger endpoint is not configured for versionService."`
- `"The admin endpoint is not configured for participantPackageService."`

This keeps the failure explicit, deterministic, and aligned with the public service boundary.

## Internal Structure

The current service registry builds one transport from one endpoint. That should change to two independent endpoint-bound transports:

- `ledgerTransport`
- `adminTransport`

Each public service should be constructed against the transport for its own surface.

### Suggested Internal Helpers

- `createLedgerTransportOrPlaceholder(...)`
- `createAdminTransportOrPlaceholder(...)`

These helpers should:

- return a real transport when the surface endpoint is configured
- return a placeholder transport that throws `EndpointNotConfiguredError` when the surface endpoint is missing

This keeps the service registry literal and easy to extend as more admin services are added later.

## Transport Factory Impact

The transport factories should no longer infer everything from one shared endpoint on `CantonClientOptions`.

Instead, transport creation should receive:

- the concrete endpoint string for the selected surface
- the resolved surface security when using gRPC
- the existing shared auth and timeout options

### gRPC

gRPC transport creation must support:

- ledger endpoint plus resolved ledger security
- admin endpoint plus resolved admin security

### JSON

JSON transport creation only needs:

- the concrete ledger or admin endpoint
- existing shared auth and timeout options

## Backward Compatibility

This change is intentionally breaking.

Breaking changes:

- remove `endpoint` from `CantonClientOptions`
- require callers to move to `ledgerEndpoint` and `adminEndpoint`
- remove any assumption that one transport instance always serves the full SDK surface

Why accept the break:

- the SDK is still early
- the current single-endpoint model does not match the real service boundaries
- keeping backward compatibility would preserve a structurally wrong design

## Documentation Changes

Update `README.md`:

- replace all `endpoint` examples with `ledgerEndpoint` and `adminEndpoint`
- explain that the services are split by API surface
- show which services use ledger vs admin

Update `DOCUMENTATION.md`:

- update `CantonClientOptions` constructor docs
- add a dedicated section describing endpoint ownership by service
- extend the service map with an “Endpoint Surface” column
- document the gRPC security fallback rules

The docs should not mention `endpoint` as a legacy alias because this change intentionally removes backward compatibility.

## Testing Strategy

Add focused tests for:

- `CantonClientOptions` storing `ledgerEndpoint` and `adminEndpoint`
- `CantonClientOptions` resolving shared and per-surface security defaults correctly
- service registry routing ledger services to the ledger transport
- service registry routing admin services to the admin transport
- gRPC factory creation using the correct endpoint and resolved surface security
- JSON factory creation using the correct endpoint per surface
- client construction succeeding with only one endpoint configured
- ledger-service calls failing lazily when `ledgerEndpoint` is missing
- admin-service calls failing lazily when `adminEndpoint` is missing
- clear `EndpointNotConfiguredError` messages that name the surface and service

Regression goals:

- existing supported calls still behave the same when both endpoints are present
- unsupported JSON calls still throw `NotSupportedError`
- disposal and timeout behavior continue to work across both surfaces

## Non-Goals

- no nested endpoint configuration object in this change
- no backward-compatible `endpoint` alias
- no per-surface auth providers in this change
- no per-surface timeout configuration in this change
- no public client split such as `client.ledger` and `client.admin`
