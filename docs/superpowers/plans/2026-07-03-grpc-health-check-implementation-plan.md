# gRPC Health Check Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `grpc.health.v1.Health.Check` to the SDK as `healthService.checkAsync(...)` with SDK-owned types and `grpc`-only support.

**Architecture:** Add a dedicated `HealthServiceClient` and SDK-owned health request/response/enum types, then extend the existing shared service registry and transport contract with `checkHealthAsync(...)`. Implement the real gRPC call through the existing channel-factory adapter layer, reject the method on JSON, and update docs/tests to reflect the new `healthService` boundary without changing `versionService`.

**Tech Stack:** TypeScript, Vitest, protobuf-ts generated gRPC clients, existing JSON/gRPC transport adapters

---

## File Structure

### New SDK-owned health surface

- Create: `src/services/health/health-service-client.ts`
  - Service client exposing `checkAsync(...)`
- Create: `src/core/types/requests/health-check-request.ts`
  - SDK request type with `service?: string`
- Create: `src/core/types/responses/health-check-response.ts`
  - SDK response type with `status: HealthCheckStatus`
- Create: `src/core/types/health-check-status.ts`
  - SDK enum mirroring gRPC health serving states

### Root clients and exports

- Modify: `src/client/canton-client.ts`
  - Add `healthService`
- Modify: `src/client/service-registry.ts`
  - Add `healthService` to `ServiceRegistry`
  - Add `PlaceholderTransport.checkHealthAsync(...)`
- Modify: `src/transports/grpc/grpc-ledger-client.ts`
  - Add `healthService`
- Modify: `src/transports/json/json-ledger-client.ts`
  - Add `healthService`
- Modify: `src/index.ts`
  - Export `HealthServiceClient`, `HealthCheckRequest`, `HealthCheckResponse`, `HealthCheckStatus`

### Transport contract and implementations

- Modify: `src/core/transports/transport.interface.ts`
  - Add `checkHealthAsync(request)`
- Modify: `src/transports/grpc/grpc-channel-factory.ts`
  - Add a health client dependency and low-level health operation
- Modify: `src/transports/grpc/grpc-transport.ts`
  - Implement `checkHealthAsync(...)`
- Modify: `src/transports/json/json-transport.ts`
  - Implement `checkHealthAsync(...)` as `NotSupportedError`
- Modify: `tests/fixtures/fake-grpc-services.ts`
  - Add low-level fake operation for health checks

### Generated gRPC files

If absent after regeneration, these should be created by `npm run generate:grpc`:

- Create: `src/transports/grpc/generated/canton/grpc/health/v1/health.ts`
- Create: `src/transports/grpc/generated/canton/grpc/health/v1/health.client.ts`

### Tests and docs

- Modify: `tests/unit/smoke/package-shape.test.ts`
- Modify: `tests/unit/client/canton-client-construction.test.ts`
- Create: `tests/unit/services/health-client.test.ts`
- Modify: `tests/unit/grpc/grpc-channel-factory.test.ts`
- Modify: `tests/integration/grpc/grpc-transport.integration.test.ts`
- Modify: `tests/integration/json/json-transport.integration.test.ts`
- Modify: `tests/contract/shared/operational-services.grpc.contract.test.ts`
- Modify: `tests/contract/shared/operational-services.json.contract.test.ts`
- Modify: `README.md`
- Modify: `DOCUMENTATION.md`

## Task 1: Add The Public Health Service Surface

**Files:**
- Create: `src/services/health/health-service-client.ts`
- Create: `src/core/types/requests/health-check-request.ts`
- Create: `src/core/types/responses/health-check-response.ts`
- Create: `src/core/types/health-check-status.ts`
- Modify: `src/client/canton-client.ts`
- Modify: `src/client/service-registry.ts`
- Modify: `src/transports/grpc/grpc-ledger-client.ts`
- Modify: `src/transports/json/json-ledger-client.ts`
- Modify: `src/index.ts`
- Test: `tests/unit/smoke/package-shape.test.ts`
- Test: `tests/unit/client/canton-client-construction.test.ts`
- Test: `tests/unit/services/health-client.test.ts`

- [ ] **Step 1: Write the failing package surface tests**

Add assertions that the shared surface now includes:

```ts
expect(client.healthService).toBeDefined();
expect(HealthServiceClient).toBeTypeOf("function");
expect(HealthCheckStatus.serving).toBe("serving");
```

Add a focused service-client unit test like:

```ts
const transport = {
    features: { supportsCommandSigning: false },
    checkHealthAsync: async () =>
        new HealthCheckResponse({
            status: HealthCheckStatus.serving,
        }),
    // other required transport methods throw "not used"
};

const client = new HealthServiceClient(transport);

await expect(
    client.checkAsync(new HealthCheckRequest({ service: "ledger" })),
).resolves.toBeInstanceOf(HealthCheckResponse);
```

- [ ] **Step 2: Run the new tests to verify they fail**

Run:

```bash
rtk npm test -- tests/unit/smoke/package-shape.test.ts tests/unit/client/canton-client-construction.test.ts tests/unit/services/health-client.test.ts
```

Expected:

- `FAIL`
- missing `healthService`
- missing health service exports
- missing health service client/type files

- [ ] **Step 3: Add the SDK-owned health types**

Create:

```ts
export class HealthCheckRequest {
    public readonly service?: string;

    public constructor(init: { service?: string } = {}) {
        this.service = init.service;
    }
}
```

```ts
export enum HealthCheckStatus {
    unknown = "unknown",
    serving = "serving",
    notServing = "notServing",
    serviceUnknown = "serviceUnknown",
}
```

```ts
export class HealthCheckResponse {
    public readonly status: HealthCheckStatus;

    public constructor(init: { status: HealthCheckStatus }) {
        this.status = init.status;
    }
}
```

- [ ] **Step 4: Add the health service client**

Create:

```ts
export class HealthServiceClient {
    public constructor(private readonly transport: ITransport) {
        void this.transport;
    }

    /** Checks gRPC health. Supported on gRPC; JSON rejects it. */
    public checkAsync(
        request: HealthCheckRequest,
    ): Promise<HealthCheckResponse> {
        return this.transport.checkHealthAsync(request);
    }
}
```

- [ ] **Step 5: Wire `healthService` into every root client**

Update:

- `ServiceRegistry`
- `CantonClient`
- `GrpcLedgerClient`
- `JsonLedgerClient`
- `src/index.ts`

Make the new service property appear alongside the existing gRPC-shaped services.

- [ ] **Step 6: Run the new surface tests to verify they pass**

Run:

```bash
rtk npm test -- tests/unit/smoke/package-shape.test.ts tests/unit/client/canton-client-construction.test.ts tests/unit/services/health-client.test.ts
```

Expected:

- `PASS`

- [ ] **Step 7: Commit**

```bash
git add src/client src/core/types src/services/health src/index.ts src/transports/grpc/grpc-ledger-client.ts src/transports/json/json-ledger-client.ts tests/unit/smoke/package-shape.test.ts tests/unit/client/canton-client-construction.test.ts tests/unit/services/health-client.test.ts
git commit -m "feat: add health service sdk surface"
```

## Task 2: Add The Transport Contract And JSON/Placeholder Behavior

**Files:**
- Modify: `src/core/transports/transport.interface.ts`
- Modify: `src/client/service-registry.ts`
- Modify: `src/transports/json/json-transport.ts`
- Test: `tests/integration/json/json-transport.integration.test.ts`

- [ ] **Step 1: Write the failing JSON rejection test**

Add a JSON integration assertion like:

```ts
await expect(
    client.healthService.checkAsync(
        new HealthCheckRequest({ service: "ledger" }),
    ),
).rejects.toThrow(NotSupportedError);
```

Also add a `JsonLedgerClient` surface assertion:

```ts
expect(client.healthService).toBeDefined();
```

- [ ] **Step 2: Run the JSON integration test to verify it fails**

Run:

```bash
rtk npm test -- tests/integration/json/json-transport.integration.test.ts
```

Expected:

- `FAIL`
- missing `checkHealthAsync(...)`
- or missing `healthService`

- [ ] **Step 3: Extend the transport interface**

Add:

```ts
checkHealthAsync(
    request: HealthCheckRequest,
): Promise<HealthCheckResponse>;
```

- [ ] **Step 4: Implement JSON and placeholder behavior minimally**

In `JsonTransport`:

```ts
public async checkHealthAsync(
    _request: HealthCheckRequest,
): Promise<HealthCheckResponse> {
    throw new NotSupportedError(
        "grpc.health.v1.Health.Check is not supported by json transport",
    );
}
```

In `PlaceholderTransport`:

```ts
public async checkHealthAsync(
    _request: HealthCheckRequest,
): Promise<HealthCheckResponse> {
    throw new TransportError("gRPC health checks are not available yet");
}
```

- [ ] **Step 5: Run the JSON integration test to verify it passes**

Run:

```bash
rtk npm test -- tests/integration/json/json-transport.integration.test.ts
```

Expected:

- `PASS`

- [ ] **Step 6: Commit**

```bash
git add src/core/transports/transport.interface.ts src/client/service-registry.ts src/transports/json/json-transport.ts tests/integration/json/json-transport.integration.test.ts
git commit -m "feat: add health check transport contract"
```

## Task 3: Add gRPC Health Client Support And Transport Mapping

**Files:**
- Modify: `src/transports/grpc/grpc-channel-factory.ts`
- Modify: `src/transports/grpc/grpc-transport.ts`
- Modify: `tests/fixtures/fake-grpc-services.ts`
- Modify: `tests/unit/grpc/grpc-channel-factory.test.ts`
- Modify: `tests/integration/grpc/grpc-transport.integration.test.ts`
- Modify: `tests/contract/shared/operational-services.grpc.contract.test.ts`
- Modify: `tests/contract/shared/operational-services.json.contract.test.ts`
- Create or regenerate: `src/transports/grpc/generated/canton/grpc/health/v1/health.ts`
- Create or regenerate: `src/transports/grpc/generated/canton/grpc/health/v1/health.client.ts`

- [ ] **Step 1: Write the failing gRPC tests**

Add coverage for three levels:

Channel-factory test:

```ts
const result = await operations.checkHealthAsync({ service: "ledger" });
expect(result).toMatchObject({ status: expect.any(Number) });
```

gRPC integration test:

```ts
await expect(
    client.healthService.checkAsync(
        new HealthCheckRequest({ service: "ledger" }),
    ),
).resolves.toMatchObject({
    status: HealthCheckStatus.serving,
});
```

Contract test:

```ts
await expect(
    healthService.checkAsync(new HealthCheckRequest()),
).resolves.toMatchObject({
    status: HealthCheckStatus.serving,
});
```

- [ ] **Step 2: Run the gRPC test set to verify it fails**

Run:

```bash
rtk npm test -- tests/unit/grpc/grpc-channel-factory.test.ts tests/integration/grpc/grpc-transport.integration.test.ts tests/contract/shared/operational-services.grpc.contract.test.ts tests/contract/shared/operational-services.json.contract.test.ts
```

Expected:

- `FAIL`
- missing generated health client usage
- missing low-level operation
- missing gRPC transport method

- [ ] **Step 3: Generate or confirm the gRPC health bindings**

Run:

```bash
rtk npm run generate:grpc
```

Expected:

- generated `grpc/health/v1` files appear under `src/transports/grpc/generated/canton/`

If the files are still absent, stop and inspect whether `proto/google/rpc` is present locally before continuing.

- [ ] **Step 4: Extend the low-level gRPC operations layer**

In `src/transports/grpc/grpc-channel-factory.ts`:

- add generated health imports
- add a `healthClient` dependency slot
- add:

```ts
checkHealthAsync(request: unknown): Promise<unknown>;
```

- implement:

```ts
async checkHealthAsync(request: unknown): Promise<HealthCheckResponse> {
    const callOptions = await buildGrpcCallOptionsAsync(options.authProvider);

    return await unwrapUnaryResponse(
        healthClient.check(request as HealthCheckRequest, callOptions),
    );
}
```

Use the actual generated gRPC health request/response types, not SDK public types, inside this adapter.

- [ ] **Step 5: Update the fake gRPC operations fixture**

Add:

```ts
checkHealthAsync: async () => ({ status: 1 }),
```

so integration-style tests can override it easily.

- [ ] **Step 6: Implement the gRPC transport mapping**

In `src/transports/grpc/grpc-transport.ts`, add:

```ts
public async checkHealthAsync(
    request: HealthCheckRequest,
): Promise<HealthCheckResponse> {
    const payload = await this.operations.checkHealthAsync({
        service: request.service ?? "",
    });

    return new HealthCheckResponse({
        status: mapGrpcHealthStatus(payload.status),
    });
}
```

Add a small local mapper function or a dedicated mapper file that translates the generated numeric/status enum to `HealthCheckStatus`.

- [ ] **Step 7: Run the gRPC test set to verify it passes**

Run:

```bash
rtk npm test -- tests/unit/grpc/grpc-channel-factory.test.ts tests/integration/grpc/grpc-transport.integration.test.ts tests/contract/shared/operational-services.grpc.contract.test.ts tests/contract/shared/operational-services.json.contract.test.ts
```

Expected:

- `PASS`

- [ ] **Step 8: Commit**

```bash
git add src/transports/grpc tests/fixtures/fake-grpc-services.ts tests/unit/grpc/grpc-channel-factory.test.ts tests/integration/grpc/grpc-transport.integration.test.ts tests/contract/shared/operational-services.grpc.contract.test.ts tests/contract/shared/operational-services.json.contract.test.ts
git commit -m "feat: implement grpc health check"
```

## Task 4: Update Documentation And Run Full Verification

**Files:**
- Modify: `README.md`
- Modify: `DOCUMENTATION.md`

- [ ] **Step 1: Rewrite docs for the new health service**

Update `README.md` to include:

- `healthService.checkAsync(...)`
- `grpc`-only support
- a short example using `HealthCheckRequest`

Update `DOCUMENTATION.md` to include:

- `HealthServiceClient`
- `HealthCheckRequest`
- `HealthCheckResponse`
- `HealthCheckStatus`
- explicit note that JSON has no `grpc.health.v1` equivalent

- [ ] **Step 2: Run full verification**

Run:

```bash
rtk npm run build
rtk npm run lint
rtk npm test
```

Expected:

- all commands `PASS`

- [ ] **Step 3: Commit**

```bash
git add README.md DOCUMENTATION.md
git commit -m "docs: add grpc health check usage"
```

## Task 5: Final Surface Audit

**Files:**
- Review: `src/index.ts`
- Review: `src/client/canton-client.ts`
- Review: `src/client/service-registry.ts`
- Review: `README.md`
- Review: `DOCUMENTATION.md`

- [ ] **Step 1: Audit the final surface**

Confirm the final SDK shape includes:

- `healthService`
- `HealthServiceClient`
- `HealthCheckRequest`
- `HealthCheckResponse`
- `HealthCheckStatus`

Confirm `versionService` remains unchanged.

- [ ] **Step 2: Run a final targeted grep**

Run:

```bash
rtk rg -n "healthService|HealthCheckRequest|HealthCheckResponse|HealthCheckStatus|checkHealthAsync|checkAsync" src README.md DOCUMENTATION.md tests
```

Expected:

- matches appear in the intended health files, docs, and tests
- no accidental placement under `versionService`

- [ ] **Step 3: Commit any final cleanup**

```bash
git add src README.md DOCUMENTATION.md tests
git commit -m "chore: finalize grpc health check surface"
```
