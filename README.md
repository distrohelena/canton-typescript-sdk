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

`GrpcLedgerClient` and `JsonLedgerClient` expose the same service properties as `CantonClient`.

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
