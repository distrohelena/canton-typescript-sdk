# Shared Request Timeout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add shared request timeout support to the public SDK surface, with client-level default request timeouts, gRPC-specific connect timeout, and per-call timeout overrides usable from `CantonClient`.

**Architecture:** Add a new transport-neutral public `RequestOptions` type and thread it through the public service clients, `ITransport`, and both concrete transports. gRPC maps the effective timeout to protobuf-ts/grpc-js call timeouts and connect timeout to `clientOptions.connectTimeoutMs`, while JSON maps the same effective timeout to `fetch` cancellation through `AbortController`.

**Tech Stack:** TypeScript, Vitest, `@protobuf-ts/grpc-transport`, `@grpc/grpc-js`, Node `fetch`/`AbortController`

---

## File Structure

### Public timeout model and exports

- Create: `src/core/types/request-options.ts`
- Modify: `src/client/canton-client-options.ts`
- Modify: `src/index.ts`
- Modify: `tests/unit/core/canton-client-options.test.ts`
- Create: `tests/unit/core/request-options.test.ts`
- Modify: `tests/unit/smoke/package-shape.test.ts`

### Public service and transport propagation

- Modify: `src/core/transports/transport.interface.ts`
- Modify: `src/client/service-registry.ts`
- Modify: `src/services/version/version-service-client.ts`
- Modify: `src/services/health/health-service-client.ts`
- Modify: `src/services/party-management/party-management-service-client.ts`
- Modify: `src/services/user-management/user-management-service-client.ts`
- Modify: `src/services/package-management/package-management-service-client.ts`
- Modify: `src/services/state/state-service-client.ts`
- Modify: `src/services/update/update-service-client.ts`
- Modify: `src/services/command/command-service-client.ts`
- Modify: `src/services/commands/command-submission-pipeline.ts`
- Test: `tests/unit/services/health-client.test.ts`
- Test: `tests/unit/services/parties-client.test.ts`
- Test: `tests/unit/services/command-submission-pipeline.test.ts`

### gRPC timeout implementation

- Modify: `src/transports/grpc/grpc-call-options-factory.ts`
- Modify: `src/transports/grpc/grpc-channel-factory.ts`
- Modify: `src/transports/grpc/grpc-transport.ts`
- Test: `tests/unit/grpc/grpc-channel-factory.test.ts`

### JSON timeout implementation

- Modify: `src/transports/json/json-http-client.ts`
- Modify: `src/transports/json/json-transport.ts`
- Modify: `src/transports/json/json-transport-factory.ts`
- Create: `tests/unit/json/json-http-client.test.ts`

## Task 1: Add The Public Timeout Types And Root Exports

**Files:**
- Create: `src/core/types/request-options.ts`
- Modify: `src/client/canton-client-options.ts`
- Modify: `src/index.ts`
- Modify: `tests/unit/core/canton-client-options.test.ts`
- Create: `tests/unit/core/request-options.test.ts`
- Modify: `tests/unit/smoke/package-shape.test.ts`

- [ ] **Step 1: Write the failing timeout options tests**

Add assertions like:

```ts
const options = new CantonClientOptions({
    transportKind: TransportKind.grpc,
    endpoint: "http://localhost:6865",
    defaultRequestTimeoutMs: 5_000,
    grpcConnectTimeoutMs: 2_000,
});

expect(options.defaultRequestTimeoutMs).toBe(5_000);
expect(options.grpcConnectTimeoutMs).toBe(2_000);
```

Also add a root-export test for:

```ts
const requestOptions = new RequestOptions({
    timeoutMs: 1_500,
});

expect(requestOptions.timeoutMs).toBe(1_500);
expect(rootModule.RequestOptions).toBeTypeOf("function");
```

- [ ] **Step 2: Run the focused timeout options tests to verify they fail**

Run:

```bash
rtk npm test -- tests/unit/core/canton-client-options.test.ts tests/unit/core/request-options.test.ts tests/unit/smoke/package-shape.test.ts
```

Expected:

- `FAIL`
- missing `RequestOptions`
- missing timeout fields on `CantonClientOptions`
- missing root export

- [ ] **Step 3: Add `RequestOptions`, extend `CantonClientOptions`, and export them**

Implement:

- `RequestOptions.timeoutMs?: number`
- `CantonClientOptions.defaultRequestTimeoutMs?: number`
- `CantonClientOptions.grpcConnectTimeoutMs?: number`
- root-package export for `RequestOptions`

Keep names transport-neutral except for the explicit gRPC connection field.

- [ ] **Step 4: Run the focused timeout options tests to verify they pass**

Run:

```bash
rtk npm test -- tests/unit/core/canton-client-options.test.ts tests/unit/core/request-options.test.ts tests/unit/smoke/package-shape.test.ts
```

Expected:

- `PASS`

- [ ] **Step 5: Commit**

```bash
git add src/core/types/request-options.ts src/client/canton-client-options.ts src/index.ts tests/unit/core/canton-client-options.test.ts tests/unit/core/request-options.test.ts tests/unit/smoke/package-shape.test.ts
git commit -m "feat: add shared request timeout options"
```

## Task 2: Thread Shared Request Options Through Public Services And Transport Interfaces

**Files:**
- Modify: `src/core/transports/transport.interface.ts`
- Modify: `src/client/service-registry.ts`
- Modify: `src/services/version/version-service-client.ts`
- Modify: `src/services/health/health-service-client.ts`
- Modify: `src/services/party-management/party-management-service-client.ts`
- Modify: `src/services/user-management/user-management-service-client.ts`
- Modify: `src/services/package-management/package-management-service-client.ts`
- Modify: `src/services/state/state-service-client.ts`
- Modify: `src/services/update/update-service-client.ts`
- Modify: `src/services/command/command-service-client.ts`
- Modify: `src/services/commands/command-submission-pipeline.ts`
- Test: `tests/unit/services/health-client.test.ts`
- Test: `tests/unit/services/parties-client.test.ts`
- Test: `tests/unit/services/command-submission-pipeline.test.ts`

- [ ] **Step 1: Write the failing forwarding tests**

Add assertions that public service methods forward the optional `RequestOptions` object unchanged.

Examples:

```ts
const options = new RequestOptions({ timeoutMs: 5_000 });

await client.listKnownPartiesAsync(request, options);

expect(transport.listKnownPartiesAsync).toHaveBeenCalledWith(request, options);
```

For the command path:

```ts
await pipeline.submitAsync(request, options);

expect(transport.submitCommandAsync).toHaveBeenCalledWith(request, signed, options);
```

- [ ] **Step 2: Run the focused forwarding tests to verify they fail**

Run:

```bash
rtk npm test -- tests/unit/services/health-client.test.ts tests/unit/services/parties-client.test.ts tests/unit/services/command-submission-pipeline.test.ts
```

Expected:

- `FAIL`
- public service methods do not accept `RequestOptions`
- pipeline does not forward `RequestOptions`

- [ ] **Step 3: Extend the service and transport method signatures**

Thread `RequestOptions` through:

- `ITransport`
- `PlaceholderTransport`
- all implemented public service clients
- `CommandSubmissionPipeline.submitAsync(...)`
- `CommandServiceClient.submitAndWaitAsync(...)`

Method shape rules:

- unary methods: `methodAsync(request, options?)`
- optional request methods: `methodAsync(request?, options?)`
- observer methods: `methodAsync(request, observer, options?)`

- [ ] **Step 4: Run the focused forwarding tests to verify they pass**

Run:

```bash
rtk npm test -- tests/unit/services/health-client.test.ts tests/unit/services/parties-client.test.ts tests/unit/services/command-submission-pipeline.test.ts
```

Expected:

- `PASS`

- [ ] **Step 5: Commit**

```bash
git add src/core/transports/transport.interface.ts src/client/service-registry.ts src/services/version/version-service-client.ts src/services/health/health-service-client.ts src/services/party-management/party-management-service-client.ts src/services/user-management/user-management-service-client.ts src/services/package-management/package-management-service-client.ts src/services/state/state-service-client.ts src/services/update/update-service-client.ts src/services/command/command-service-client.ts src/services/commands/command-submission-pipeline.ts tests/unit/services/health-client.test.ts tests/unit/services/parties-client.test.ts tests/unit/services/command-submission-pipeline.test.ts
git commit -m "feat: thread shared request options through services"
```

## Task 3: Implement gRPC Default Timeout, Per-Call Timeout, And Connect Timeout

**Files:**
- Modify: `src/transports/grpc/grpc-call-options-factory.ts`
- Modify: `src/transports/grpc/grpc-channel-factory.ts`
- Modify: `src/transports/grpc/grpc-transport.ts`
- Test: `tests/unit/grpc/grpc-channel-factory.test.ts`

- [ ] **Step 1: Write the failing gRPC timeout tests**

Add assertions for:

- metadata still forwards
- effective timeout becomes a protobuf-ts call timeout
- per-call `RequestOptions.timeoutMs` overrides `CantonClientOptions.defaultRequestTimeoutMs`
- transport construction passes `clientOptions.connectTimeoutMs`

Examples:

```ts
const callOptions = await buildGrpcCallOptionsAsync(
    authProvider,
    5_000,
);

expect(callOptions.timeout).toBe(5_000);
```

And:

```ts
expect(capturedOptions).toMatchObject({
    meta: { authorization: "Bearer token-123" },
    timeout: 2_000,
});
```

- [ ] **Step 2: Run the focused gRPC timeout tests to verify they fail**

Run:

```bash
rtk npm test -- tests/unit/grpc/grpc-channel-factory.test.ts
```

Expected:

- `FAIL`
- call options do not include timeout
- gRPC transport construction ignores connect timeout

- [ ] **Step 3: Implement gRPC timeout resolution**

Update:

- `buildGrpcCallOptionsAsync(...)` to merge auth metadata plus timeout
- `createGrpcOperations(...)` to resolve effective timeout from per-call options and client defaults
- protobuf-ts transport construction to pass `clientOptions.connectTimeoutMs` from `CantonClientOptions.grpcConnectTimeoutMs`
- `GrpcTransport` and `GrpcOperations` method signatures to accept the shared `RequestOptions`

Use protobuf-ts `timeout` so it computes the absolute deadline internally.

- [ ] **Step 4: Run the focused gRPC timeout tests to verify they pass**

Run:

```bash
rtk npm test -- tests/unit/grpc/grpc-channel-factory.test.ts
```

Expected:

- `PASS`

- [ ] **Step 5: Commit**

```bash
git add src/transports/grpc/grpc-call-options-factory.ts src/transports/grpc/grpc-channel-factory.ts src/transports/grpc/grpc-transport.ts tests/unit/grpc/grpc-channel-factory.test.ts
git commit -m "feat: add grpc request timeout support"
```

## Task 4: Implement Shared JSON Timeout Cancellation

**Files:**
- Modify: `src/transports/json/json-http-client.ts`
- Modify: `src/transports/json/json-transport.ts`
- Modify: `src/transports/json/json-transport-factory.ts`
- Create: `tests/unit/json/json-http-client.test.ts`

- [ ] **Step 1: Write the failing JSON timeout tests**

Add tests that verify:

- `JsonHttpClient` aborts fetch when `timeoutMs` elapses
- JSON transport forwards shared `RequestOptions`
- default request timeout from `CantonClientOptions` applies when no per-call override is present

Example:

```ts
await expect(
    client.getAsync("/livez", new RequestOptions({ timeoutMs: 1 })),
).rejects.toBeInstanceOf(TimeoutError);
```

Use a fake `fetch` implementation so the test is deterministic.

- [ ] **Step 2: Run the focused JSON timeout tests to verify they fail**

Run:

```bash
rtk npm test -- tests/unit/json/json-http-client.test.ts
```

Expected:

- `FAIL`
- JSON HTTP client does not accept timeout options
- no timeout cancellation or SDK timeout error mapping exists

- [ ] **Step 3: Implement JSON timeout resolution**

Update:

- `IJsonHttpClient` to accept an optional shared timeout or effective timeout parameter
- `JsonHttpClient` to create an `AbortController` and timer when timeout is configured
- timeout failures to map into the SDK timeout error surface
- `JsonTransport` to resolve effective timeout using the same precedence rules as gRPC
- `createJsonTransport(...)` to supply client-level default timeout context

- [ ] **Step 4: Run the focused JSON timeout tests to verify they pass**

Run:

```bash
rtk npm test -- tests/unit/json/json-http-client.test.ts
```

Expected:

- `PASS`

- [ ] **Step 5: Commit**

```bash
git add src/transports/json/json-http-client.ts src/transports/json/json-transport.ts src/transports/json/json-transport-factory.ts tests/unit/json/json-http-client.test.ts
git commit -m "feat: add json request timeout support"
```

## Task 5: Run Cross-Surface Regression Verification

**Files:**
- Review: `src/index.ts`
- Review: `src/core/transports/transport.interface.ts`
- Review: `src/transports/grpc/grpc-call-options-factory.ts`
- Review: `src/transports/json/json-http-client.ts`
- Review: `tests/unit/services/*.test.ts`
- Review: `tests/unit/grpc/grpc-channel-factory.test.ts`
- Review: `tests/unit/json/json-http-client.test.ts`

- [ ] **Step 1: Run the full focused timeout regression suite**

Run:

```bash
rtk npm test -- tests/unit/core/canton-client-options.test.ts tests/unit/core/request-options.test.ts tests/unit/services/health-client.test.ts tests/unit/services/parties-client.test.ts tests/unit/services/command-submission-pipeline.test.ts tests/unit/grpc/grpc-channel-factory.test.ts tests/unit/json/json-http-client.test.ts tests/unit/smoke/package-shape.test.ts
```

Expected:

- `PASS`

- [ ] **Step 2: Run repository verification**

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
git add src tests
git commit -m "test: verify shared request timeout support"
```
