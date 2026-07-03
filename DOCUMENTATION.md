# Canton TypeScript SDK Documentation

## Overview

This SDK exposes a gRPC-shaped public API:

- `CantonClient` for shared construction from endpoint settings
- `GrpcLedgerClient` and `JsonLedgerClient` for transport-specific construction
- service clients grouped by gRPC Ledger API service boundaries
- explicit request and response classes
- `grpc`-only external signing through `ICommandSigner`

The documented public surface no longer uses the old domain-grouped names like `system`, `parties`, `packages`, `contracts`, `events`, or `commands`.

## Imports

Shared client:

```ts
import {
    AllocatePartyRequest,
    BearerTokenAuthProvider,
    CantonClient,
    CantonClientOptions,
    CreateCommand,
    GetActiveContractsPageRequest,
    GetActiveContractsRequest,
    HealthCheckRequest,
    HealthCheckResponse,
    HealthCheckStatus,
    GetLedgerApiVersionRequest,
    GetUpdatesRequest,
    GrantUserRightsRequest,
    ListKnownPartiesRequest,
    SubmitCommandRequest,
    TransportKind,
    UploadDarFileRequest,
    UserRightKind,
} from "canton-typescript-sdk";
```

Protocol-specific clients:

```ts
import { GrpcLedgerClient } from "canton-typescript-sdk/grpc";
import { JsonLedgerClient } from "canton-typescript-sdk/json";
```

## Construction

### `new CantonClientOptions(init)`

Creates the shared client options object.

Fields:

- `transportKind: TransportKind`
- `endpoint: string`
- `grpcChannelSecurity?: GrpcChannelSecurity`
- `authProvider?: IAuthProvider`
- `commandSigner?: ICommandSigner`

Notes:

- `grpcChannelSecurity` defaults to `GrpcChannelSecurity.tls`
- `commandSigner` is valid on `grpc` only

### `new CantonClient(options)`

Creates a high-level client from `CantonClientOptions`.

Exposed properties:

- `versionService`
- `healthService`
- `partyManagementService`
- `userManagementService`
- `packageManagementService`
- `commandService`
- `commandSubmissionService`
- `commandCompletionService`
- `stateService`
- `updateService`
- `eventQueryService`
- `contractService`

### `new GrpcLedgerClient(operations, signer?)`

Creates a gRPC-only client over low-level gRPC operations.

Notes:

- exposes the same service properties as `CantonClient`
- `signer` enables external command signing

### `new JsonLedgerClient(httpClient)`

Creates a JSON-only client over a low-level HTTP adapter.

Notes:

- exposes the same service properties as `CantonClient`
- external command signing is not supported on JSON

## Auth And Signing

### `IAuthProvider.getHeadersAsync()`

Returns `Promise<Record<string, string>>` for outgoing requests.

### `new BearerTokenAuthProvider(token)`

Creates a simple bearer-token auth provider.

### `BearerTokenAuthProvider.getHeadersAsync()`

Returns an `authorization` header with the configured bearer token.

### `ICommandSigner.signAsync(request)`

Signs a canonical gRPC command payload.

Parameters:

- `request: SignCommandRequest`

Return type:

- `Promise<SignCommandResult>`

Notes:

- used only by `grpc`
- JSON command submission rejects external signing

### `new SignCommandRequest(init)`

Fields:

- `payload: Uint8Array`
- `keyId?: string`

### `new SignCommandResult(init)`

Fields:

- `algorithm: string`
- `signature: Uint8Array`
- `keyId?: string`

## Service Functions

The same service methods are available from `CantonClient`, `GrpcLedgerClient`, and `JsonLedgerClient`.

### `versionService.getLedgerApiVersionAsync(request?)`

Reads the ledger API version.

Transport support:

- `json`
- `grpc`

Parameters:

- `request?: GetLedgerApiVersionRequest`

Return type:

- `Promise<GetLedgerApiVersionResponse>`

Useful response fields:

- `version: string`
- `features?: unknown`

Example:

```ts
const response = await client.versionService.getLedgerApiVersionAsync(
    new GetLedgerApiVersionRequest(),
);
console.log(response.version);
```

### `healthService.checkAsync(request)`

Checks `grpc.health.v1.Health.Check`.

Transport support:

- `grpc`
- `json` throws `NotSupportedError`

Parameters:

- `request: HealthCheckRequest`

Request fields:

- `service?: string`

Return type:

- `Promise<HealthCheckResponse>`

Useful response fields:

- `status: HealthCheckStatus`

`HealthCheckStatus` values:

- `HealthCheckStatus.unknown`
- `HealthCheckStatus.serving`
- `HealthCheckStatus.notServing`
- `HealthCheckStatus.serviceUnknown`

Notes:

- this is a dedicated gRPC health endpoint, not a version call
- JSON has no equivalent `grpc.health.v1` endpoint and rejects it intentionally

Example:

```ts
const response = await client.healthService.checkAsync(
    new HealthCheckRequest({
        service: "grpc.health.v1.Health",
    }),
);

if (response.status === HealthCheckStatus.serving) {
    console.log("service is serving");
}
```

### `partyManagementService.allocatePartyAsync(request)`

Allocates a party.

Transport support:

- `json`
- `grpc`

Parameters:

- `request: AllocatePartyRequest`

Request fields:

- `partyIdHint?: string`
- `displayName?: string`

Return type:

- `Promise<AllocatePartyResponse>`

Useful response fields:

- `party: string`

### `partyManagementService.listKnownPartiesAsync(request)`

Lists known parties.

Transport support:

- `json`
- `grpc`

Parameters:

- `request: ListKnownPartiesRequest`

Request fields:

- `identityProviderId?: string`
- `filterParty?: string`
- `pageSize?: number`
- `pageToken?: string`

Return type:

- `Promise<ListKnownPartiesResponse>`

Useful response fields:

- `partyDetails: PartyDetails[]`
- `nextPageToken?: string`

`PartyDetails` fields:

- `party: string`
- `isLocal: boolean`
- `localMetadata?: Record<string, string>`
- `identityProviderId?: string`

### `userManagementService.grantUserRightsAsync(request)`

Grants user rights.

Transport support:

- `json`
- `grpc`

Parameters:

- `request: GrantUserRightsRequest`

Request fields:

- `userId: string`
- `rights: readonly UserRightAssignment[]`

`UserRightAssignment` fields:

- `type: UserRightKind`
- `party?: string`

Return type:

- `Promise<GrantUserRightsResponse>`

Useful response fields:

- `rights: readonly UserRightAssignment[]`

### `packageManagementService.uploadDarFileAsync(request)`

Uploads a DAR file.

Transport support:

- `json`
- `grpc`

Parameters:

- `request: UploadDarFileRequest`

Request fields:

- `bytes: Uint8Array`

Return type:

- `Promise<UploadDarFileResponse>`

Useful response fields:

- `packageId?: string`

### `commandService.submitAndWaitAsync(request)`

Submits a command and waits for the result.

Transport support:

- `json`
- `grpc`

Parameters:

- `request: SubmitCommandRequest`

Request fields:

- `applicationId: string`
- `actAs: readonly string[]`
- `readAs: readonly string[]`
- `command: CreateCommand`

`CreateCommand` fields:

- `templateId: string`
- `payload: Record<string, unknown>`

Return type:

- `Promise<SubmitCommandResponse>`

Useful response fields:

- `commandId?: string`
- `transactionId?: string`

Notes:

- `actAs` must contain at least one party
- external signing is applied here on `grpc` when `commandSigner` is configured

Example:

```ts
const response = await client.commandService.submitAndWaitAsync(
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

### `commandSubmissionService.submitAsync(request)`

Reserved for `CommandSubmissionService.Submit`.

Transport support:

- currently unsupported on `json`
- currently unsupported on `grpc`

Current behavior:

- throws `NotSupportedError`

### `stateService.getActiveContractsPageAsync(request)`

Reads a page of active contracts.

Transport support:

- `json`
- `grpc`

Parameters:

- `request: GetActiveContractsPageRequest`

Request fields:

- `party: string`
- `templateId?: string`

Return type:

- `Promise<GetActiveContractsPageResponse<TContract>>`

Useful response fields:

- `contracts: readonly TContract[]`

### `stateService.getActiveContractsAsync(request, observer)`

Reads active contracts through an observer callback surface.

Transport support:

- `json`
- `grpc` currently throws `NotSupportedError`

Parameters:

- `request: GetActiveContractsRequest`
- `observer: ContractObserver<TContract>`

Request fields:

- `party: string`
- `templateId?: string`

Observer contract:

```ts
const observer: ContractObserver = {
    async nextAsync(contract) {
        console.log(contract);
    },
};
```

### `updateService.getUpdatesAsync(request, observer)`

Reads ledger updates through an observer callback surface.

Transport support:

- `grpc`
- `json` currently throws `NotSupportedError`

Parameters:

- `request: GetUpdatesRequest`
- `observer: TransactionObserver<TEvent>`

Request fields:

- `party: string`
- `beginOffset?: string`
- `endOffset?: string`
- `templateId?: string`

Observer contract:

```ts
const observer: TransactionObserver = {
    async nextAsync(event) {
        console.log(event);
    },
};
```

## Placeholder Services

These services are intentionally present on the public client shape so the SDK can keep matching the gRPC service map as implementation expands:

- `commandCompletionService`
- `eventQueryService`
- `contractService`

They do not expose public methods yet.

## Transport Support Matrix

| Function | JSON | gRPC |
| --- | --- | --- |
| `versionService.getLedgerApiVersionAsync` | Yes | Yes |
| `healthService.checkAsync` | No | Yes |
| `partyManagementService.allocatePartyAsync` | Yes | Yes |
| `partyManagementService.listKnownPartiesAsync` | Yes | Yes |
| `userManagementService.grantUserRightsAsync` | Yes | Yes |
| `packageManagementService.uploadDarFileAsync` | Yes | Yes |
| `commandService.submitAndWaitAsync` | Yes | Yes |
| `commandSubmissionService.submitAsync` | No | No |
| `stateService.getActiveContractsPageAsync` | Yes | Yes |
| `stateService.getActiveContractsAsync` | Yes | No |
| `updateService.getUpdatesAsync` | No | Yes |
| external signing | No | Yes |
