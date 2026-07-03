# Canton TypeScript SDK Documentation

## Overview

This SDK exposes a gRPC-shaped public API:

- `CantonClient` for shared construction from endpoint settings
- `GrpcLedgerClient` and `JsonLedgerClient` for transport-specific construction
- service clients grouped by gRPC Ledger API service boundaries
- explicit request and response classes
- `grpc`-only external signing through `ICommandSigner`

The documented public surface no longer uses the old domain-grouped names like `system`, `parties`, `packages`, `contracts`, `events`, or `commands`.

The package also exposes a separate DAML-LF front-end through the `canton-typescript-sdk/daml-lf` subpath.
It also exposes a separate interface generator through the `canton-typescript-sdk/daml-interface` subpath.

## Imports

Shared client:

```ts
import {
    AllocatePartyRequest,
    BearerTokenAuthProvider,
    CantonClient,
    CantonClientOptions,
    CreateCommand,
    GetPackageContentsRequest,
    GetPackageReferencesRequest,
    GetPackageRequest,
    GetPackageStatusRequest,
    GetActiveContractsPageRequest,
    GetActiveContractsRequest,
    HealthCheckRequest,
    HealthCheckResponse,
    HealthCheckStatus,
    GetLedgerApiVersionRequest,
    GetUpdatesRequest,
    GrantUserRightsRequest,
    ListPackagesRequest,
    ListKnownPartiesRequest,
    ListVettedPackagesRequest,
    ParticipantListPackagesRequest,
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

DAML-LF parser:

```ts
import {
    DarArchiveLoader,
    DamlLfCompilation,
    DamlLfInterpreterScaffold,
    DamlLfPackageLoader,
    DamlLfSemanticModel,
    DamlLfWorkspace,
} from "canton-typescript-sdk/daml-lf";
```

DAML interface generator:

```ts
import {
    DamlInterfaceCli,
    DamlInterfaceCliOptions,
    DamlInterfaceGenerator,
    DamlInterfaceWriter,
} from "canton-typescript-sdk/daml-interface";
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
- `packageService`
- `participantPackageService`
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

## DAML-LF Parser

The `canton-typescript-sdk/daml-lf` subpath exposes a compiler-style front-end over compiled DAML-LF artifacts.

Current implementation scope:

- `DAR` archive loading
- raw `DALF` / LF archive decoding
- LF `2.x` support
- immutable package/module/definition model
- workspace and compilation symbol resolution
- semantic queries over the compiled model
- interpreter scaffold contracts only

Important limits:

- artifact-centric, not source-parser-centric
- no source spans or trivia reconstruction yet
- no real DAML-LF evaluator yet

### `new DarArchiveLoader()`

Loads `.dar` archives and exposes their manifest plus extracted `.dalf` payload entries.

Primary method:

- `loadDarOrThrowAsync(bytes: Uint8Array): Promise<DarArchive>`

Useful result fields:

- `manifest.mainDalfPath`
- `mainPackageEntry.path`
- `mainPackageEntry.bytes`
- `packageEntries`

### `new DamlLfPackageLoader()`

Loads a single DAML-LF archive payload.

Primary methods:

- `loadPackageOrThrow(archiveBytes: Uint8Array): DamlLfPackage`
- `loadRawPackageOrThrow(archiveBytes: Uint8Array): DamlLfPackageLoadResult`

Notes:

- expects a `.dalf` archive payload, not a whole `.dar`
- only LF `2.x` is implemented currently

### `new DamlLfWorkspace(packages)`

Creates a package aggregation boundary for cross-package analysis.

Parameters:

- `packages: readonly DamlLfPackage[]`

### `DamlLfCompilation.createOrThrow(workspace)`

Builds the explicit symbol-resolution index over a workspace.

Useful methods:

- `getModuleSymbolOrThrow(reference)`
- `getTypeSymbolOrThrow(reference)`
- `createSemanticModel()`

### `compilation.createSemanticModel()`

Returns a `DamlLfSemanticModel` for interpreter-oriented queries.

Useful methods:

- `getRecordFieldsOrThrow(typeReference)`

### `new DamlLfInterpreterScaffold(compilation)`

Creates the current interpreter boundary object.

Useful methods:

- `getCompilation()`
- `getBuiltinDispatch()`

Notes:

- this is a scaffold only
- it does not execute DAML-LF yet

## DAML Interface Generator

The `canton-typescript-sdk/daml-interface` subpath generates an in-memory TypeScript project from compiled `DAR` or `DALF` artifacts.

Current generated project shape:

- one file per template
- shared support files
- a registry file
- an index file

Important limits:

- generation is strict and throws when a template or choice shape is unsupported
- current analyzer support is limited to the implemented `daml-lf` semantic surface
- input is compiled artifacts only, not `.daml` source files

### `new DamlInterfaceGeneratorOptions(init?)`

Creates generator configuration.

Fields:

- `generatedDirectory?: string`

Notes:

- currently defaults to `"generated"`

### `new DamlInterfaceGenerator(options?)`

Creates the interface generator entry point.

Primary methods:

- `analyzeOrThrow(compilation: DamlLfCompilation): DamlInterfaceAnalysisResult`
- `generateFromDalfOrThrowAsync(archiveBytes: Uint8Array): Promise<GeneratedDamlInterfaceProject>`
- `generateFromDarOrThrowAsync(archiveBytes: Uint8Array): Promise<GeneratedDamlInterfaceProject>`

Example:

```ts
const project = await new DamlInterfaceGenerator().generateFromDarOrThrowAsync(
    darBytes,
);
```

### `new DamlInterfaceWriter()`

Creates the file-system writer for generated projects.

Primary method:

- `writeProjectAsync(project: GeneratedDamlInterfaceProject, outputDirectory: string): Promise<void>`

Example:

```ts
const generator = new DamlInterfaceGenerator();
const writer = new DamlInterfaceWriter();
const project = await generator.generateFromDalfOrThrowAsync(dalfBytes);

await writer.writeProjectAsync(project, "./generated-sdk");
```

### `GeneratedDamlInterfaceProject`

Represents the current in-memory generated file set.

Useful fields:

- `templateFiles`
- `supportFiles`
- `registryFile?`
- `indexFile?`

### `GeneratedTemplateBindingFile`

Represents one generated template output.

Useful fields:

- `path`
- `contents`
- `binding`

### `DamlInterfaceCliOptions.parseOrThrow(args)`

Parses CLI arguments.

Required flags:

- `--input <path>`
- `--output <directory>`

Example:

```ts
const options = DamlInterfaceCliOptions.parseOrThrow([
    "--input",
    "./sample.dalf",
    "--output",
    "./artifacts",
]);
```

### `new DamlInterfaceCli()`

Creates the thin CLI orchestrator.

Primary method:

- `runAsync(args: readonly string[]): Promise<number>`

Supported input extensions:

- `.dalf`
- `.dar`

Example:

```ts
const exitCode = await new DamlInterfaceCli().runAsync([
    "--input",
    "./sample.dar",
    "--output",
    "./artifacts",
]);
```

### CLI Script

The package exposes:

```bash
npm run generate:daml-interface -- --input ./sample.dalf --output ./artifacts
```

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

### `packageService.listPackagesAsync(request)`

Lists ledger-visible package identifiers.

Transport support:

- `grpc`
- `json` currently throws `NotSupportedError`

Parameters:

- `request: ListPackagesRequest`

Return type:

- `Promise<ListPackagesResponse>`

Useful response fields:

- `packageIds: string[]`

### `packageService.getPackageAsync(request)`

Reads a ledger package archive payload.

Transport support:

- `grpc`
- `json` currently throws `NotSupportedError`

Parameters:

- `request: GetPackageRequest`

Request fields:

- `packageId: string`

Return type:

- `Promise<GetPackageResponse>`

Useful response fields:

- `hashFunction: HashFunction`
- `archivePayload: Uint8Array`
- `hash: string`

### `packageService.getPackageStatusAsync(request)`

Reads ledger package registration status.

Transport support:

- `grpc`
- `json` currently throws `NotSupportedError`

Parameters:

- `request: GetPackageStatusRequest`

Request fields:

- `packageId: string`

Return type:

- `Promise<GetPackageStatusResponse>`

Useful response fields:

- `packageStatus: PackageStatus`

### `packageService.listVettedPackagesAsync(request)`

Lists vetted ledger packages by participant and synchronizer.

Transport support:

- `grpc`
- `json` currently throws `NotSupportedError`

Parameters:

- `request: ListVettedPackagesRequest`

Request fields:

- `packageMetadataFilter?: PackageMetadataFilter`
- `topologyStateFilter?: TopologyStateFilter`
- `pageToken?: string`
- `pageSize?: number`

Return type:

- `Promise<ListVettedPackagesResponse>`

Useful response fields:

- `vettedPackages: VettedPackages[]`
- `nextPageToken?: string`

### `participantPackageService.uploadDarFileAsync(request)`

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

### `participantPackageService.listPackagesAsync(request)`

Lists participant-local package metadata.

Transport support:

- `grpc`
- `json` currently throws `NotSupportedError`

Parameters:

- `request: ParticipantListPackagesRequest`

Request fields:

- `limit?: number`
- `filterName?: string`

Return type:

- `Promise<ParticipantListPackagesResponse>`

Useful response fields:

- `packageDescriptions: ParticipantPackageDescription[]`

### `participantPackageService.getPackageContentsAsync(request)`

Reads participant-local package module metadata.

Transport support:

- `grpc`
- `json` currently throws `NotSupportedError`

Parameters:

- `request: GetPackageContentsRequest`

Request fields:

- `packageId: string`

Return type:

- `Promise<GetPackageContentsResponse>`

Useful response fields:

- `description?: ParticipantPackageDescription`
- `modules: ParticipantModuleDescription[]`
- `isUtilityPackage: boolean`
- `languageVersion: string`

### `participantPackageService.getPackageReferencesAsync(request)`

Reads DAR references for a participant-local package.

Transport support:

- `grpc`
- `json` currently throws `NotSupportedError`

Parameters:

- `request: GetPackageReferencesRequest`

Request fields:

- `packageId: string`

Return type:

- `Promise<GetPackageReferencesResponse>`

Useful response fields:

- `dars: ParticipantDarDescription[]`

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
| `packageService.listPackagesAsync` | No | Yes |
| `packageService.getPackageAsync` | No | Yes |
| `packageService.getPackageStatusAsync` | No | Yes |
| `packageService.listVettedPackagesAsync` | No | Yes |
| `participantPackageService.uploadDarFileAsync` | Yes | Yes |
| `participantPackageService.listPackagesAsync` | No | Yes |
| `participantPackageService.getPackageContentsAsync` | No | Yes |
| `participantPackageService.getPackageReferencesAsync` | No | Yes |
| `commandService.submitAndWaitAsync` | Yes | Yes |
| `commandSubmissionService.submitAsync` | No | No |
| `stateService.getActiveContractsPageAsync` | Yes | Yes |
| `stateService.getActiveContractsAsync` | Yes | No |
| `updateService.getUpdatesAsync` | No | Yes |
| external signing | No | Yes |
