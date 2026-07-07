# Canton TypeScript SDK

TypeScript SDK for Canton with:

- a shared `CantonClient`
- `grpc` and `json` transports
- `grpc`-only external signing
- gRPC Ledger API service boundaries as the public SDK shape

## Install

```bash
npm install @distrohelena/canton-typescript-sdk
```

## Live Integration Tests

The repository also supports a live SDK validation suite against an already-running CN quickstart localnet.

The live suite runs single-worker with an extended timeout because it mutates and reads a shared localnet.

Prerequisites:

- CN quickstart is already running on your machine
- the suite is expected to fail fast if the configured node is unreachable

Default local endpoints:

- gRPC ledger: `http://localhost:3901`
- gRPC ledger admin: `http://localhost:3901`
- gRPC participant admin: `http://localhost:3902`
- JSON ledger and ledger admin: `http://localhost:3975`

Override environment variables:

- `SDK_TEST_LEDGER_ENDPOINT`
- `SDK_TEST_LEDGER_ADMIN_ENDPOINT`
- `SDK_TEST_PARTICIPANT_ADMIN_ENDPOINT`

The live harness also supports bearer-token overrides:

- `SDK_TEST_LEDGER_BEARER_TOKEN`
- `SDK_TEST_LEDGER_ADMIN_BEARER_TOKEN`
- `SDK_TEST_PARTICIPANT_ADMIN_BEARER_TOKEN`

For CN quickstart shared-secret mode, the harness generates a default bearer token automatically using:

- subject `ledger-api-user`
- audience `https://canton.network.global`
- shared secret `unsafe`

Run:

```bash
npm run test:live
```

## Shared Client

```ts
import {
    AllocatePartyRequest,
    BearerTokenAuthProvider,
    CantonClient,
    CantonClientOptions,
    GetActiveContractsPageRequest,
    HealthCheckRequest,
    GetLedgerApiVersionRequest,
    TransportKind,
} from "@distrohelena/canton-typescript-sdk";

const client = new CantonClient(
    new CantonClientOptions({
        transportKind: TransportKind.json,
        ledgerEndpoint: "https://ledger.example.com",
        ledgerAdminEndpoint: "https://ledger-admin.example.com",
        participantAdminEndpoint: "https://participant-admin.example.com",
        ledgerAuthProvider: new BearerTokenAuthProvider("ledger-token"),
        ledgerAdminAuthProvider: new BearerTokenAuthProvider(
            "ledger-admin-token",
        ),
        participantAdminAuthProvider: new BearerTokenAuthProvider(
            "participant-admin-token",
        ),
    }),
);

const version = await client.versionService.getLedgerApiVersionAsync(
    new GetLedgerApiVersionRequest(),
);
const health = await client.healthService.checkAsync(
    new HealthCheckRequest({
        service: "grpc.health.v1.Health",
    }),
);
const party = await client.partyManagementService.allocatePartyAsync(
    new AllocatePartyRequest({
        partyIdHint: "Alice",
        displayName: "Alice",
    }),
);
const contracts = await client.stateService.getActiveContractsPageAsync(
    new GetActiveContractsPageRequest({
        party: "Alice",
        templateId: "Main:Iou",
    }),
);
```

`CantonClient` now splits its public surface across the real API boundaries:

- ledger services use `ledgerEndpoint`
- ledger admin services use `ledgerAdminEndpoint`
- participant admin services use `participantAdminEndpoint`

For gRPC, channel security resolves per surface:

- ledger services use `ledgerGrpcChannelSecurity ?? grpcChannelSecurity ?? GrpcChannelSecurity.tls`
- ledger admin services use `ledgerAdminGrpcChannelSecurity ?? grpcChannelSecurity ?? GrpcChannelSecurity.tls`
- participant admin services use `participantAdminGrpcChannelSecurity ?? grpcChannelSecurity ?? GrpcChannelSecurity.tls`

## Service Map

- Ledger endpoint:
- `versionService.getLedgerApiVersionAsync(...)`: `json`, `grpc`
- `healthService.checkAsync(...)`: `grpc` only
- `packageService.listPackagesAsync(...)`: `grpc` only
- `packageService.getPackageAsync(...)`: `grpc` only
- `packageService.getPackageStatusAsync(...)`: `grpc` only
- `packageService.listVettedPackagesAsync(...)`: `grpc` only
- `commandService.submitAndWaitAsync(...)`: `json`, `grpc`
- `commandSubmissionService.submitAsync(...)`: reserved, currently unsupported
- `stateService.getActiveContractsPageAsync(...)`: `json`, `grpc`
- `stateService.getActiveContractsAsync(...)`: `json` only
- `updateService.getUpdatesAsync(...)`: `grpc` only
- `commandCompletionService`: placeholder, no methods yet
- `eventQueryService`: placeholder, no methods yet
- `contractService`: placeholder, no methods yet

- Ledger Admin endpoint:
- `partyManagementService.allocatePartyAsync(...)`: `json`, `grpc`
- `partyManagementService.listKnownPartiesAsync(...)`: `json`, `grpc`
- `partyManagementService.getParticipantIdAsync(...)`: `grpc` only
- `partyManagementService.getPartiesAsync(...)`: `grpc` only
- `partyManagementService.generateExternalPartyTopologyAsync(...)`: `grpc` only
- `partyManagementService.allocateExternalPartyAsync(...)`: `grpc` only
- `userManagementService.grantUserRightsAsync(...)`: `json`, `grpc`
- `packageManagementService.uploadDarFileAsync(...)`: `json`, `grpc`

- Participant Admin endpoint:
- `participantPackageService.listPackagesAsync(...)`: `grpc` only
- `participantPackageService.getPackageContentsAsync(...)`: `grpc` only
- `participantPackageService.getPackageReferencesAsync(...)`: `grpc` only
- `participantStatusService.getParticipantStatusAsync(...)`: `grpc` only
- `topologyManagerReadService.*`: `grpc` only
- `topologyAggregationService.*`: `grpc` only
- `topologyManagerWriteService.authorizeAsync(...)`: `grpc` only
- `topologyManagerWriteService.addTransactionsAsync(...)`: `grpc` only
- `topologyManagerWriteService.importTopologySnapshotAsync(...)`: `grpc` only
- `topologyManagerWriteService.importTopologySnapshotV2Async(...)`: `grpc` only
- `topologyManagerWriteService.signTransactionsAsync(...)`: `grpc` only
- `topologyManagerWriteService.generateTransactionsAsync(...)`: `grpc` only
- `topologyManagerWriteService.createTemporaryTopologyStoreAsync(...)`: `grpc` only
- `topologyManagerWriteService.dropTemporaryTopologyStoreAsync(...)`: `grpc` only
- `topologyManagerWriteService.assembleSignedTransactions(...)`: SDK-local on any client

Raw topology-write mapping support currently starts with `PartyToParticipant`. The detached-signature assembler is transport-independent, but the actual participant-admin write RPCs are `grpc` only and JSON rejects them with `NotSupportedError`.

## Protocol-Specific Clients

Subpath exports are available when you want to construct directly over a transport adapter:

- `@distrohelena/canton-typescript-sdk/grpc`
- `@distrohelena/canton-typescript-sdk/json`
- `@distrohelena/canton-typescript-sdk/daml-lf`
- `@distrohelena/canton-typescript-sdk/daml-interface`

`GrpcLedgerClient` and `JsonLedgerClient` expose the same service properties as `CantonClient`.

JSON does not provide a `grpc.health.v1.Health.Check` equivalent. The shared SDK still exposes `healthService`, but JSON rejects calls with `NotSupportedError`.
JSON also does not provide a participant-admin status equivalent, so `participantStatusService` is currently `grpc` only.
JSON also does not expose the ledger-admin external-party RPCs, so `partyManagementService.generateExternalPartyTopologyAsync(...)` and `partyManagementService.allocateExternalPartyAsync(...)` are `grpc` only.

## DAML-LF Parser

The package also exposes a separate DAML-LF front-end at `@distrohelena/canton-typescript-sdk/daml-lf`.

Current scope:

- artifact-centric `DAR` and `DALF` loading
- LF `2.x` decoding
- immutable package/module/definition model
- workspace, compilation, and symbol resolution
- semantic queries over the compiled model
- interpreter scaffold contracts only, no real LF execution yet

Example:

```ts
import {
    DarArchiveLoader,
    DamlLfCompilation,
    DamlLfPackageLoader,
    DamlLfWorkspace,
} from "@distrohelena/canton-typescript-sdk/daml-lf";

const archive = await new DarArchiveLoader().loadDarOrThrowAsync(darBytes);
const packageLoader = new DamlLfPackageLoader();
const packageModel = packageLoader.loadPackageOrThrow(
    archive.mainPackageEntry.bytes,
);
const workspace = new DamlLfWorkspace([packageModel]);
const compilation = DamlLfCompilation.createOrThrow(workspace);
const semanticModel = compilation.createSemanticModel();
```

## DAML Interface Generator

The `@distrohelena/canton-typescript-sdk/daml-interface` subpath exposes a generator that turns compiled `DAR` or `DALF` artifacts into an in-memory TypeScript binding project.

Current generated output shape:

- one file per template
- shared support files
- a registry file
- an index file

Example:

```ts
import { DamlInterfaceGenerator } from "@distrohelena/canton-typescript-sdk/daml-interface";

const project = await new DamlInterfaceGenerator().generateFromDalfOrThrowAsync(
    dalfBytes,
);

console.log(project.templateFiles[0].path);
console.log(project.registryFile?.path);
console.log(project.indexFile?.path);
```

You can also write the generated project to disk:

```ts
import {
    DamlInterfaceGenerator,
    DamlInterfaceWriter,
} from "@distrohelena/canton-typescript-sdk/daml-interface";

const generator = new DamlInterfaceGenerator();
const writer = new DamlInterfaceWriter();
const project = await generator.generateFromDarOrThrowAsync(darBytes);

await writer.writeProjectAsync(project, "./artifacts");
```

CLI:

```bash
npm run generate:daml-interface -- --input ./sample.dalf --output ./artifacts
```

Current limits:

- generation is strict and throws when a template shape is not supported yet
- milestone 1 supports the current `daml-lf` text-based analyzer surface only
- the generator works from compiled artifacts, not `.daml` source files

## External Signing

External signing is supported on `grpc` only through `ICommandSigner`.

```ts
import {
    ICommandSigner,
    SignCommandRequest,
    SignCommandResult,
} from "@distrohelena/canton-typescript-sdk";

class ExampleSigner implements ICommandSigner {
    public async signAsync(
        request: SignCommandRequest,
    ): Promise<SignCommandResult> {
        return new SignCommandResult({
            algorithm: "ed25519",
            signature: request.payload,
        });
    }
}
```

See [DOCUMENTATION.md](./DOCUMENTATION.md) for the full function-by-function reference.
