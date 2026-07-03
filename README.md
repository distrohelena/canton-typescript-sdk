# Canton TypeScript SDK

TypeScript SDK for Canton with:

- a shared high-level `CantonClient`
- `grpc` and `json` transport adapters
- `grpc`-only external signing in v1
- C#-influenced object boundaries with TypeScript `camelCase`
- gRPC Ledger API service names as the public SDK foundation

## Shared Client

```ts
import {
    AllocatePartyRequest,
    BearerTokenAuthProvider,
    CantonClient,
    CantonClientOptions,
    TransportKind,
} from "canton-typescript-sdk";

const client = new CantonClient(
    new CantonClientOptions({
        transportKind: TransportKind.json,
        endpoint: "https://participant.example.com",
        authProvider: new BearerTokenAuthProvider("token"),
    }),
);

await client.versionService.getLedgerApiVersionAsync();
await client.partyManagementService.allocatePartyAsync(
    new AllocatePartyRequest({
        partyIdHint: "Alice",
        displayName: "Alice",
    }),
);
```

## Operational APIs By Transport

- `client.versionService.getLedgerApiVersionAsync()`: supported on `json` and `grpc`
- `client.partyManagementService.allocatePartyAsync(...)`: supported on `json` and `grpc`
- `client.partyManagementService.listKnownPartiesAsync(...)`: supported on `json` and `grpc`
- `client.userManagementService.grantUserRightsAsync(...)`: supported on `json` and `grpc`
- `client.packageManagementService.uploadDarFileAsync(...)`: supported on `json` and `grpc`

## Alignment Status

The root client is being realigned to gRPC Ledger API service boundaries. The operational services above are live under their new names. Command and ledger-read APIs are being migrated next and should be treated as in-flight until their gRPC-shaped service names land.

## Protocol-Specific Modules

Use subpath exports when you want transport-specific construction:

- `canton-typescript-sdk/grpc`
- `canton-typescript-sdk/json`
