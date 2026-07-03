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
await client.contracts.queryAsync({ templateId: "Main:Iou" });
```

## gRPC External Signing

```ts
import {
    CantonClient,
    CantonClientOptions,
    TransportKind,
} from "canton-typescript-sdk";

const client = new CantonClient(
    new CantonClientOptions({
        transportKind: TransportKind.grpc,
        endpoint: "https://participant.example.com",
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

await client.commands.submitAsync({
    applicationId: "app-1",
    actAs: ["Alice"],
});
```

## JSON Signing

`json` command signing is intentionally unsupported in v1. Configuring `commandSigner` with `TransportKind.json` throws `NotSupportedError`.

## Protocol-Specific Modules

Use subpath exports when you want transport-specific construction:

- `canton-typescript-sdk/grpc`
- `canton-typescript-sdk/json`
