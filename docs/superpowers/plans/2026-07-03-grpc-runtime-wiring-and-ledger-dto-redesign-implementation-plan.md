# gRPC Runtime Wiring And Ledger DTO Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the stubbed default gRPC runtime path with live protobuf-ts client wiring and redesign the shallow public ledger DTOs so query, stream, and submit can be implemented honestly over gRPC.

**Architecture:** Keep `GrpcOperations` as the internal façade and make it real by constructing a protobuf-ts `GrpcTransport`, generated service clients, and per-call metadata from `IAuthProvider`. Redesign only the public ledger request DTOs that are too shallow today, keeping them SDK-owned and C#-style while limiting v1 command submission to a single create-command payload so both JSON and gRPC can share the same contract.

**Tech Stack:** TypeScript, Vitest, `@grpc/grpc-js`, `@protobuf-ts/grpc-transport`, existing generated Ledger API v2 clients

---

## File Structure

Implementation should touch this structure:

- `src/core/types/grpc-channel-security.ts`
- `src/client/canton-client-options.ts`
- `src/index.ts`
- `src/core/types/requests/query-contracts-request.ts`
- `src/core/types/requests/stream-transactions-request.ts`
- `src/core/types/requests/submit-command-request.ts`
- `src/core/types/commands/create-command.ts`
- `src/services/commands/command-payload-builder.ts`
- `src/transports/grpc/grpc-transport-factory.ts`
- `src/transports/grpc/grpc-channel-factory.ts`
- `src/transports/grpc/grpc-call-options-factory.ts`
- `src/transports/grpc/grpc-transport.ts`
- `src/transports/grpc/mappers/contracts-mapper.ts`
- `src/transports/grpc/mappers/events-mapper.ts`
- `src/transports/grpc/mappers/commands-mapper.ts`
- `src/transports/grpc/mappers/packages-mapper.ts`
- `src/transports/grpc/mappers/users-mapper.ts`
- `src/transports/grpc/mappers/system-mapper.ts`
- `src/transports/json/json-transport.ts`
- `tests/unit/core/canton-client-options.test.ts`
- `tests/unit/grpc/grpc-channel-factory.test.ts`
- `tests/unit/grpc/grpc-system-client.test.ts`
- `tests/unit/grpc/grpc-operational-mappers.test.ts`
- `tests/unit/grpc/grpc-command-runtime.test.ts`
- `tests/unit/services/contracts-client.test.ts`
- `tests/unit/services/events-client.test.ts`
- `tests/unit/services/grpc-command-signing.test.ts`
- `tests/unit/services/json-command-signing-not-supported.test.ts`
- `tests/unit/services/command-submission-pipeline.test.ts`
- `tests/contract/shared/ledger-read-services.contract.test.ts`
- `tests/integration/grpc/grpc-transport.integration.test.ts`
- `tests/integration/json/json-transport.integration.test.ts`
- `README.md`

Keep `GrpcOperations` as the internal boundary. Do not replace `GrpcTransport` with generated clients directly.

For this implementation plan, use a single-create-command public model for `SubmitCommandRequest`. Do not attempt a full general command AST in this feature.

### Task 1: Add Explicit gRPC Channel Security Configuration

**Files:**
- Create: `src/core/types/grpc-channel-security.ts`
- Modify: `src/client/canton-client-options.ts`
- Modify: `src/index.ts`
- Test: `tests/unit/core/canton-client-options.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from "vitest";
import {
    CantonClientOptions,
    GrpcChannelSecurity,
    TransportKind,
} from "../../../src";

describe("CantonClientOptions", () => {
    it("defaults grpc channel security to tls", () => {
        const options = new CantonClientOptions({
            transportKind: TransportKind.grpc,
            endpoint: "https://participant.example.com",
        });

        expect(options.grpcChannelSecurity).toBe(GrpcChannelSecurity.tls);
    });

    it("stores an explicit grpc channel security override", () => {
        const options = new CantonClientOptions({
            transportKind: TransportKind.grpc,
            endpoint: "http://localhost:6865",
            grpcChannelSecurity: GrpcChannelSecurity.insecure,
        });

        expect(options.grpcChannelSecurity).toBe(
            GrpcChannelSecurity.insecure,
        );
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/unit/core/canton-client-options.test.ts`
Expected: FAIL with missing `GrpcChannelSecurity` export or missing `grpcChannelSecurity` property

- [ ] **Step 3: Write minimal implementation**

```ts
export enum GrpcChannelSecurity {
    insecure = "insecure",
    tls = "tls",
}
```

```ts
export class CantonClientOptions {
    public readonly transportKind: TransportKind;
    public readonly endpoint: string;
    public readonly grpcChannelSecurity: GrpcChannelSecurity;

    public constructor(init: {
        transportKind: TransportKind;
        endpoint: string;
        grpcChannelSecurity?: GrpcChannelSecurity;
        authProvider?: IAuthProvider;
        commandSigner?: ICommandSigner;
    }) {
        this.transportKind = init.transportKind;
        this.endpoint = init.endpoint;
        this.grpcChannelSecurity =
            init.grpcChannelSecurity ?? GrpcChannelSecurity.tls;
        // existing assignments...
    }
}
```

Export `GrpcChannelSecurity` from `src/index.ts`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/unit/core/canton-client-options.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/core/types/grpc-channel-security.ts src/client/canton-client-options.ts src/index.ts tests/unit/core/canton-client-options.test.ts
git commit -m "feat: add grpc channel security options"
```

### Task 2: Add Testable gRPC Call-Options And Metadata Helpers

**Files:**
- Create: `src/transports/grpc/grpc-call-options-factory.ts`
- Test: `tests/unit/grpc/grpc-channel-factory.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from "vitest";
import { Metadata } from "@grpc/grpc-js";
import { BearerTokenAuthProvider, GrpcChannelSecurity } from "../../../src";
import {
    buildGrpcCallOptionsAsync,
    createGrpcChannelCredentials,
} from "../../../src/transports/grpc/grpc-call-options-factory.js";

describe("gRPC call-options factory", () => {
    it("creates insecure channel credentials", () => {
        const credentials = createGrpcChannelCredentials(
            GrpcChannelSecurity.insecure,
        );

        expect(credentials).toBeDefined();
    });

    it("forwards all auth headers into metadata", async () => {
        const options = await buildGrpcCallOptionsAsync({
            getHeadersAsync: async () => ({
                authorization: "Bearer token-123",
                "x-canton-test": "yes",
            }),
        });

        const metadata = options.meta as Record<string, string>;

        expect(metadata.authorization).toBe("Bearer token-123");
        expect(metadata["x-canton-test"]).toBe("yes");
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/unit/grpc/grpc-channel-factory.test.ts`
Expected: FAIL with missing helper exports

- [ ] **Step 3: Write minimal implementation**

```ts
import { credentials } from "@grpc/grpc-js";
import { IAuthProvider } from "../../core/auth/auth-provider.interface.js";
import { GrpcChannelSecurity } from "../../core/types/grpc-channel-security.js";

export function createGrpcChannelCredentials(
    security: GrpcChannelSecurity,
) {
    return security === GrpcChannelSecurity.insecure
        ? credentials.createInsecure()
        : credentials.createSsl();
}

export async function buildGrpcCallOptionsAsync(
    authProvider?: IAuthProvider,
): Promise<{ meta: Record<string, string> }> {
    return {
        meta: authProvider ? await authProvider.getHeadersAsync() : {},
    };
}
```

Keep the helper small. Do not wire service clients yet in this task.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/unit/grpc/grpc-channel-factory.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/transports/grpc/grpc-call-options-factory.ts tests/unit/grpc/grpc-channel-factory.test.ts
git commit -m "test: add grpc metadata and credential helpers"
```

### Task 3: Replace Stubbed Runtime Wiring For Feasible gRPC Methods

**Files:**
- Modify: `src/transports/grpc/grpc-transport-factory.ts`
- Modify: `src/transports/grpc/grpc-channel-factory.ts`
- Modify: `src/transports/grpc/mappers/system-mapper.ts`
- Modify: `src/transports/grpc/mappers/packages-mapper.ts`
- Modify: `src/transports/grpc/mappers/users-mapper.ts`
- Modify: `tests/unit/grpc/grpc-system-client.test.ts`
- Modify: `tests/unit/grpc/grpc-operational-mappers.test.ts`
- Modify: `tests/integration/grpc/grpc-transport.integration.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
import { describe, expect, it, vi } from "vitest";
import { GrpcChannelSecurity, TransportKind, CantonClientOptions } from "../../../src";
import { createGrpcTransport } from "../../../src/transports/grpc/grpc-transport-factory.js";

describe("default grpc transport wiring", () => {
    it("builds grpc operations from full client options", () => {
        const transport = createGrpcTransport(
            new CantonClientOptions({
                transportKind: TransportKind.grpc,
                endpoint: "http://localhost:6865",
                grpcChannelSecurity: GrpcChannelSecurity.insecure,
            }),
        );

        expect(transport.features.supportsCommandSigning).toBe(true);
    });
});
```

Extend `tests/unit/grpc/grpc-system-client.test.ts` to verify that health mapping accepts a real Ledger API version payload:

```ts
const transport = new GrpcTransport({
    getHealthAsync: async () => ({
        version: "3.4.0",
        features: {},
    }),
    // other required operations...
});

await expect(client.getHealthAsync()).resolves.toMatchObject({
    status: "healthy",
    version: "3.4.0",
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- tests/unit/grpc/grpc-channel-factory.test.ts tests/unit/grpc/grpc-system-client.test.ts tests/unit/grpc/grpc-operational-mappers.test.ts`
Expected: FAIL because the default gRPC factory still uses endpoint-only stub construction or current mappers do not match real response shapes

- [ ] **Step 3: Write minimal implementation**

In `src/transports/grpc/grpc-transport-factory.ts`:

```ts
export function createGrpcTransport(options: CantonClientOptions) {
    return new GrpcTransport(createGrpcOperations(options));
}
```

In `src/transports/grpc/grpc-channel-factory.ts`:

1. Change `createGrpcOperations()` to take `CantonClientOptions`.
2. Build protobuf-ts `GrpcTransport` with:

```ts
const rpcTransport = new ProtobufGrpcTransport({
    host: options.endpoint,
    channelCredentials: createGrpcChannelCredentials(
        options.grpcChannelSecurity,
    ),
});
```

3. Construct generated service clients:
- `VersionServiceClient`
- `PartyManagementServiceClient`
- `UserManagementServiceClient`
- `PackageManagementServiceClient`

4. For each feasible method, call the generated client and return `call.response`.
5. Pass `await buildGrpcCallOptionsAsync(options.authProvider)` as the protobuf-ts call options.

Adjust mappers where needed:
- `mapGrpcHealth(...)` should accept `GetLedgerApiVersionResponse` and convert it to `HealthStatusResponse({ status: "healthy", version })`
- `mapGrpcUploadPackage(...)` should tolerate an empty `UploadDarFileResponse`
- `mapGrpcGrantUserRightsRequest(...)` should build the real protobuf `Right` oneof shape instead of placeholder `{ type, party }`

If a current user-right mapping is too broad for all right kinds, implement only the kinds already represented by `UserRightKind` and fail fast on unsupported kinds.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- tests/unit/grpc/grpc-channel-factory.test.ts tests/unit/grpc/grpc-system-client.test.ts tests/unit/grpc/grpc-operational-mappers.test.ts tests/integration/grpc/grpc-transport.integration.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/transports/grpc/grpc-transport-factory.ts src/transports/grpc/grpc-channel-factory.ts src/transports/grpc/grpc-call-options-factory.ts src/transports/grpc/mappers/system-mapper.ts src/transports/grpc/mappers/packages-mapper.ts src/transports/grpc/mappers/users-mapper.ts tests/unit/grpc/grpc-channel-factory.test.ts tests/unit/grpc/grpc-system-client.test.ts tests/unit/grpc/grpc-operational-mappers.test.ts tests/integration/grpc/grpc-transport.integration.test.ts
git commit -m "feat: wire grpc admin runtime operations"
```

### Task 4: Redesign Shared Ledger Read DTOs For Real Query And Stream Requests

**Files:**
- Modify: `src/core/types/requests/query-contracts-request.ts`
- Modify: `src/core/types/requests/stream-transactions-request.ts`
- Modify: `src/transports/grpc/mappers/contracts-mapper.ts`
- Modify: `src/transports/grpc/mappers/events-mapper.ts`
- Modify: `src/transports/json/json-transport.ts`
- Modify: `tests/unit/services/contracts-client.test.ts`
- Modify: `tests/unit/services/events-client.test.ts`
- Modify: `tests/contract/shared/ledger-read-services.contract.test.ts`
- Modify: `tests/integration/json/json-transport.integration.test.ts`

- [ ] **Step 1: Write the failing tests**

Update the request construction tests to use the redesigned shapes:

```ts
const query = new QueryContractsRequest({
    party: "Alice",
    templateId: "Main:Iou",
});

expect(query.party).toBe("Alice");
expect(query.templateId).toBe("Main:Iou");
```

```ts
const stream = new StreamTransactionsRequest({
    party: "Alice",
    beginOffset: "0",
    endOffset: "10",
    templateId: "Main:Iou",
});

expect(stream.party).toBe("Alice");
expect(stream.beginOffset).toBe("0");
expect(stream.endOffset).toBe("10");
```

Update `tests/contract/shared/ledger-read-services.contract.test.ts` so both JSON and gRPC calls use:

```ts
new QueryContractsRequest({
    party: "Alice",
    templateId: "Main:Iou",
})
```

and

```ts
new StreamTransactionsRequest({
    party: "Alice",
    templateId: "Main:Iou",
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- tests/unit/services/contracts-client.test.ts tests/unit/services/events-client.test.ts tests/contract/shared/ledger-read-services.contract.test.ts tests/integration/json/json-transport.integration.test.ts`
Expected: FAIL because constructors and transports still expect the shallow DTOs

- [ ] **Step 3: Write minimal implementation**

Use these minimal shared shapes:

```ts
export class QueryContractsRequest {
    public readonly party: string;
    public readonly templateId: string;

    public constructor(init: { party: string; templateId: string }) {
        this.party = init.party;
        this.templateId = init.templateId;
    }
}
```

```ts
export class StreamTransactionsRequest {
    public readonly party: string;
    public readonly beginOffset?: string;
    public readonly endOffset?: string;
    public readonly templateId?: string;

    public constructor(init: {
        party: string;
        beginOffset?: string;
        endOffset?: string;
        templateId?: string;
    }) {
        this.party = init.party;
        this.beginOffset = init.beginOffset;
        this.endOffset = init.endOffset;
        this.templateId = init.templateId;
    }
}
```

Update JSON transport to forward the new fields where possible:
- `/v1/query` body should still include `templateIds`
- `/v1/stream/query` body should include the party/template filter instead of an empty object

Update gRPC mapper helpers so they can build real:
- `GetActiveContractsPageRequest`
- `GetUpdatesRequest`

with default event/update formats derived from the DTO instead of exposing raw protobuf filter types publicly.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- tests/unit/services/contracts-client.test.ts tests/unit/services/events-client.test.ts tests/contract/shared/ledger-read-services.contract.test.ts tests/integration/json/json-transport.integration.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/core/types/requests/query-contracts-request.ts src/core/types/requests/stream-transactions-request.ts src/transports/grpc/mappers/contracts-mapper.ts src/transports/grpc/mappers/events-mapper.ts src/transports/json/json-transport.ts tests/unit/services/contracts-client.test.ts tests/unit/services/events-client.test.ts tests/contract/shared/ledger-read-services.contract.test.ts tests/integration/json/json-transport.integration.test.ts
git commit -m "feat: redesign ledger read request models"
```

### Task 5: Redesign SubmitCommandRequest Around A Single Create Command

**Files:**
- Create: `src/core/types/commands/create-command.ts`
- Modify: `src/core/types/requests/submit-command-request.ts`
- Modify: `src/services/commands/command-payload-builder.ts`
- Modify: `src/transports/json/json-transport.ts`
- Modify: `tests/unit/services/command-submission-pipeline.test.ts`
- Modify: `tests/unit/services/grpc-command-signing.test.ts`
- Modify: `tests/unit/services/json-command-signing-not-supported.test.ts`
- Modify: `tests/integration/json/json-transport.integration.test.ts`

- [ ] **Step 1: Write the failing tests**

Use a single shared create-command DTO:

```ts
import { CreateCommand, SubmitCommandRequest } from "../../../src";

const request = new SubmitCommandRequest({
    applicationId: "app-1",
    actAs: ["Alice"],
    command: new CreateCommand({
        templateId: "Main:Iou",
        payload: { issuer: "Alice", owner: "Bob" },
    }),
});

expect(request.command.templateId).toBe("Main:Iou");
```

Update command signing tests so the pipeline signs a canonical payload that now includes the create command:

```ts
expect(signAsync.mock.calls[0]?.[0].payload).toBeInstanceOf(Uint8Array);
expect(new TextDecoder().decode(signAsync.mock.calls[0]?.[0].payload)).toContain(
    "\"templateId\":\"Main:Iou\"",
);
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- tests/unit/services/command-submission-pipeline.test.ts tests/unit/services/grpc-command-signing.test.ts tests/unit/services/json-command-signing-not-supported.test.ts tests/integration/json/json-transport.integration.test.ts`
Expected: FAIL because `CreateCommand` and the new `SubmitCommandRequest` shape do not exist yet

- [ ] **Step 3: Write minimal implementation**

Add:

```ts
export class CreateCommand {
    public readonly templateId: string;
    public readonly payload: Record<string, unknown>;

    public constructor(init: {
        templateId: string;
        payload: Record<string, unknown>;
    }) {
        this.templateId = init.templateId;
        this.payload = init.payload;
    }
}
```

Redesign `SubmitCommandRequest`:

```ts
export class SubmitCommandRequest {
    public readonly applicationId: string;
    public readonly actAs: readonly string[];
    public readonly readAs: readonly string[];
    public readonly command: CreateCommand;

    public constructor(init: {
        applicationId: string;
        actAs: readonly string[];
        readAs?: readonly string[];
        command: CreateCommand;
    }) {
        // preserve existing actAs validation
        this.applicationId = init.applicationId;
        this.actAs = init.actAs;
        this.readAs = init.readAs ?? [];
        this.command = init.command;
    }
}
```

Update the canonical payload builder to serialize:

```ts
{
    applicationId: request.applicationId,
    actAs: request.actAs,
    readAs: request.readAs,
    command: {
        templateId: request.command.templateId,
        payload: request.command.payload,
    },
}
```

Update JSON submission mapping to `/v1/create` using:

- `templateId`
- `payload`
- `applicationId`
- `actAs`
- `readAs`

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- tests/unit/services/command-submission-pipeline.test.ts tests/unit/services/grpc-command-signing.test.ts tests/unit/services/json-command-signing-not-supported.test.ts tests/integration/json/json-transport.integration.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/core/types/commands/create-command.ts src/core/types/requests/submit-command-request.ts src/services/commands/command-payload-builder.ts src/transports/json/json-transport.ts tests/unit/services/command-submission-pipeline.test.ts tests/unit/services/grpc-command-signing.test.ts tests/unit/services/json-command-signing-not-supported.test.ts tests/integration/json/json-transport.integration.test.ts
git commit -m "feat: redesign shared command submission request"
```

### Task 6: Wire The Remaining Live gRPC Ledger Operations

**Files:**
- Modify: `src/transports/grpc/grpc-channel-factory.ts`
- Modify: `src/transports/grpc/grpc-transport.ts`
- Modify: `src/transports/grpc/mappers/contracts-mapper.ts`
- Modify: `src/transports/grpc/mappers/events-mapper.ts`
- Modify: `src/transports/grpc/mappers/commands-mapper.ts`
- Test: `tests/unit/grpc/grpc-command-runtime.test.ts`
- Modify: `tests/fixtures/fake-grpc-services.ts`
- Modify: `tests/contract/shared/ledger-read-services.contract.test.ts`
- Modify: `tests/integration/grpc/grpc-transport.integration.test.ts`

- [ ] **Step 1: Write the failing tests**

Add a new runtime-focused unit test:

```ts
import { describe, expect, it } from "vitest";
import { CreateCommand, QueryContractsRequest, StreamTransactionsRequest, SubmitCommandRequest } from "../../../src";
import { createFakeGrpcOperations } from "../../fixtures/fake-grpc-services.js";
import { GrpcTransport } from "../../../src/transports/grpc/grpc-transport.js";

describe("GrpcTransport live ledger shapes", () => {
    it("submits real ledger-shaped requests through grpc operations", async () => {
        let capturedQuery: unknown;
        let capturedSubmit: unknown;

        const transport = new GrpcTransport(
            createFakeGrpcOperations({
                queryContractsAsync: async request => {
                    capturedQuery = request;
                    return { activeContracts: [] };
                },
                submitCommandAsync: async request => {
                    capturedSubmit = request;
                    return { updateId: "tx-1", completionOffset: "10" };
                },
            }),
        );

        await transport.queryContractsAsync(
            new QueryContractsRequest({
                party: "Alice",
                templateId: "Main:Iou",
            }),
        );

        await transport.submitCommandAsync(
            new SubmitCommandRequest({
                applicationId: "app-1",
                actAs: ["Alice"],
                command: new CreateCommand({
                    templateId: "Main:Iou",
                    payload: { issuer: "Alice" },
                }),
            }),
        );

        expect(capturedQuery).toBeDefined();
        expect(capturedSubmit).toBeDefined();
    });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- tests/unit/grpc/grpc-command-runtime.test.ts tests/contract/shared/ledger-read-services.contract.test.ts tests/integration/grpc/grpc-transport.integration.test.ts`
Expected: FAIL because current gRPC mapper/request shapes are still placeholder-shaped

- [ ] **Step 3: Write minimal implementation**

Wire the remaining `GrpcOperations` methods to generated clients:

- `queryContractsAsync`
  - use `StateServiceClient.getActiveContractsPage(...)`
- `streamTransactionsAsync`
  - use `UpdateServiceClient.getUpdates(...)`
- `submitCommandAsync`
  - use `CommandServiceClient.submitAndWait(...)`

Update mappers so they build real protobuf request shapes.

Recommended minimum shapes:

```ts
export function mapGrpcQueryContractsRequest(
    request: QueryContractsRequest,
): GetActiveContractsPageRequest
```

with:
- `activeAtOffset` omitted so the server uses ledger end
- `eventFormat.filtersByParty` populated from `request.party`
- wildcard or template filter narrowed from `request.templateId`

```ts
export function mapGrpcStreamTransactionsRequest(
    request: StreamTransactionsRequest,
): GetUpdatesRequest
```

with:
- `beginExclusive` derived from `beginOffset ?? "0"`
- `endInclusive` from `endOffset`
- `updateFormat` built from `party` and optional `templateId`

```ts
export function mapGrpcSubmitCommandRequest(
    request: SubmitCommandRequest,
    signed?: SignCommandResult,
): SubmitAndWaitRequest
```

with:
- a real `Commands` message
- `applicationId`
- `actAs`
- `readAs`
- a single create command derived from `request.command`

Map `SubmitAndWaitResponse.updateId` into the SDK `SubmitCommandResponse.transactionId` field for now, because the SDK response currently exposes a transaction-like identifier and the placeholder implementation already used that naming.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- tests/unit/grpc/grpc-command-runtime.test.ts tests/contract/shared/ledger-read-services.contract.test.ts tests/integration/grpc/grpc-transport.integration.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/transports/grpc/grpc-channel-factory.ts src/transports/grpc/grpc-transport.ts src/transports/grpc/mappers/contracts-mapper.ts src/transports/grpc/mappers/events-mapper.ts src/transports/grpc/mappers/commands-mapper.ts tests/unit/grpc/grpc-command-runtime.test.ts tests/fixtures/fake-grpc-services.ts tests/contract/shared/ledger-read-services.contract.test.ts tests/integration/grpc/grpc-transport.integration.test.ts
git commit -m "feat: wire grpc ledger runtime operations"
```

### Task 7: Update Public Examples And Run Full Verification

**Files:**
- Modify: `README.md`
- Test: full test suite

- [ ] **Step 1: Update README examples**

Show:

- `GrpcChannelSecurity`
- new `QueryContractsRequest({ party, templateId })`
- new `SubmitCommandRequest` with `CreateCommand`

Example:

```ts
const client = new CantonClient(
    new CantonClientOptions({
        transportKind: TransportKind.grpc,
        endpoint: "http://localhost:6865",
        grpcChannelSecurity: GrpcChannelSecurity.insecure,
        authProvider: new BearerTokenAuthProvider("token"),
    }),
);
```

- [ ] **Step 2: Run focused regression commands**

Run:

```bash
npm test -- tests/unit/core/canton-client-options.test.ts tests/unit/grpc/grpc-channel-factory.test.ts tests/unit/grpc/grpc-system-client.test.ts tests/unit/grpc/grpc-operational-mappers.test.ts tests/unit/grpc/grpc-command-runtime.test.ts tests/unit/services/contracts-client.test.ts tests/unit/services/events-client.test.ts tests/unit/services/grpc-command-signing.test.ts tests/unit/services/json-command-signing-not-supported.test.ts tests/unit/services/command-submission-pipeline.test.ts tests/contract/shared/ledger-read-services.contract.test.ts tests/integration/grpc/grpc-transport.integration.test.ts tests/integration/json/json-transport.integration.test.ts
```

Expected: PASS

- [ ] **Step 3: Run full project verification**

Run:

```bash
npm test
npm run build
npm run lint
```

Expected: all commands PASS

- [ ] **Step 4: Review final diff**

Run:

```bash
git diff --stat abbdbca..HEAD
git status --short
```

Expected: working tree clean, only planned files changed

- [ ] **Step 5: Commit final fixups if needed**

If any verification fixups were required:

```bash
git add src tests README.md
git commit -m "test: finalize grpc runtime wiring"
```

If no fixups were needed, mark this step complete without creating an extra commit.
