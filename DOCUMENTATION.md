# Canton TypeScript SDK Documentation

## Overview

This SDK exposes a gRPC-shaped public API:

- `CantonClient` for shared construction from split Ledger, Ledger Admin, and Participant Admin endpoint settings
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
    GetParticipantStatusRequest,
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
- `ledgerEndpoint?: string`
- `ledgerAdminEndpoint?: string`
- `participantAdminEndpoint?: string`
- `grpcChannelSecurity?: GrpcChannelSecurity`
- `ledgerGrpcChannelSecurity?: GrpcChannelSecurity`
- `ledgerAdminGrpcChannelSecurity?: GrpcChannelSecurity`
- `participantAdminGrpcChannelSecurity?: GrpcChannelSecurity`
- `defaultRequestTimeoutMs?: number`
- `grpcConnectTimeoutMs?: number`
- `ledgerAuthProvider?: IAuthProvider`
- `ledgerAdminAuthProvider?: IAuthProvider`
- `participantAdminAuthProvider?: IAuthProvider`
- `commandSigner?: ICommandSigner`

Notes:

- `grpcChannelSecurity` defaults to `GrpcChannelSecurity.tls`
- ledger gRPC security resolves with:
  `ledgerGrpcChannelSecurity ?? grpcChannelSecurity ?? GrpcChannelSecurity.tls`
- ledger admin gRPC security resolves with:
  `ledgerAdminGrpcChannelSecurity ?? grpcChannelSecurity ?? GrpcChannelSecurity.tls`
- participant admin gRPC security resolves with:
  `participantAdminGrpcChannelSecurity ?? grpcChannelSecurity ?? GrpcChannelSecurity.tls`
- `commandSigner` is valid on `grpc` only
- client construction succeeds even if one endpoint is missing
- a service only fails when its own surface endpoint is missing

### `new CantonClient(options)`

Creates a high-level client from `CantonClientOptions`.

Exposed properties:

- `versionService`
- `healthService`
- `partyManagementService`
- `userManagementService`
- `packageService`
- `packageManagementService`
- `participantPackageService`
- `participantStatusService`
- `topologyManagerReadService`
- `topologyAggregationService`
- `commandService`
- `commandSubmissionService`
- `commandCompletionService`
- `stateService`
- `updateService`
- `eventQueryService`
- `contractService`

## Endpoint Surfaces

Ledger endpoint services use `ledgerEndpoint`:

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

Ledger Admin endpoint services use `ledgerAdminEndpoint`:

- `partyManagementService`
- `userManagementService`
- `packageManagementService`

Participant Admin endpoint services use `participantAdminEndpoint`:

- `participantPackageService`
- `participantStatusService`
- `topologyManagerReadService`
- `topologyAggregationService`

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

### `participantStatusService.getParticipantStatusAsync(request)`

Reads participant admin status.

Transport support:

- `grpc`
- `json` currently throws `NotSupportedError`

Parameters:

- `request: GetParticipantStatusRequest`

Request fields:

- none

Return type:

- `Promise<GetParticipantStatusResponse>`

Useful response fields:

- `status?: ParticipantNodeStatus`
- `notInitialized?: AdminNotInitializedStatus`

`ParticipantNodeStatus` fields:

- `uid: string`
- `uptime?: { seconds: string; nanos: number }`
- `ports: Record<string, number>`
- `active: boolean`
- `topologyQueues?: AdminTopologyQueueStatus`
- `components: AdminComponentStatus[]`
- `version: string`
- `connectedSynchronizers: ConnectedSynchronizerStatus[]`
- `supportedProtocolVersions: number[]`

`ConnectedSynchronizerStatus` fields:

- `physicalSynchronizerId: string`
- `health: ConnectedSynchronizerHealth`

`ConnectedSynchronizerHealth` values:

- `ConnectedSynchronizerHealth.unspecified`
- `ConnectedSynchronizerHealth.healthy`
- `ConnectedSynchronizerHealth.unhealthy`

`AdminNotInitializedStatus` fields:

- `active: boolean`
- `waitingForExternalInput: AdminNotInitializedExternalInputKind`
- `version: string`

`AdminNotInitializedExternalInputKind` values:

- `AdminNotInitializedExternalInputKind.unspecified`
- `AdminNotInitializedExternalInputKind.id`
- `AdminNotInitializedExternalInputKind.nodeTopology`
- `AdminNotInitializedExternalInputKind.initialization`

`AdminTopologyQueueStatus` fields:

- `manager: number`
- `dispatcher: number`
- `clients: number`

`AdminComponentStatus` fields:

- `name: string`
- `kind: AdminComponentHealthKind`
- `description?: string`

`AdminComponentHealthKind` values:

- `AdminComponentHealthKind.unknown`
- `AdminComponentHealthKind.ok`
- `AdminComponentHealthKind.degraded`
- `AdminComponentHealthKind.failed`
- `AdminComponentHealthKind.fatal`

Notes:

- `status` and `notInitialized` are mutually exclusive
- JSON does not expose an equivalent participant-admin status endpoint today

Example:

```ts
const response = await client.participantStatusService.getParticipantStatusAsync(
    new GetParticipantStatusRequest(),
);

if (response.status) {
    console.log(response.status.uid);
    console.log(response.status.connectedSynchronizers.length);
}

if (response.notInitialized) {
    console.log(response.notInitialized.waitingForExternalInput);
}
```

### `topologyManagerReadService.*`

These functions mirror the participant-admin `TopologyManagerReadService` RPC boundary.

Transport support:

- `grpc`
- `json` currently throws `NotSupportedError` for every method in this service

Common request model:

- most methods accept `baseQuery?: TopologyBaseQuery`
- `TopologyBaseQuery` can filter by `storeId`, `includeProposals`, `operation`, time selection, signed key fingerprint, and protocol version

Functions:

- `listNamespaceDelegationAsync(request: ListNamespaceDelegationRequest): Promise<ListNamespaceDelegationResponse>`
  Request fields: `filterNamespace?: string`, `filterTargetKeyFingerprint?: string`
  Response payload: `results: TopologyMappingResult<NamespaceDelegation>[]`
- `listDecentralizedNamespaceDefinitionAsync(request: ListDecentralizedNamespaceDefinitionRequest): Promise<ListDecentralizedNamespaceDefinitionResponse>`
  Request fields: `filterNamespace?: string`
  Response payload: `results: TopologyMappingResult<DecentralizedNamespaceDefinition>[]`
- `listOwnerToKeyMappingAsync(request: ListOwnerToKeyMappingRequest): Promise<ListOwnerToKeyMappingResponse>`
  Request fields: `filterKeyOwnerType?: string`, `filterKeyOwnerUid?: string`
  Response payload: `results: TopologyMappingResult<OwnerToKeyMapping>[]`
- `listPartyToKeyMappingAsync(request: ListPartyToKeyMappingRequest): Promise<ListPartyToKeyMappingResponse>`
  Request fields: `filterParty?: string`
  Response payload: `results: TopologyMappingResult<PartyToKeyMapping>[]`
  Note: this is a raw participant-admin topology read. Some Canton versions can fail with protobuf deserialization errors on this response shape. For party-topology summary views, prefer `topologyAggregationService.listPartiesAsync()` and `topologyAggregationService.listKeyOwnersAsync()`.
- `listSynchronizerTrustCertificateAsync(request: ListSynchronizerTrustCertificateRequest): Promise<ListSynchronizerTrustCertificateResponse>`
  Request fields: `filterUid?: string`
  Response payload: `results: TopologyMappingResult<SynchronizerTrustCertificate>[]`
- `listParticipantSynchronizerPermissionAsync(request: ListParticipantSynchronizerPermissionRequest): Promise<ListParticipantSynchronizerPermissionResponse>`
  Request fields: `filterUid?: string`
  Response payload: `results: TopologyMappingResult<ParticipantSynchronizerPermission>[]`
- `listPartyHostingLimitsAsync(request: ListPartyHostingLimitsRequest): Promise<ListPartyHostingLimitsResponse>`
  Request fields: `filterUid?: string`
  Response payload: `results: TopologyMappingResult<PartyHostingLimits>[]`
- `listVettedPackagesAsync(request: TopologyListVettedPackagesRequest): Promise<TopologyListVettedPackagesResponse>`
  Request fields: `filterParticipant?: string`
  Response payload: `results: TopologyMappingResult<TopologyVettedPackages>[]`
- `listPartyToParticipantAsync(request: ListPartyToParticipantRequest): Promise<ListPartyToParticipantResponse>`
  Request fields: `filterParty?: string`, `filterParticipant?: string`
  Response payload: `results: TopologyMappingResult<PartyToParticipant>[]`
  Note: this is a raw participant-admin topology read. Some Canton versions can fail with protobuf deserialization errors on this response shape. For party-topology summary views, prefer `topologyAggregationService.listPartiesAsync()` and `topologyAggregationService.listKeyOwnersAsync()`.
- `listSynchronizerParametersStateAsync(request: ListSynchronizerParametersStateRequest): Promise<ListSynchronizerParametersStateResponse>`
  Request fields: `filterSynchronizerId?: string`
  Response payload: `results: TopologyMappingResult<DynamicSynchronizerParameters>[]`
- `listSequencingParametersStateAsync(request: ListSequencingParametersStateRequest): Promise<ListSequencingParametersStateResponse>`
  Request fields: `filterSynchronizerId?: string`
  Response payload: `results: TopologyMappingResult<DynamicSequencingParameters>[]`
- `listMediatorSynchronizerStateAsync(request: ListMediatorSynchronizerStateRequest): Promise<ListMediatorSynchronizerStateResponse>`
  Request fields: `filterSynchronizerId?: string`
  Response payload: `results: TopologyMappingResult<MediatorSynchronizerState>[]`
- `listSequencerSynchronizerStateAsync(request: ListSequencerSynchronizerStateRequest): Promise<ListSequencerSynchronizerStateResponse>`
  Request fields: `filterSynchronizerId?: string`
  Response payload: `results: TopologyMappingResult<SequencerSynchronizerState>[]`
- `listLsuAnnouncementAsync(request: ListLsuAnnouncementRequest): Promise<ListLsuAnnouncementResponse>`
  Request fields: `filterSynchronizerId?: string`
  Response payload: `results: TopologyMappingResult<LsuAnnouncement>[]`
- `listLsuSequencerConnectionSuccessorAsync(request: ListLsuSequencerConnectionSuccessorRequest): Promise<ListLsuSequencerConnectionSuccessorResponse>`
  Request fields: `filterSequencerId?: string`, `filterSuccessorPhysicalSynchronizerId?: string`
  Response payload: `results: TopologyMappingResult<LsuSequencerConnectionSuccessor>[]`
- `listAvailableStoresAsync(request: ListAvailableStoresRequest): Promise<ListAvailableStoresResponse>`
  Request fields: none
  Response payload: `storeIds: TopologyStoreId[]`
- `listAllAsync(request: ListAllRequest): Promise<ListAllResponse>`
  Request fields: `excludeMappings: TopologyMappingCode[]`, `filterNamespace?: string`
  Response payload: `result?: TopologyTransactions`
- `listAllV2Async(request: ListAllV2Request): Promise<ListAllV2Response>`
  Request fields: `includeMappings: TopologyMappingCode[]`, `filterNamespace?: string`
  Response payload: `result?: TopologyTransactions`

Notes:

- all functions belong to the participant-admin endpoint surface
- `listAllV2Async` is the preferred raw topology transaction read
- raw `transaction` bytes are not decoded by the SDK yet

### `topologyAggregationService.*`

These functions mirror the participant-admin `TopologyAggregationService` RPC boundary.

Transport support:

- `grpc`
- `json` currently throws `NotSupportedError` for every method in this service

Functions:

- `listPartiesAsync(request: TopologyListPartiesRequest): Promise<TopologyListPartiesResponse>`
  Request fields: `asOf?: Date`, `limit?: number`, `synchronizerIds?: string[]`, `filterParty?: string`, `filterParticipant?: string`
  Response payload: `results: TopologyPartyResult[]`
- `listKeyOwnersAsync(request: ListKeyOwnersRequest): Promise<ListKeyOwnersResponse>`
  Request fields: `asOf?: Date`, `limit?: number`, `synchronizerIds?: string[]`, `filterKeyOwnerType?: string`, `filterKeyOwnerUid?: string`
  Response payload: `results: TopologyKeyOwnerResult[]`

### `topologyManagerWriteService.*`

These functions mirror the participant-admin `TopologyManagerWriteService` RPC boundary.

Transport support:

- `grpc`
- `json` currently throws `NotSupportedError` for every transport-backed method in this service
- `assembleSignedTransactions(...)` is SDK-local and available on any client

Current raw mapping coverage:

- proposal mapping support currently starts with `PartyToParticipant`
- detached ED25519 onboarding is modeled through `PartyToParticipant.partySigningKeys`
- unsupported raw mapping types throw `ValidationError` before any gRPC request is sent

Functions:

- `authorizeAsync(request: AuthorizeTopologyTransactionsRequest): Promise<AuthorizeTopologyTransactionsResponse>`
  Request fields: `proposal?: AuthorizeTopologyTransactionsProposal`, `transactionHash?: string`, `mustFullyAuthorize: boolean`, `forceChanges: TopologyForceFlag[]`, `signedBy: string[]`, `store?: TopologyStoreId`, `waitToBecomeEffective?: TopologyDuration`
  Response payload: `transaction?: SignedTopologyTransaction`
- `addTransactionsAsync(request: AddTopologyTransactionsRequest): Promise<AddTopologyTransactionsResponse>`
  Request fields: `transactions: SignedTopologyTransaction[]`, `forceChanges: TopologyForceFlag[]`, `store?: TopologyStoreId`, `waitToBecomeEffective?: TopologyDuration`
  Response payload: empty
- `importTopologySnapshotAsync(request: ImportTopologySnapshotRequest): Promise<ImportTopologySnapshotResponse>`
  Request fields: `topologySnapshot: Uint8Array`, `store?: TopologyStoreId`, `waitToBecomeEffective?: TopologyDuration`
  Response payload: empty
- `importTopologySnapshotV2Async(request: ImportTopologySnapshotV2Request): Promise<ImportTopologySnapshotV2Response>`
  Request fields: `topologySnapshot: Uint8Array`, `store?: TopologyStoreId`, `waitToBecomeEffective?: TopologyDuration`
  Response payload: empty
- `signTransactionsAsync(request: SignTopologyTransactionsRequest): Promise<SignTopologyTransactionsResponse>`
  Request fields: `transactions: SignedTopologyTransaction[]`, `signedBy: string[]`, `store?: TopologyStoreId`, `forceFlags: TopologyForceFlag[]`
  Response payload: `transactions: SignedTopologyTransaction[]`
- `generateTransactionsAsync(request: GenerateTopologyTransactionsRequest): Promise<GenerateTopologyTransactionsResponse>`
  Request fields: `proposals: GenerateTopologyTransactionsProposal[]`
  Proposal fields: `operation: TopologyMappingOperation`, `serial: number`, `mapping?: TopologyMapping`, `store?: TopologyStoreId`
  Response payload: `generatedTransactions: GeneratedTopologyTransaction[]`
- `createTemporaryTopologyStoreAsync(request: CreateTemporaryTopologyStoreRequest): Promise<CreateTemporaryTopologyStoreResponse>`
  Request fields: `name: string`, `protocolVersion: number`
  Response payload: `storeId?: TopologyStoreTemporary`
- `dropTemporaryTopologyStoreAsync(request: DropTemporaryTopologyStoreRequest): Promise<DropTemporaryTopologyStoreResponse>`
  Request fields: `storeId?: TopologyStoreTemporary`
  Response payload: empty
- `assembleSignedTransactions(request: AssembleSignedTopologyTransactionsRequest): SignedTopologyTransaction[]`
  Request fields: `preparedTransactions: PreparedTopologyTransaction[]`, `signatures: ExternalTopologySignature[]`
  Response payload: `SignedTopologyTransaction[]`

Detached-signature assembly notes:

- signatures are matched by `transactionHash`
- each signature requires `transactionHash`, `signature`, `signedByFingerprint`, and `signatureFormat`
- duplicate signers for the same transaction are rejected
- `TopologySignatureFormat.ed25519` defaults the raw signature format to `concat` and the algorithm spec to `ed25519`

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

### `participantInspectionService.lookupSentAcsCommitmentsAsync(request)`

Reads ACS commitments sent to counter-participants.

Transport support:

- `grpc`
- `json` throws `NotSupportedError`

### `participantInspectionService.lookupReceivedAcsCommitmentsAsync(request)`

Reads ACS commitments received from counter-participants.

Transport support:

- `grpc`
- `json` throws `NotSupportedError`

### `participantInspectionService.openCommitmentAsync(request)`

Opens a commitment and returns the raw protobuf chunk payload.

Transport support:

- `grpc`
- `json` throws `NotSupportedError`

Useful request fields:

- `commitment: Uint8Array`
- `physicalSynchronizerId: string`
- `computedForCounterParticipantUid: string`
- `periodEndTick?: Date`

Useful response fields:

- `chunk: Uint8Array`

### `participantInspectionService.inspectCommitmentContractsAsync(request)`

Reads commitment contract data and returns the raw protobuf chunk payload.

Transport support:

- `grpc`
- `json` throws `NotSupportedError`

Useful request fields:

- `cids: Uint8Array[]`
- `expectedSynchronizerId: string`
- `timestamp?: Date`
- `downloadPayload: boolean`

Useful response fields:

- `chunk: Uint8Array`

### `synchronizerConnectivityService.listRegisteredSynchronizersAsync(request)`

Lists registered synchronizers, their connection config, and current status.

Transport support:

- `grpc`
- `json` throws `NotSupportedError`

Useful request fields:

- `allStatuses: boolean`

## Service Surface Notes

The public SDK now mirrors the implemented gRPC service boundaries directly.

Transport behavior:

- unsupported JSON and gRPC combinations throw `NotSupportedError`
- all public request and response shapes are SDK-owned classes, not generated protobuf classes

## Transport Support Matrix

| Function | Endpoint Surface | JSON | gRPC |
| --- | --- | --- | --- |
| `versionService.getLedgerApiVersionAsync` | Ledger | Yes | Yes |
| `healthService.checkAsync` | Ledger | No | Yes |
| `partyManagementService.allocatePartyAsync` | Ledger Admin | Yes | Yes |
| `partyManagementService.listKnownPartiesAsync` | Ledger Admin | Yes | Yes |
| `userManagementService.grantUserRightsAsync` | Ledger Admin | Yes | Yes |
| `packageService.listPackagesAsync` | Ledger | No | Yes |
| `packageService.getPackageAsync` | Ledger | No | Yes |
| `packageService.getPackageStatusAsync` | Ledger | No | Yes |
| `packageService.listVettedPackagesAsync` | Ledger | No | Yes |
| `packageManagementService.uploadDarFileAsync` | Ledger Admin | Yes | Yes |
| `participantPackageService.listPackagesAsync` | Participant Admin | No | Yes |
| `participantPackageService.getPackageContentsAsync` | Participant Admin | No | Yes |
| `participantPackageService.getPackageReferencesAsync` | Participant Admin | No | Yes |
| `participantStatusService.getParticipantStatusAsync` | Participant Admin | No | Yes |
| `participantInspectionService.lookupOffsetByTimeAsync` | Participant Admin | No | Yes |
| `participantInspectionService.countInFlightAsync` | Participant Admin | No | Yes |
| `participantInspectionService.getConfigForSlowCounterParticipantsAsync` | Participant Admin | No | Yes |
| `participantInspectionService.getIntervalsBehindForCounterParticipantsAsync` | Participant Admin | No | Yes |
| `participantInspectionService.lookupSentAcsCommitmentsAsync` | Participant Admin | No | Yes |
| `participantInspectionService.lookupReceivedAcsCommitmentsAsync` | Participant Admin | No | Yes |
| `participantInspectionService.openCommitmentAsync` | Participant Admin | No | Yes |
| `participantInspectionService.inspectCommitmentContractsAsync` | Participant Admin | No | Yes |
| `participantPartyManagementService.getHighestOffsetByTimestampAsync` | Participant Admin | No | Yes |
| `pruningService.getSafePruningOffsetAsync` | Participant Admin | No | Yes |
| `pruningService.getPruningScheduleAsync` | Participant Admin | No | Yes |
| `pruningService.getParticipantPruningScheduleAsync` | Participant Admin | No | Yes |
| `pruningService.getNoWaitCommitmentsFromAsync` | Participant Admin | No | Yes |
| `trafficControlService.trafficControlStateAsync` | Participant Admin | No | Yes |
| `synchronizerConnectivityService.listConnectedSynchronizersAsync` | Participant Admin | No | Yes |
| `synchronizerConnectivityService.getSynchronizerIdAsync` | Participant Admin | No | Yes |
| `synchronizerConnectivityService.listRegisteredSynchronizersAsync` | Participant Admin | No | Yes |
| `topologyManagerReadService.listNamespaceDelegationAsync` | Participant Admin | No | Yes |
| `topologyManagerReadService.listDecentralizedNamespaceDefinitionAsync` | Participant Admin | No | Yes |
| `topologyManagerReadService.listOwnerToKeyMappingAsync` | Participant Admin | No | Yes |
| `topologyManagerReadService.listPartyToKeyMappingAsync` | Participant Admin | No | Yes |
| `topologyManagerReadService.listSynchronizerTrustCertificateAsync` | Participant Admin | No | Yes |
| `topologyManagerReadService.listParticipantSynchronizerPermissionAsync` | Participant Admin | No | Yes |
| `topologyManagerReadService.listPartyHostingLimitsAsync` | Participant Admin | No | Yes |
| `topologyManagerReadService.listVettedPackagesAsync` | Participant Admin | No | Yes |
| `topologyManagerReadService.listPartyToParticipantAsync` | Participant Admin | No | Yes |
| `topologyManagerReadService.listSynchronizerParametersStateAsync` | Participant Admin | No | Yes |
| `topologyManagerReadService.listSequencingParametersStateAsync` | Participant Admin | No | Yes |
| `topologyManagerReadService.listMediatorSynchronizerStateAsync` | Participant Admin | No | Yes |
| `topologyManagerReadService.listSequencerSynchronizerStateAsync` | Participant Admin | No | Yes |
| `topologyManagerReadService.listLsuAnnouncementAsync` | Participant Admin | No | Yes |
| `topologyManagerReadService.listLsuSequencerConnectionSuccessorAsync` | Participant Admin | No | Yes |
| `topologyManagerReadService.listAvailableStoresAsync` | Participant Admin | No | Yes |
| `topologyManagerReadService.listAllAsync` | Participant Admin | No | Yes |
| `topologyManagerReadService.listAllV2Async` | Participant Admin | No | Yes |
| `topologyAggregationService.listPartiesAsync` | Participant Admin | No | Yes |
| `topologyAggregationService.listKeyOwnersAsync` | Participant Admin | No | Yes |
| `topologyManagerWriteService.authorizeAsync` | Participant Admin | No | Yes |
| `topologyManagerWriteService.addTransactionsAsync` | Participant Admin | No | Yes |
| `topologyManagerWriteService.importTopologySnapshotAsync` | Participant Admin | No | Yes |
| `topologyManagerWriteService.importTopologySnapshotV2Async` | Participant Admin | No | Yes |
| `topologyManagerWriteService.signTransactionsAsync` | Participant Admin | No | Yes |
| `topologyManagerWriteService.generateTransactionsAsync` | Participant Admin | No | Yes |
| `topologyManagerWriteService.createTemporaryTopologyStoreAsync` | Participant Admin | No | Yes |
| `topologyManagerWriteService.dropTemporaryTopologyStoreAsync` | Participant Admin | No | Yes |
| `topologyManagerWriteService.assembleSignedTransactions` | SDK Local | Yes | Yes |
| `commandService.submitAndWaitAsync` | Ledger | Yes | Yes |
| `commandSubmissionService.submitAsync` | Ledger | No | No |
| `stateService.getActiveContractsPageAsync` | Ledger | Yes | Yes |
| `stateService.getActiveContractsAsync` | Ledger | Yes | No |
| `updateService.getUpdatesAsync` | Ledger | No | Yes |
| external signing | Ledger | No | Yes |
