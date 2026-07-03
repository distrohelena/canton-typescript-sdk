# Client Disposal Lifecycle Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a public `disposeAsync()` lifecycle API to `CantonClient` and the public transport classes so cached SDK clients can be shut down cleanly and reject use after disposal.

**Architecture:** Introduce a shared disposal contract on `ITransport`, a dedicated `ObjectDisposedError`, and transport-level disposed-state guards. `CantonClient` will retain ownership of the shared transport from the service registry and delegate disposal to it, while gRPC closes the underlying protobuf transport and JSON performs logical disposal only.

**Tech Stack:** TypeScript, Vitest, `@protobuf-ts/grpc-transport`, `@grpc/grpc-js`

---

## File Structure

### Lifecycle contract and root ownership

- Modify: `src/core/transports/transport.interface.ts`
- Modify: `src/client/service-registry.ts`
- Modify: `src/client/canton-client.ts`
- Test: `tests/unit/client/canton-client-construction.test.ts`

### Disposal error and transport guard

- Create: `src/core/errors/object-disposed-error.ts`
- Modify: `src/index.ts`
- Modify: `tests/unit/core/error-hierarchy.test.ts`

### gRPC disposal implementation

- Modify: `src/transports/grpc/grpc-channel-factory.ts`
- Modify: `src/transports/grpc/grpc-transport.ts`
- Test: `tests/unit/grpc/grpc-system-client.test.ts`
- Test: `tests/unit/grpc/grpc-transport-timeouts.test.ts`

### JSON and placeholder disposal implementation

- Modify: `src/transports/json/json-transport.ts`
- Modify: `src/client/service-registry.ts`
- Test: `tests/unit/json/json-system-client.test.ts`
- Test: `tests/unit/core/transport-surface.test.ts`

## Task 1: Add The Disposal Contract And Root Client Surface

**Files:**
- Modify: `src/core/transports/transport.interface.ts`
- Modify: `src/client/service-registry.ts`
- Modify: `src/client/canton-client.ts`
- Test: `tests/unit/client/canton-client-construction.test.ts`

- [ ] **Step 1: Write the failing root disposal test**

Add a test that constructs a `CantonClient` from a service registry transport double and verifies:

```ts
await client.disposeAsync();
await client.disposeAsync();

expect(transport.disposeAsync).toHaveBeenCalledTimes(1);
```

Also verify the registry result now includes the shared transport instance.

- [ ] **Step 2: Run the focused root disposal test to verify it fails**

Run:

```bash
rtk npm test -- tests/unit/client/canton-client-construction.test.ts
```

Expected:

- `FAIL`
- missing `disposeAsync()` on `CantonClient`
- missing shared transport ownership in the registry result

- [ ] **Step 3: Add the disposal contract and root delegation**

Implement:

- `disposeAsync(): Promise<void>` on `ITransport`
- shared `transport` on the internal `ServiceRegistry`
- `CantonClient.disposeAsync()` delegating to that transport once

Keep disposal idempotent at the root level.

- [ ] **Step 4: Run the focused root disposal test to verify it passes**

Run:

```bash
rtk npm test -- tests/unit/client/canton-client-construction.test.ts
```

Expected:

- `PASS`

- [ ] **Step 5: Commit**

```bash
git add src/core/transports/transport.interface.ts src/client/service-registry.ts src/client/canton-client.ts tests/unit/client/canton-client-construction.test.ts
git commit -m "feat: add root client disposal contract"
```

## Task 2: Add The Disposal Error And Post-Disposal Failure Semantics

**Files:**
- Create: `src/core/errors/object-disposed-error.ts`
- Modify: `src/index.ts`
- Modify: `tests/unit/core/error-hierarchy.test.ts`
- Modify: `tests/unit/core/transport-surface.test.ts`

- [ ] **Step 1: Write the failing disposal error tests**

Add assertions for:

```ts
const error = new ObjectDisposedError("The client or transport has been disposed.");

expect(error).toBeInstanceOf(Error);
expect(error.name).toBe("ObjectDisposedError");
```

Also verify the root package exports the new error type.

- [ ] **Step 2: Run the focused disposal error tests to verify they fail**

Run:

```bash
rtk npm test -- tests/unit/core/error-hierarchy.test.ts tests/unit/core/transport-surface.test.ts
```

Expected:

- `FAIL`
- missing `ObjectDisposedError`
- missing export

- [ ] **Step 3: Add the lifecycle error type**

Implement `ObjectDisposedError` in the existing SDK error hierarchy and export it from the root package.

- [ ] **Step 4: Run the focused disposal error tests to verify they pass**

Run:

```bash
rtk npm test -- tests/unit/core/error-hierarchy.test.ts tests/unit/core/transport-surface.test.ts
```

Expected:

- `PASS`

- [ ] **Step 5: Commit**

```bash
git add src/core/errors/object-disposed-error.ts src/index.ts tests/unit/core/error-hierarchy.test.ts tests/unit/core/transport-surface.test.ts
git commit -m "feat: add disposal lifecycle error"
```

## Task 3: Implement gRPC Disposal And Transport-Level Guarding

**Files:**
- Modify: `src/transports/grpc/grpc-channel-factory.ts`
- Modify: `src/transports/grpc/grpc-transport.ts`
- Test: `tests/unit/grpc/grpc-system-client.test.ts`
- Test: `tests/unit/grpc/grpc-transport-timeouts.test.ts`

- [ ] **Step 1: Write the failing gRPC disposal tests**

Add assertions for:

- `GrpcTransport.disposeAsync()` closes the underlying protobuf transport once
- calling a gRPC SDK method after disposal throws `ObjectDisposedError`
- repeated disposal is a no-op

Example:

```ts
await transport.disposeAsync();

await expect(
    transport.getLedgerApiVersionAsync(),
).rejects.toThrow(ObjectDisposedError);
```

- [ ] **Step 2: Run the focused gRPC disposal tests to verify they fail**

Run:

```bash
rtk npm test -- tests/unit/grpc/grpc-system-client.test.ts tests/unit/grpc/grpc-transport-timeouts.test.ts
```

Expected:

- `FAIL`
- missing `disposeAsync()`
- post-disposal calls still execute

- [ ] **Step 3: Add gRPC disposal wiring and guard helpers**

Implement:

- underlying protobuf transport ownership inside `GrpcOperations`
- one close path reachable from `GrpcTransport.disposeAsync()`
- a guard method that throws `ObjectDisposedError` before any RPC operation after disposal

Keep call behavior unchanged before disposal.

- [ ] **Step 4: Run the focused gRPC disposal tests to verify they pass**

Run:

```bash
rtk npm test -- tests/unit/grpc/grpc-system-client.test.ts tests/unit/grpc/grpc-transport-timeouts.test.ts
```

Expected:

- `PASS`

- [ ] **Step 5: Commit**

```bash
git add src/transports/grpc/grpc-channel-factory.ts src/transports/grpc/grpc-transport.ts tests/unit/grpc/grpc-system-client.test.ts tests/unit/grpc/grpc-transport-timeouts.test.ts
git commit -m "feat: add grpc transport disposal"
```

## Task 4: Implement JSON And Placeholder Disposal And Client-Wide Failure Semantics

**Files:**
- Modify: `src/transports/json/json-transport.ts`
- Modify: `src/client/service-registry.ts`
- Test: `tests/unit/json/json-system-client.test.ts`
- Test: `tests/unit/core/transport-surface.test.ts`

- [ ] **Step 1: Write the failing JSON and client-wide disposal tests**

Add assertions for:

- `JsonTransport.disposeAsync()` rejects future SDK calls with `ObjectDisposedError`
- placeholder transport disposal is idempotent
- disposing `CantonClient` causes already-captured service objects to fail consistently

Example:

```ts
const service = client.versionService;
await client.disposeAsync();

await expect(service.getLedgerApiVersionAsync()).rejects.toThrow(
    ObjectDisposedError,
);
```

- [ ] **Step 2: Run the focused JSON and client-wide disposal tests to verify they fail**

Run:

```bash
rtk npm test -- tests/unit/json/json-system-client.test.ts tests/unit/core/transport-surface.test.ts tests/unit/client/canton-client-construction.test.ts
```

Expected:

- `FAIL`
- missing disposal methods
- post-disposal calls still succeed or fail with the wrong error

- [ ] **Step 3: Add JSON and placeholder disposal guards**

Implement:

- disposed-state tracking in `JsonTransport`
- disposed-state tracking in `PlaceholderTransport`
- shared helper methods so each public transport method checks disposal before doing work

- [ ] **Step 4: Run the focused JSON and client-wide disposal tests to verify they pass**

Run:

```bash
rtk npm test -- tests/unit/json/json-system-client.test.ts tests/unit/core/transport-surface.test.ts tests/unit/client/canton-client-construction.test.ts
```

Expected:

- `PASS`

- [ ] **Step 5: Commit**

```bash
git add src/transports/json/json-transport.ts src/client/service-registry.ts tests/unit/json/json-system-client.test.ts tests/unit/core/transport-surface.test.ts tests/unit/client/canton-client-construction.test.ts
git commit -m "feat: add json disposal lifecycle"
```

## Task 5: Run Full Verification

**Files:**
- Modify as needed from previous tasks

- [ ] **Step 1: Run build verification**

Run:

```bash
rtk npm run build
```

Expected:

- `PASS`

- [ ] **Step 2: Run lint verification**

Run:

```bash
rtk npm run lint
```

Expected:

- `PASS`

- [ ] **Step 3: Run full unit verification**

Run:

```bash
rtk npm run test:unit
```

Expected:

- `PASS`

- [ ] **Step 4: Commit final verification-safe tree**

```bash
git add src tests
git commit -m "feat: add sdk disposal lifecycle"
```
