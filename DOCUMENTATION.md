# Canton TypeScript SDK Documentation

## Overview

This SDK exposes:

- a shared `CantonClient` for normal application use
- protocol-specific `GrpcLedgerClient` and `JsonLedgerClient` entrypoints
- request and response classes for all supported operations
- auth, signing, enum, and error types

The SDK follows a C#-style shape:

- instantiate option or request objects explicitly
- call methods on service clients
- receive typed response objects

Current alignment note:

- `VersionService`, `PartyManagementService`, `UserManagementService`, and `PackageManagementService` are already exposed under gRPC-shaped names on `CantonClient`
- `CommandService.submitAndWaitAsync(...)` is the active command surface
- `CommandSubmissionService.submitAsync(...)` is present but intentionally unsupported for now
- `StateService.getActiveContractsPageAsync(...)`, `StateService.getActiveContractsAsync(...)`, and `UpdateService.getUpdatesAsync(...)` are the first migrated ledger-read surfaces

## Installation And Imports

```ts
import {
    AllocatePartyRequest,
    BearerTokenAuthProvider,
    CantonClient,
    CantonClientOptions,
    GetLedgerApiVersionResponse,
    GrantUserRightsRequest,
    GrpcChannelSecurity,
    ListKnownPartiesRequest,
    TransportKind,
    UploadDarFileRequest,
    UserRightKind,
} from "canton-typescript-sdk";
```

Protocol-specific entrypoints:

```ts
import { GrpcLedgerClient } from "canton-typescript-sdk/grpc";
import { JsonLedgerClient } from "canton-typescript-sdk/json";
```

## Transport Support Matrix

| Surface | JSON | gRPC |
| --- | --- | --- |
| `versionService.getLedgerApiVersionAsync()` | Yes | Yes |
| `partyManagementService.allocatePartyAsync()` | Yes | Yes |
| `partyManagementService.listKnownPartiesAsync()` | Yes | Yes |
| `userManagementService.grantUserRightsAsync()` | Yes | Yes |
| `packageManagementService.uploadDarFileAsync()` | Yes | Yes |
| `commandService.submitAndWaitAsync()` | Yes | Yes |
| `stateService.getActiveContractsPageAsync()` | Yes | Yes |
| `stateService.getActiveContractsAsync()` | Yes | No |
| `updateService.getUpdatesAsync()` | No | Yes |
| external command signing | No | Yes |

## Shared Client

### `new CantonClientOptions(init)`

Use this to configure the shared client.

Fields:

- `transportKind: TransportKind`  
  Required. `TransportKind.json` or `TransportKind.grpc`.
- `endpoint: string`  
  Required. Base endpoint for the participant or JSON API.
- `grpcChannelSecurity?: GrpcChannelSecurity`  
  Optional. Defaults to `GrpcChannelSecurity.tls`.
- `authProvider?: IAuthProvider`  
  Optional. Supplies request headers.
- `commandSigner?: ICommandSigner`  
  Optional. Only valid with `TransportKind.grpc`.

Example:

```ts
const options = new CantonClientOptions({
    transportKind: TransportKind.grpc,
    endpoint: "http://localhost:6865",
    grpcChannelSecurity: GrpcChannelSecurity.insecure,
    authProvider: new BearerTokenAuthProvider("token"),
});
```

### `new CantonClient(options)`

Creates the shared high-level SDK client.

Properties:

- `versionService: VersionServiceClient`
- `partyManagementService: PartyManagementServiceClient`
- `userManagementService: UserManagementServiceClient`
- `packageManagementService: PackageManagementServiceClient`
- `commandService: CommandServiceClient`
- `commandSubmissionService: CommandSubmissionServiceClient`
- `commandCompletionService: CommandCompletionServiceClient`
- `stateService: StateServiceClient`
- `updateService: UpdateServiceClient`
- `eventQueryService: EventQueryServiceClient`
- `contractService: ContractServiceClient`

Behavior:

- throws `NotSupportedError` if you set `commandSigner` while using `TransportKind.json`

Example:

```ts
const client = new CantonClient(options);
```

## Protocol-Specific Clients

Use these when you want to bring your own low-level protocol integration instead of constructing from a shared endpoint.

### `new GrpcLedgerClient(operations, signer?)`

Creates a gRPC-only client with:

- `commands`
- `contracts`
- `events`

`signer` is optional and enables external command signing.

Use this when you already have a low-level gRPC operations object.

### `new JsonLedgerClient(httpClient)`

Creates a JSON-only client with:

- `commands`
- `contracts`
- `events`

Use this when you already have a low-level HTTP adapter with `getAsync(path)` and `postAsync(path, body)`.

## Auth And Signing

### `IAuthProvider.getHeadersAsync()`

Returns request headers for outgoing calls.

Return type:

- `Promise<Record<string, string>>`

Use this to inject bearer tokens or custom headers.

### `new BearerTokenAuthProvider(token)`

Simple auth provider for bearer token authorization.

### `BearerTokenAuthProvider.getHeadersAsync()`

Returns:

```ts
{ authorization: `Bearer ${token}` }
```

Example:

```ts
const authProvider = new BearerTokenAuthProvider("my-token");
```

### `ICommandSigner.signAsync(request)`

Signs a canonical command payload for gRPC submission.

Parameters:

- `request: SignCommandRequest`

Return type:

- `Promise<SignCommandResult>`

Notes:

- only used with gRPC
- JSON command submission rejects external signing

Example:

```ts
const signer = {
    async signAsync(request) {
        return new SignCommandResult({
            algorithm: "ed25519",
            signature: request.payload,
        });
    },
};
```

### `new SignCommandRequest(init)`

Fields:

- `payload: Uint8Array`
- `keyId?: string`

### `new SignCommandResult(init)`

Fields:

- `algorithm: string`
- `signature: Uint8Array`
- `keyId?: string`

## Service Clients

The operational services below use their new gRPC-shaped names now.

### `client.versionService.getLedgerApiVersionAsync()`

Reads the ledger API version.

Transport support:

- JSON
- gRPC

Return type:

- `Promise<GetLedgerApiVersionResponse>`

Example:

```ts
const version = await client.versionService.getLedgerApiVersionAsync();
console.log(version.version);
```

### `client.partyManagementService.allocatePartyAsync(request)`

Allocates a new party.

Transport support:

- JSON
- gRPC

Parameters:

- `request: AllocatePartyRequest`

Return type:

- `Promise<AllocatePartyResponse>`

Example:

```ts
const created = await client.partyManagementService.allocatePartyAsync(
    new AllocatePartyRequest({
        partyIdHint: "Alice",
        displayName: "Alice",
    }),
);
```

### `client.partyManagementService.listKnownPartiesAsync(request)`

Lists known parties.

Transport support:

- JSON
- gRPC

Parameters:

- `request: ListKnownPartiesRequest`

Return type:

- `Promise<ListKnownPartiesResponse>`

Example:

```ts
const parties = await client.partyManagementService.listKnownPartiesAsync(
    new ListKnownPartiesRequest({
        filterParty: "Alice",
        pageSize: 20,
    }),
);
```

### `client.userManagementService.grantUserRightsAsync(request)`

Grants rights to a user.

Transport support:

- JSON
- gRPC

Parameters:

- `request: GrantUserRightsRequest`

Return type:

- `Promise<GrantUserRightsResponse>`

Example:

```ts
const rights = await client.userManagementService.grantUserRightsAsync(
    new GrantUserRightsRequest({
        userId: "alice-user",
        rights: [
            {
                type: UserRightKind.canActAs,
                party: "Alice",
            },
        ],
    }),
);
```

### `client.packageManagementService.uploadDarFileAsync(request)`

Uploads a Daml package archive.

Transport support:

- JSON
- gRPC

Parameters:

- `request: UploadDarFileRequest`

Return type:

- `Promise<UploadDarFileResponse>`

Example:

```ts
const uploaded = await client.packageManagementService.uploadDarFileAsync(
    new UploadDarFileRequest({
        bytes: darBytes,
    }),
);
```

### `client.commandService.submitAndWaitAsync(request)`

Submits a command and waits for the result.

Transport support:

- JSON
- gRPC

Parameters:

- `request: SubmitCommandRequest`

Return type:

- `Promise<SubmitCommandResponse>`

Behavior:

- if a signer was configured on a gRPC client, signing happens before submission
- JSON still rejects external signing

Example:

```ts
const result = await client.commandService.submitAndWaitAsync(
    new SubmitCommandRequest({
        applicationId: "app-1",
        actAs: ["Alice"],
        command: new CreateCommand({
            templateId: "Main:Iou",
            payload: {
                issuer: "Alice",
                owner: "Bob",
            },
        }),
    }),
);
```

### `client.commandSubmissionService.submitAsync(request)`

Reserved for the gRPC `CommandSubmissionService.Submit` shape.

Current behavior:

- rejects with `NotSupportedError`

### `client.stateService.getActiveContractsPageAsync(request)`

Reads a page of active contracts.

Transport support:

- JSON
- gRPC

Parameters:

- `request: GetActiveContractsPageRequest`

Return type:

- `Promise<GetActiveContractsPageResponse<TContract>>`

Example:

```ts
const contracts = await client.stateService.getActiveContractsPageAsync(
    new GetActiveContractsPageRequest({
        party: "Alice",
        templateId: "Main:Iou",
    }),
);
```

### `client.stateService.getActiveContractsAsync(request, observer)`

Reads active contracts as a stream-like contract callback surface.

Transport support:

- JSON

Parameters:

- `request: GetActiveContractsRequest`
- `observer: ContractObserver`

Return type:

- `Promise<void>`

Behavior:

- on gRPC this currently rejects with `NotSupportedError`

Example:

```ts
await client.stateService.getActiveContractsAsync(
    new GetActiveContractsRequest({
        party: "Alice",
        templateId: "Main:Iou",
    }),
    {
        async nextAsync(contract) {
            console.log(contract);
        },
    },
);
```

### `client.updateService.getUpdatesAsync(request, observer)`

Reads ledger updates.

Transport support:

- gRPC

Parameters:

- `request: GetUpdatesRequest`
- `observer: Transaction-like observer with async nextAsync(event)`

Return type:

- `Promise<void>`

Behavior:

- on JSON this currently rejects with `NotSupportedError`

Example:

```ts
await client.updateService.getUpdatesAsync(
    new GetUpdatesRequest({
        party: "Alice",
        beginOffset: "0",
        templateId: "Main:Iou",
    }),
    {
        async nextAsync(event) {
            console.log(event);
        },
    },
);
```

### `client.commands.submitAsync(request)`

Submits a create command.

Transport support:

- JSON
- gRPC

Parameters:

- `request: SubmitCommandRequest`

Return type:

- `Promise<SubmitCommandResponse>`

Behavior:

- if the shared client was configured with a signer, gRPC signs before submit
- JSON rejects external signing

Example:

```ts
const submission = await client.commands.submitAsync(
    new SubmitCommandRequest({
        applicationId: "app-1",
        actAs: ["Alice"],
        readAs: ["Bob"],
        command: new CreateCommand({
            templateId: "Main:Iou",
            payload: {
                issuer: "Alice",
                owner: "Bob",
            },
        }),
    }),
);
```

## Advanced Transport Surface

The root package exports `ITransport`. The protocol-specific entrypoints also export `GrpcTransport` and `JsonTransport`.

Prefer `CantonClient`, `GrpcLedgerClient`, or `JsonLedgerClient` unless you are building custom integration layers or tests.

### `new GrpcTransport(operations)`

Creates a low-level gRPC transport implementation.

Use this when you want direct transport access instead of service clients.

Available methods:

- `getHealthAsync()`
- `createPartyAsync(request)`
- `listPartiesAsync(request)`
- `grantUserRightsAsync(request)`
- `uploadPackageAsync(request)`
- `queryContractsAsync(request)`
- `streamQueryAsync(request, observer)`  
  Always rejects with `NotSupportedError`.
- `streamTransactionsAsync(request, observer)`
- `submitCommandAsync(request, signed?)`

### `new JsonTransport(httpClient)`

Creates a low-level JSON transport implementation.

Use this when you want direct transport access instead of service clients.

Available methods:

- `getHealthAsync()`
- `createPartyAsync(request)`
- `listPartiesAsync(request)`
- `grantUserRightsAsync(request)`
- `uploadPackageAsync(request)`
- `queryContractsAsync(request)`
- `streamQueryAsync(request, observer)`
- `streamTransactionsAsync(request, observer)`  
  Always rejects with `NotSupportedError`.
- `submitCommandAsync(request, signed?)`  
  Rejects if `signed` is provided.

### `ITransport`

Methods:

- `getHealthAsync()`
- `createPartyAsync(request)`
- `listPartiesAsync(request)`
- `grantUserRightsAsync(request)`
- `uploadPackageAsync(request)`
- `queryContractsAsync(request)`
- `streamQueryAsync(request, observer)`
- `streamTransactionsAsync(request, observer)`
- `submitCommandAsync(request, signed?)`

`GrpcTransport` and `JsonTransport` implement this contract with the transport rules described earlier in this document.

### `TransportCapability`

Enum values:

- `TransportCapability.commandSigning`

This represents optional transport features. In v1, only gRPC supports external command signing.

## Request Types

### `CreatePartyRequest`

Fields:

- `partyIdHint?: string`
- `displayName?: string`

### `ListPartiesRequest`

Fields:

- `identityProviderId?: string`
- `filterParty?: string`
- `pageSize?: number`
- `pageToken?: string`

### `GrantUserRightsRequest`

Fields:

- `userId: string`
- `rights: readonly UserRightAssignment[]`

### `UserRightAssignment`

Fields:

- `type: UserRightKind`
- `party?: string`

### `QueryContractsRequest`

Fields:

- `party: string`
- `templateId: string`

### `StreamQueryRequest`

Fields:

- `party: string`
- `templateId?: string`

### `StreamTransactionsRequest`

Fields:

- `party: string`
- `beginOffset?: string`
- `endOffset?: string`
- `templateId?: string`

### `UploadPackageRequest`

Fields:

- `bytes: Uint8Array`
- `format: PackageFormat`

### `CreateCommand`

Fields:

- `templateId: string`
- `payload: Record<string, unknown>`

### `SubmitCommandRequest`

Fields:

- `applicationId: string`
- `actAs: readonly string[]`
- `readAs: readonly string[]`
- `command: CreateCommand`

Validation:

- throws `ValidationError` if `actAs` is empty

## Response Types

### `HealthStatusResponse`

Fields:

- `status: string`
- `version?: string`

### `CreatePartyResponse`

Fields:

- `party: string`

### `PartyDetails`

Fields:

- `party: string`
- `isLocal: boolean`
- `localMetadata?: Record<string, string>`
- `identityProviderId?: string`

### `ListPartiesResponse`

Fields:

- `partyDetails: PartyDetails[]`
- `nextPageToken?: string`

### `GrantUserRightsResponse`

Fields:

- `rights: readonly UserRightAssignment[]`

### `QueryContractsResponse<TContract = unknown>`

Fields:

- `contracts: readonly TContract[]`

### `UploadPackageResponse`

Fields:

- `packageId?: string`

### `SubmitCommandResponse`

Fields:

- `commandId?: string`
- `transactionId?: string`

## Observer Contracts

### `ContractObserver<TContract = unknown>`

Method:

- `nextAsync(contract: TContract): Promise<void>`

Use this with `stateService.getActiveContractsAsync(...)`.

## Enums

### `TransportKind`

- `TransportKind.grpc`
- `TransportKind.json`

### `GrpcChannelSecurity`

- `GrpcChannelSecurity.insecure`
- `GrpcChannelSecurity.tls`

### `SubmissionMode`

- `SubmissionMode.synchronous`
- `SubmissionMode.asynchronous`

### `EventStreamKind`

- `EventStreamKind.transactions`
- `EventStreamKind.activeContracts`

### `UserRightKind`

- `UserRightKind.canActAs`
- `UserRightKind.canReadAs`
- `UserRightKind.participantAdmin`

### `PackageFormat`

- `PackageFormat.dar`
- `PackageFormat.dalf`

## Errors

All SDK-specific errors inherit from `CantonError`.

### `CantonError`

Base SDK error type.

### `ValidationError`

Thrown when SDK input validation fails.

Current example:

- `SubmitCommandRequest` with an empty `actAs` array

### `AuthenticationError`

Represents authentication failures.

### `AuthorizationError`

Represents authorization failures.

### `TransportError`

Represents transport or protocol adapter failures.

### `SigningError`

Represents external signing failures.

### `TimeoutError`

Represents timeout failures.

### `ConflictError`

Represents conflict-style failures.

### `NotSupportedError`

Thrown when the requested feature is unsupported by the selected transport.

Examples:

- using `commandSigner` with `TransportKind.json`
- calling `stateService.getActiveContractsAsync(...)` on gRPC
- calling `updateService.getUpdatesAsync(...)` on JSON
