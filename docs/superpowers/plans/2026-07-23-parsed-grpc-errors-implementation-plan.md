# Parsed gRPC Errors Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expose parsed gRPC failures as stable SDK errors and optionally notify an application-provided observer for logging or telemetry.

**Architecture:** Add a standalone `GrpcTransportError` parser that normalises protobuf-ts `RpcError` values, including safely decoded `google.rpc.Status` trailers. Wrap the completed `GrpcOperations` object once at the channel boundary, so every promise-returning gRPC operation rejects with the same SDK error and invokes `CantonClientOptions.onGrpcError` exactly once; application callback failures are ignored.

**Tech Stack:** TypeScript, `@protobuf-ts/runtime-rpc`, generated protobuf-ts `google.rpc.Status`, Vitest.

---

## File structure

- `src/core/errors/grpc-transport-error.ts` — public error subclass, structural `RpcError` recognition, metadata copy, status-trailer decoding, and observer-safe normalisation helper.
- `src/client/canton-client-options.ts` — optional `onGrpcError` option stored on client options.
- `src/transports/grpc/grpc-channel-factory.ts` — one proxy/wrapper around all returned operation functions, preserving the current generated-client calls while normalising rejections.
- `src/index.ts` — public exports for the error class and its metadata/status types.
- `tests/unit/core/grpc-transport-error.test.ts` — direct parser, malformed-input, and causal-chain tests.
- `tests/unit/core/canton-client-options.test.ts` — options callback retention test.
- `tests/unit/grpc/grpc-channel-factory.test.ts` — unary generated-client rejection, observer delivery, observer-failure, and non-gRPC passthrough tests.
- `README.md` — short error-handling example using `GrpcTransportError` and `onGrpcError`.

### Task 1: Define the parsed error contract with red unit tests

**Files:**

- Create: `tests/unit/core/grpc-transport-error.test.ts`
- Create: `src/core/errors/grpc-transport-error.ts`

- [ ] **Step 1: Write failing parser tests**

  Build a structural RPC error fixture—an `Error` with `name: "RpcError"`, `code: "UNAUTHENTICATED"`, `serviceName`, `methodName`, and metadata. Assert `GrpcTransportError.fromUnknown(error)` returns an error that:

  ```ts
  expect(parsed).toBeInstanceOf(TransportError);
  expect(parsed.grpcCode).toBe("UNAUTHENTICATED");
  expect(parsed.serviceName).toBe("com.daml.ledger.api.v2.admin.UserManagementService");
  expect(parsed.methodName).toBe("ListUsers");
  expect(parsed.metadata["x-canton-correlation-id"]).toEqual(["request-123"]);
  expect(parsed.cause).toBe(rawError);
  ```

  Encode a `Status` message with the generated `Status.toBinary()` and expose it through `grpc-status-details-bin` as base64. Assert `status.code`, `status.message`, and the opaque `Any` detail `typeUrl`/bytes survive. Add equivalent fixtures for a `Uint8Array`, a Node `Buffer`, and mixed binary trailer arrays; the parser must use the first valid binary value. Add cases for string-array trailer input, malformed base64/protobuf bytes, non-RPC `Error`, and missing code. Those cases must not throw; malformed/missing details yield `status === undefined`, and non-RPC values return `undefined` from the factory. Attempt to mutate the exposed metadata object and a value array, then assert the original public metadata remains unchanged.

- [ ] **Step 2: Run the test to verify it is red**

  Run: `rtk npm test -- tests/unit/core/grpc-transport-error.test.ts`

  Expected: FAIL because the module and `GrpcTransportError` do not exist.

- [ ] **Step 3: Implement the minimal public error and parser**

  Make `GrpcTransportError extends TransportError`, with readonly `grpcCode`, optional service/method, copied readonly metadata, optional generated `Status`, and original error as `cause`. Define and export SDK-owned metadata types instead of leaking protobuf-ts transport types.

  Implement `fromUnknown(error: unknown)` with a structural record guard requiring an `Error` plus string `code` and RPC-shaped fields; do not use `instanceof RpcError`. Copy metadata values into new string arrays, freeze each array and its containing metadata object before exposing them. Read `grpc-status-details-bin` values as strings, `Uint8Array`s, Buffers, or arrays of those shapes; base64-decode string values, use binary values directly, and call `Status.fromBinary()` for each candidate inside a narrow `try`/`catch` until one decodes. Build an informative message from code, server message, and optionally service/method. Never modify the raw error.

- [ ] **Step 4: Run the parser tests to verify they are green**

  Run: `rtk npm test -- tests/unit/core/grpc-transport-error.test.ts`

  Expected: PASS.

- [ ] **Step 5: Commit the isolated parser**

  ```bash
  rtk git add src/core/errors/grpc-transport-error.ts tests/unit/core/grpc-transport-error.test.ts
  rtk git commit -m "feat: parse gRPC transport errors"
  ```

### Task 2: Add the optional observer and normalise all gRPC operations at one boundary

**Files:**

- Modify: `src/client/canton-client-options.ts`
- Modify: `src/transports/grpc/grpc-channel-factory.ts`
- Modify: `tests/unit/core/canton-client-options.test.ts`
- Modify: `tests/unit/grpc/grpc-channel-factory.test.ts`

- [ ] **Step 1: Write failing option and channel tests**

  Add an options construction test proving `onGrpcError` is retained unchanged. In `grpc-channel-factory.test.ts`, inject a `versionServiceClient.getLedgerApiVersion()` whose `response` rejects with the structural RPC fixture from Task 1. Create operations with `onGrpcError: observer` and assert:

  ```ts
  await expect(operations.getHealthAsync()).rejects.toMatchObject({
    grpcCode: "UNAUTHENTICATED",
    methodName: "ListUsers",
  });
  expect(observer).toHaveBeenCalledTimes(1);
  expect(observer).toHaveBeenCalledWith(expect.any(GrpcTransportError));
  ```

  Add a callback that throws and assert the operation still rejects with the parsed error rather than the callback error. Add a non-RPC rejection fixture and assert the original object is rejected and the observer is not called. Use a server-streaming injected client case to establish that an asynchronous iterator failure is normalised through the same boundary.

- [ ] **Step 2: Run focused tests to verify they are red**

  Run:

  ```bash
  rtk npm test -- tests/unit/core/canton-client-options.test.ts tests/unit/grpc/grpc-channel-factory.test.ts
  ```

  Expected: FAIL because `onGrpcError` is not accepted and channel-operation rejections are raw.

- [ ] **Step 3: Implement callback threading and the one-time operations wrapper**

  Add `onGrpcError?: (error: GrpcTransportError) => void` to both the `CantonClientOptions` init type and readonly instance field.

  In `grpc-channel-factory.ts`, construct the existing plain operations object exactly as today, then return a typed wrapper/proxy that invokes every function and attaches rejection handling:

  ```ts
  return wrapGrpcOperations(operations, options.onGrpcError);
  ```

  The wrapper must leave non-function members alone, preserve method `this` binding, await each returned promise, and on rejection call `GrpcTransportError.fromUnknown`. For parsed errors, invoke the observer in `try`/`catch` and deliberately discard observer exceptions; then rethrow the parsed error. For all other rejections, rethrow the exact original value. This single wrapper covers unary responses, client-stream completion, and server-stream iteration because the existing operation methods already return a promise encompassing those paths. Do not add per-service catch blocks or change call-option/auth behavior.

- [ ] **Step 4: Run the focused tests to verify they are green**

  Run:

  ```bash
  rtk npm test -- tests/unit/core/canton-client-options.test.ts tests/unit/grpc/grpc-channel-factory.test.ts
  ```

  Expected: PASS.

- [ ] **Step 5: Run existing topology and timeout regressions**

  Run:

  ```bash
  rtk npm test -- tests/unit/grpc/grpc-topology-services.test.ts tests/unit/grpc/grpc-transport-timeouts.test.ts tests/unit/grpc/grpc-connect-timeout.test.ts
  ```

  Expected: PASS; the topology-specific compatibility error still has its current diagnostic behavior.

- [ ] **Step 6: Commit integration wiring**

  ```bash
  rtk git add src/client/canton-client-options.ts src/transports/grpc/grpc-channel-factory.ts tests/unit/core/canton-client-options.test.ts tests/unit/grpc/grpc-channel-factory.test.ts
  rtk git commit -m "feat: expose gRPC error observer"
  ```

### Task 3: Export and document the stable error surface

**Files:**

- Modify: `src/index.ts`
- Modify: `README.md`
- Modify: `tests/unit/core/grpc-transport-error.test.ts`

- [ ] **Step 1: Add a failing public-entry-point assertion**

  Change the parser test to import `GrpcTransportError` and its public types from `src/index.ts` rather than its internal path. This makes the documented consumer import part of the tested contract.

- [ ] **Step 2: Run it to verify it is red**

  Run: `rtk npm test -- tests/unit/core/grpc-transport-error.test.ts`

  Expected: FAIL because `src/index.ts` does not yet export the new public error/type symbols.

- [ ] **Step 3: Export and document the API**

  Export `GrpcTransportError` plus its public metadata/status types from `src/index.ts`. Add a concise README error-handling example:

  ```ts
  const client = new CantonClient(new CantonClientOptions({
    // existing connection options,
    onGrpcError: (error) => logger.error({ code: error.grpcCode, status: error.status }),
  }));

  try {
    await client.userManagement.listUsersAsync(...);
  } catch (error) {
    if (error instanceof GrpcTransportError) console.error(error.grpcCode);
  }
  ```

  State that the callback is observational and that unknown `google.protobuf.Any` detail payloads remain opaque.

- [ ] **Step 4: Run tests and package type/build validation**

  Run:

  ```bash
  rtk npm test -- tests/unit/core/grpc-transport-error.test.ts tests/unit/core/canton-client-options.test.ts tests/unit/grpc/grpc-channel-factory.test.ts
  rtk npm run build
  ```

  Expected: PASS.

- [ ] **Step 5: Commit public API and documentation**

  ```bash
  rtk git add src/index.ts README.md tests/unit/core/grpc-transport-error.test.ts
  rtk git commit -m "docs: describe parsed gRPC errors"
  ```

### Task 4: Complete final regression and repository checks

**Files:**

- Verify only; no planned source changes.

- [ ] **Step 1: Run the gRPC unit suite**

  Run: `rtk npm test -- tests/unit/grpc`

  Expected: PASS.

- [ ] **Step 2: Run full static and repository checks**

  Run:

  ```bash
  rtk npm run build
  rtk git diff --check
  rtk git status --short
  ```

  Expected: build and diff check exit 0; status contains only intentionally untracked generated localnet directories, if they still exist.

- [ ] **Step 3: Record the completed design decision in persistent memory**

  Add a Graphiti memory stating that gRPC `RpcError` failures are exposed as `GrpcTransportError`, with an opt-in best-effort `onGrpcError` observer; the original error remains the cause and malformed status trailers never mask the base failure.
