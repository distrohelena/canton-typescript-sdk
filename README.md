# Canton TypeScript SDK

TypeScript SDK for Canton with:

- a shared high-level `CantonClient`
- `grpc` and `json` transport adapters
- `grpc`-only external signing in v1
- C#-influenced object boundaries with TypeScript `camelCase`

## Shared Client

```ts
import {
    BearerTokenAuthProvider,
    CantonClient,
    CantonClientOptions,
    QueryContractsRequest,
    TransportKind,
} from "canton-typescript-sdk";

const client = new CantonClient(
    new CantonClientOptions({
        transportKind: TransportKind.json,
        endpoint: "https://participant.example.com",
        authProvider: new BearerTokenAuthProvider("token"),
    }),
);

await client.system.getHealthAsync();
await client.contracts.queryAsync(
    new QueryContractsRequest({
        party: "Alice",
        templateId: "Main:Iou",
    }),
);
```

## gRPC External Signing

```ts
import {
    BearerTokenAuthProvider,
    CantonClient,
    CantonClientOptions,
    CreateCommand,
    GrpcChannelSecurity,
    SubmitCommandRequest,
    TransportKind,
} from "canton-typescript-sdk";

const client = new CantonClient(
    new CantonClientOptions({
        transportKind: TransportKind.grpc,
        endpoint: "http://localhost:6865",
        grpcChannelSecurity: GrpcChannelSecurity.insecure,
        authProvider: new BearerTokenAuthProvider("token"),
        commandSigner: {
            async signAsync(request) {
                return {
                    algorithm: "ed25519",
                    signature: request.payload,
                };
            },
        },
    }),
);

await client.commands.submitAsync(
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

## JSON Signing

`json` command signing is intentionally unsupported in v1. Configuring `commandSigner` with `TransportKind.json` throws `NotSupportedError`.

## Protocol-Specific Modules

Use subpath exports when you want transport-specific construction:

- `canton-typescript-sdk/grpc`
- `canton-typescript-sdk/json`
