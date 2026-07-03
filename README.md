# Canton TypeScript SDK

TypeScript SDK for Canton with:

- a shared `CantonClient`
- `grpc` and `json` transports
- `grpc`-only external signing
- gRPC Ledger API service boundaries as the public SDK shape

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
} from "canton-typescript-sdk";

const client = new CantonClient(
    new CantonClientOptions({
        transportKind: TransportKind.json,
        endpoint: "https://participant.example.com",
        authProvider: new BearerTokenAuthProvider("token"),
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

## Service Map

- `versionService.getLedgerApiVersionAsync(...)`: `json`, `grpc`
- `healthService.checkAsync(...)`: `grpc` only
- `partyManagementService.allocatePartyAsync(...)`: `json`, `grpc`
- `partyManagementService.listKnownPartiesAsync(...)`: `json`, `grpc`
- `userManagementService.grantUserRightsAsync(...)`: `json`, `grpc`
- `packageManagementService.uploadDarFileAsync(...)`: `json`, `grpc`
- `commandService.submitAndWaitAsync(...)`: `json`, `grpc`
- `commandSubmissionService.submitAsync(...)`: reserved, currently unsupported
- `stateService.getActiveContractsPageAsync(...)`: `json`, `grpc`
- `stateService.getActiveContractsAsync(...)`: `json` only
- `updateService.getUpdatesAsync(...)`: `grpc` only
- `commandCompletionService`: placeholder, no methods yet
- `eventQueryService`: placeholder, no methods yet
- `contractService`: placeholder, no methods yet

## Protocol-Specific Clients

Subpath exports are available when you want to construct directly over a transport adapter:

- `canton-typescript-sdk/grpc`
- `canton-typescript-sdk/json`
- `canton-typescript-sdk/daml-lf`
- `canton-typescript-sdk/daml-interface`

`GrpcLedgerClient` and `JsonLedgerClient` expose the same service properties as `CantonClient`.

JSON does not provide a `grpc.health.v1.Health.Check` equivalent. The shared SDK still exposes `healthService`, but JSON rejects calls with `NotSupportedError`.

## DAML-LF Parser

The package also exposes a separate DAML-LF front-end at `canton-typescript-sdk/daml-lf`.

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
} from "canton-typescript-sdk/daml-lf";

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

The `canton-typescript-sdk/daml-interface` subpath exposes a generator that turns compiled `DAR` or `DALF` artifacts into an in-memory TypeScript binding project.

Current generated output shape:

- one file per template
- shared support files
- a registry file
- an index file

Example:

```ts
import { DamlInterfaceGenerator } from "canton-typescript-sdk/daml-interface";

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
} from "canton-typescript-sdk/daml-interface";

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
} from "canton-typescript-sdk";

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

See [DOCUMENTATION.md](/home/helena/env/daml/typescript-sdk/DOCUMENTATION.md:1) for the full function-by-function reference.
