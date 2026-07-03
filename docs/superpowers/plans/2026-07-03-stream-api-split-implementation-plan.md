# Stream API Split Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Split JSON query streaming from gRPC ledger-update streaming so the SDK surface is semantically honest.

**Architecture:** Add a dedicated contracts-side query streaming API with its own request and observer types, then move JSON `/v1/stream/query` behind that surface. Keep `EventsClient.streamTransactionsAsync(...)` as the ledger-update API and enforce it as gRPC-only by throwing `NotSupportedError` on JSON and leaving query streaming unsupported on gRPC for now.

**Tech Stack:** TypeScript, Vitest, existing JSON/gRPC transport abstractions

---

## File Structure

This feature should touch the following files:

- Create: `src/core/types/requests/stream-query-request.ts`
- Create: `src/services/contracts/contract-observer.interface.ts`
- Modify: `src/core/transports/transport.interface.ts`
- Modify: `src/services/contracts/contracts-client.ts`
- Modify: `src/services/events/events-client.ts`
- Modify: `src/client/service-registry.ts`
- Modify: `src/index.ts`
- Modify: `src/transports/json/json-transport.ts`
- Modify: `src/transports/grpc/grpc-transport.ts`
- Modify: `README.md`
- Modify: `tests/unit/services/contracts-client.test.ts`
- Modify: `tests/unit/services/events-client.test.ts`
- Modify: `tests/contract/shared/ledger-read-services.contract.test.ts`
- Modify: `tests/integration/json/json-transport.integration.test.ts`
- Modify: `tests/integration/grpc/grpc-transport.integration.test.ts`

Keep the existing transport architecture. Do not add a new top-level client. Do not try to make query streams and ledger-update streams share one request model.

### Task 1: Add A Separate Query-Stream Surface

**Files:**
- Create: `src/core/types/requests/stream-query-request.ts`
- Create: `src/services/contracts/contract-observer.interface.ts`
- Modify: `src/core/transports/transport.interface.ts`
- Modify: `src/services/contracts/contracts-client.ts`
- Modify: `src/client/service-registry.ts`
- Modify: `src/index.ts`
- Test: `tests/unit/services/contracts-client.test.ts`

- [ ] **Step 1: Write the failing test**

Update `tests/unit/services/contracts-client.test.ts` to add coverage for the new request and method:

```ts
import {
    QueryContractsRequest,
    QueryContractsResponse,
    StreamQueryRequest,
} from "../../../src";
import { ContractsClient } from "../../../src/services/contracts/contracts-client.js";

describe("ContractsClient", () => {
    it("streams contract queries through the selected transport", async () => {
        const request = new StreamQueryRequest({
            party: "Alice",
            templateId: "Main:Iou",
        });

        const nextAsync = vi.fn(async () => undefined);

        const transport = {
            features: { supportsCommandSigning: false },
            getHealthAsync: async () => { throw new Error("not used"); },
            createPartyAsync: async () => { throw new Error("not used"); },
            listPartiesAsync: async () => { throw new Error("not used"); },
            grantUserRightsAsync: async () => { throw new Error("not used"); },
            uploadPackageAsync: async () => { throw new Error("not used"); },
            queryContractsAsync: async () =>
                new QueryContractsResponse({ contracts: [] }),
            streamQueryAsync: async (
                _request: StreamQueryRequest,
                observer: { nextAsync(event: unknown): Promise<void> },
            ) => {
                await observer.nextAsync({ contractId: "c1" });
            },
            streamTransactionsAsync: async () => {
                throw new Error("not used");
            },
            submitCommandAsync: async () => {
                throw new Error("not used");
            },
        };

        const client = new ContractsClient(transport);

        expect(request.party).toBe("Alice");
        expect(request.templateId).toBe("Main:Iou");
        await client.streamQueryAsync(request, { nextAsync });
        expect(nextAsync).toHaveBeenCalledWith({ contractId: "c1" });
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/unit/services/contracts-client.test.ts`
Expected: FAIL with missing `StreamQueryRequest`, missing `streamQueryAsync`, or transport shape mismatch

- [ ] **Step 3: Write minimal implementation**

Add `StreamQueryRequest`:

```ts
export class StreamQueryRequest {
    public readonly party: string;
    public readonly templateId?: string;

    public constructor(init: {
        party: string;
        templateId?: string;
    }) {
        this.party = init.party;
        this.templateId = init.templateId;
    }
}
```

Add `ContractObserver`:

```ts
export interface ContractObserver<TContract = unknown> {
    nextAsync(contract: TContract): Promise<void>;
}
```

Update `ITransport`:

```ts
streamQueryAsync(
    request: StreamQueryRequest,
    observer: ContractObserver,
): Promise<void>;
```

Update `ContractsClient`:

```ts
public streamQueryAsync(
    request: StreamQueryRequest,
    observer: ContractObserver,
): Promise<void> {
    return this.transport.streamQueryAsync(request, observer);
}
```

Update `PlaceholderTransport` in `src/client/service-registry.ts` to throw `TransportError` from `streamQueryAsync(...)`.

Export the new types from `src/index.ts`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/unit/services/contracts-client.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/core/types/requests/stream-query-request.ts src/services/contracts/contract-observer.interface.ts src/core/transports/transport.interface.ts src/services/contracts/contracts-client.ts src/client/service-registry.ts src/index.ts tests/unit/services/contracts-client.test.ts
git commit -m "feat: add shared query stream surface"
```

### Task 2: Move JSON Query Streaming Under Contracts And Reject JSON Event Streaming

**Files:**
- Modify: `src/transports/json/json-transport.ts`
- Modify: `src/services/events/events-client.ts`
- Modify: `tests/unit/services/events-client.test.ts`
- Modify: `tests/contract/shared/ledger-read-services.contract.test.ts`
- Modify: `tests/integration/json/json-transport.integration.test.ts`

- [ ] **Step 1: Write the failing tests**

Update `tests/unit/services/events-client.test.ts` so JSON-style event streaming is no longer treated as valid behavior:

```ts
import { describe, expect, it } from "vitest";
import { NotSupportedError, StreamTransactionsRequest } from "../../../src";
import { EventsClient } from "../../../src/services/events/events-client.js";

describe("EventsClient", () => {
    it("surfaces unsupported ledger-update streaming", async () => {
        const client = new EventsClient({
            features: { supportsCommandSigning: false },
            getHealthAsync: async () => { throw new Error("not used"); },
            createPartyAsync: async () => { throw new Error("not used"); },
            listPartiesAsync: async () => { throw new Error("not used"); },
            grantUserRightsAsync: async () => { throw new Error("not used"); },
            uploadPackageAsync: async () => { throw new Error("not used"); },
            queryContractsAsync: async () => { throw new Error("not used"); },
            streamQueryAsync: async () => { throw new Error("not used"); },
            streamTransactionsAsync: async () => {
                throw new NotSupportedError("ledger update streaming is gRPC-only");
            },
            submitCommandAsync: async () => { throw new Error("not used"); },
        });

        await expect(
            client.streamTransactionsAsync(
                new StreamTransactionsRequest({ party: "Alice" }),
                { nextAsync: async () => undefined },
            ),
        ).rejects.toThrow(NotSupportedError);
    });
});
```

Update `tests/contract/shared/ledger-read-services.contract.test.ts` so JSON uses `contracts.streamQueryAsync(...)` and only gRPC uses `events.streamTransactionsAsync(...)`.

Update `tests/integration/json/json-transport.integration.test.ts` to assert a JSON stream-query path such as:

```ts
await client.contracts.streamQueryAsync(
    new StreamQueryRequest({
        party: "Alice",
        templateId: "Main:Iou",
    }),
    { nextAsync },
);
```

and verify `/v1/stream/query` receives:

```ts
{
    party: "Alice",
    templateIds: ["Main:Iou"],
}
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- tests/unit/services/events-client.test.ts tests/contract/shared/ledger-read-services.contract.test.ts tests/integration/json/json-transport.integration.test.ts`
Expected: FAIL because JSON still wires `/v1/stream/query` through `streamTransactionsAsync(...)`

- [ ] **Step 3: Write minimal implementation**

In `src/transports/json/json-transport.ts`, add:

```ts
public async streamQueryAsync(
    request: StreamQueryRequest,
    observer: ContractObserver,
): Promise<void> {
    const payload = await this.httpClient.postAsync("/v1/stream/query", {
        party: request.party,
        templateIds: request.templateId ? [request.templateId] : [],
    });

    const events = mapJsonTransactionEvents(
        payload as { events?: unknown[] },
    );

    for (const event of events) {
        await observer.nextAsync(event);
    }
}
```

Change `streamTransactionsAsync(...)` in `JsonTransport` to:

```ts
throw new NotSupportedError(
    "ledger update streaming is not supported by json transport",
);
```

Update the `EventsClient` comment so it remains explicitly gRPC-only.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- tests/unit/services/events-client.test.ts tests/contract/shared/ledger-read-services.contract.test.ts tests/integration/json/json-transport.integration.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/transports/json/json-transport.ts src/services/events/events-client.ts tests/unit/services/events-client.test.ts tests/contract/shared/ledger-read-services.contract.test.ts tests/integration/json/json-transport.integration.test.ts
git commit -m "feat: move json query streaming to contracts"
```

### Task 3: Enforce The Same Split On gRPC

**Files:**
- Modify: `src/transports/grpc/grpc-transport.ts`
- Modify: `tests/contract/shared/ledger-read-services.contract.test.ts`
- Modify: `tests/integration/grpc/grpc-transport.integration.test.ts`

- [ ] **Step 1: Write the failing tests**

Add gRPC-side rejection coverage to `tests/integration/grpc/grpc-transport.integration.test.ts`:

```ts
import {
    CreateCommand,
    NotSupportedError,
    QueryContractsRequest,
    StreamQueryRequest,
    SubmitCommandRequest,
} from "../../../src";

await expect(
    client.contracts.streamQueryAsync(
        new StreamQueryRequest({
            party: "Alice",
            templateId: "Main:Iou",
        }),
        { nextAsync: async () => undefined },
    ),
).rejects.toThrow(NotSupportedError);
```

Update `tests/contract/shared/ledger-read-services.contract.test.ts` so gRPC no longer participates in shared query-stream assertions. Shared parity should remain only for `queryAsync(...)`.

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- tests/contract/shared/ledger-read-services.contract.test.ts tests/integration/grpc/grpc-transport.integration.test.ts`
Expected: FAIL because `GrpcTransport` does not implement `streamQueryAsync(...)` yet

- [ ] **Step 3: Write minimal implementation**

Add to `GrpcTransport`:

```ts
public async streamQueryAsync(
    _request: StreamQueryRequest,
    _observer: ContractObserver,
): Promise<void> {
    throw new NotSupportedError(
        "query streaming is not supported by grpc transport yet",
    );
}
```

Do not add a gRPC low-level operation for query streaming in this feature. The point is to keep the API honest, not to invent parity.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- tests/contract/shared/ledger-read-services.contract.test.ts tests/integration/grpc/grpc-transport.integration.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/transports/grpc/grpc-transport.ts tests/contract/shared/ledger-read-services.contract.test.ts tests/integration/grpc/grpc-transport.integration.test.ts
git commit -m "fix: enforce honest grpc and json streaming split"
```

### Task 4: Update Public Documentation And Run Full Verification

**Files:**
- Modify: `README.md`
- Test: full regression and project verification

- [ ] **Step 1: Update README examples**

Add or adjust examples so they show:

- `contracts.queryAsync(...)` for normal queries
- `contracts.streamQueryAsync(...)` for JSON query streams
- `events.streamTransactionsAsync(...)` described as gRPC-only

Recommended example shape:

```ts
await client.contracts.streamQueryAsync(
    new StreamQueryRequest({
        party: "Alice",
        templateId: "Main:Iou",
    }),
    {
        async nextAsync(contract) {
            console.log(contract);
        },
    },
);
```

- [ ] **Step 2: Run focused regression commands**

Run:

```bash
npm test -- tests/unit/services/contracts-client.test.ts tests/unit/services/events-client.test.ts tests/contract/shared/ledger-read-services.contract.test.ts tests/integration/json/json-transport.integration.test.ts tests/integration/grpc/grpc-transport.integration.test.ts
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
git diff --stat
git status --short
```

Expected: only planned files are changed

- [ ] **Step 5: Commit final fixups if needed**

If README or verification-driven fixups were required:

```bash
git add README.md src tests
git commit -m "docs: finalize stream api split"
```

If no fixups were needed beyond the earlier task commits, mark this step complete without an extra commit.
