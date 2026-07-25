# Protobuf-First Public API — Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Establish the public protobuf-ts namespace and RPC inventory, then migrate the complete Update service to direct generated request/response and stream-message contracts.

**Architecture:** Phase 1 creates the evidence base for the repo-wide breaking migration: an exhaustive RPC inventory that classifies every method before any bulk deletion. It then proves the architecture in the Update vertical slice: generated protobuf-ts messages pass unchanged through the gRPC path, and JSON is explicitly unsupported unless an inventory-backed adapter exists.

**Tech Stack:** TypeScript, protobuf-ts (`@protobuf-ts/runtime`), generated Canton/Ledger API v2 bindings, Vitest.

---

### Task 1: Expose generated protobuf-ts bindings under a non-colliding public namespace

**Files:**
- Create: `src/protobuf/index.ts`
- Create: `scripts/generate-protobuf-public-barrel.mjs`
- Modify: `package.json`
- Modify: `tsconfig.json` if declaration/output inclusion requires it
- Modify: `src/index.ts` only to remove any duplicate generated root exports if discovered
- Test: `tests/unit/public/protobuf-exports.test.ts`

- [ ] **Step 1: Write a failing public-import test**

  Import `ledgerApiV2`, `canton`, `comDaml`, `comDigitalasset`, and `google` namespaces from `@distrohelena/canton-typescript-sdk/protobuf`. Assert each exposes a generated message type object with `create`, `toJson`, and `fromJson`; use `ledgerApiV2.GetUpdateByIdRequest.create({ updateId: "update-1" })` to prove the public construction API.

- [ ] **Step 2: Run the test to verify it fails**

  Run: `rtk npm test -- tests/unit/public/protobuf-exports.test.ts`

  Expected: FAIL because the `/protobuf` package export and namespace barrel do not exist.

- [ ] **Step 3: Add exhaustive namespace barrel and package export**

  Create `scripts/generate-protobuf-public-barrel.mjs` that walks all generated `.ts` files and writes a deterministic `src/protobuf/index.ts`. It must export exactly five non-colliding top-level namespaces—`ledgerApiV2` for `com/daml/ledger/api/v2`, plus `canton`, `comDaml`, `comDigitalasset`, and `google`—and nested namespace objects mirroring every remaining directory segment. It must re-export both message interfaces and `MessageType` values without a flat symbol namespace. Run this generator from `generate:grpc` and check the generated barrel into source. Add the `./protobuf` export to `package.json`, targeting `dist/protobuf/index.{js,d.ts}`. If TypeScript package-self resolution prevents the test from resolving the built subpath, add a focused Vitest alias that still exercises the source barrel and verify the packed export separately in Task 5.

- [ ] **Step 4: Run the test and build to verify they pass**

  Run: `rtk npm test -- tests/unit/public/protobuf-exports.test.ts && rtk npm run build`

  Expected: PASS.

- [ ] **Step 5: Commit**

  ```bash
  rtk git add src/protobuf/index.ts scripts/generate-protobuf-public-barrel.mjs scripts/generate-grpc-bindings.mjs package.json tsconfig.json tests/unit/public/protobuf-exports.test.ts src/index.ts
  rtk git commit -m "feat: export generated protobuf api"
  ```

### Task 2: Create the complete RPC disposition inventory

**Files:**
- Create: `docs/protobuf-rpc-inventory.md`
- Test: `tests/unit/public/protobuf-rpc-inventory.test.ts`
- Read: `src/core/transports/transport.interface.ts`
- Read: `src/transports/grpc/grpc-channel-factory.ts`
- Read: `src/transports/grpc/grpc-transport.ts`
- Read: `src/transports/json/json-transport.ts`

- [ ] **Step 1: Write a failing inventory consistency test**

  Parse the inventory's structured table/JSON code block and assert every public `ITransport` method has exactly one **public disposition** of `direct-rpc`, `high-level`, or `removed`. Assert every `direct-rpc` entry specifies generated request, unary/stream response, gRPC operation, and an independent JSON adapter/capability status (`supported` with endpoint/projection/reconstruction details, or `unsupported` with operation-specific error).

- [ ] **Step 2: Run the test to verify it fails**

  Run: `rtk npm test -- tests/unit/public/protobuf-rpc-inventory.test.ts`

  Expected: FAIL because the inventory does not exist.

- [ ] **Step 3: Build the inventory from actual public/transport operations**

  Document every `ITransport` method and every `GrpcOperations` member. Record service/RPC, generated request and response or stream element types, direct/high-level/removed public disposition, gRPC operation method, independent JSON endpoint/adapter status, and corresponding test path. Mark interactive signing/preparation and decentralized-party workflows as `high-level`; do not falsely classify composed workflows as direct RPCs. The Update service entries must nominate the exact Ledger API v2 generated types used in Task 3 and show `direct-rpc` plus JSON `unsupported` until a real adapter exists.

- [ ] **Step 4: Run the inventory test to verify it passes**

  Run: `rtk npm test -- tests/unit/public/protobuf-rpc-inventory.test.ts`

  Expected: PASS.

- [ ] **Step 5: Commit**

  ```bash
  rtk git add docs/protobuf-rpc-inventory.md tests/unit/public/protobuf-rpc-inventory.test.ts
  rtk git commit -m "docs: inventory protobuf rpc contracts"
  ```

### Task 3: Make Update service direct protobuf-ts RPCs

**Files:**
- Modify: `src/services/update/update-service-client.ts`
- Modify: `src/core/transports/transport.interface.ts`
- Modify: `src/transports/grpc/grpc-channel-factory.ts`
- Modify: `src/transports/grpc/grpc-transport.ts`
- Modify: `src/client/service-registry.ts`
- Modify: `src/debugger/replay/replay-update-loader.ts`
- Modify: `src/transports/grpc/mappers/events-mapper.ts`
- Delete: `src/core/types/requests/get-update-by-id-request.ts`
- Delete: `src/core/types/requests/get-update-by-offset-request.ts`
- Delete: `src/core/types/requests/get-update-by-hash-request.ts`
- Delete: `src/core/types/requests/get-updates-page-request.ts`
- Delete: `src/core/types/requests/get-updates-request.ts`
- Delete: `src/core/types/responses/get-update-by-id-response.ts`
- Delete: `src/core/types/responses/get-update-by-offset-response.ts`
- Delete: `src/core/types/responses/get-update-by-hash-response.ts`
- Delete: `src/core/types/responses/get-updates-page-response.ts`
- Delete or reduce: `src/transports/grpc/mappers/update-read-mapper.ts`
- Modify: `src/index.ts`
- Test: `tests/unit/grpc/grpc-update-read-mapper.test.ts` or its existing equivalent
- Test: `tests/unit/services/update-service-client.test.ts` or create it
- Test: affected debugger/replay, contract ledger-read, gRPC batch, JSON batch, command-runtime, and fake-`GrpcOperations` fixtures identified by the compiler

- [ ] **Step 1: Write failing direct-response tests**

  Import generated Update service messages through the new protobuf namespace. Assert `getUpdateByIdAsync`, offset, and hash accept generated request messages and return the exact generated `GetUpdateResponse` reference, including `update.oneofKind`. Assert page lookup returns generated `GetUpdatesPageResponse`. Add a failing direct stream test that checks `for await` receives each original `GetUpdatesResponse` object in channel order (same object references), can stop early via iterator return/disposal, and receives channel errors unchanged. Update fake `GrpcOperations` to provide an async iterable rather than a collected response array.

- [ ] **Step 2: Run the focused tests to verify they fail**

  Run: `rtk npm test -- tests/unit/grpc/grpc-update-read-mapper.test.ts tests/unit/services/update-service-client.test.ts`

  Expected: FAIL because public APIs use SDK DTOs, map update variants to `unknown`, and streams use an observer.

- [ ] **Step 3: Remove Update DTO/mapping layer and type operations**

  Change Update service and transport signatures to the generated `GetUpdateByIdRequest`, `GetUpdateByOffsetRequest`, `GetUpdateByHashRequest`, `GetUpdatesPageRequest`, `GetUpdateResponse`, `GetUpdatesPageResponse`, `GetUpdatesRequest`, and `GetUpdatesResponse` types. Return unary/channel payload references unchanged. Replace collected `Promise<GetUpdatesResponse[]>` stream operations with a typed `AsyncIterable<GetUpdatesResponse>` operation (rename it to match `getUpdatesAsync`); return the channel response iterable directly, preserving cancellation/disposal and errors. Remove the observer DTO adapter and obsolete `mapGrpcStreamTransactionsRequest` only after every dependent caller has moved. Delete obsolete Update request/response classes, root exports, and mapper functions that only project fields. Update all listed production/test call sites in this same task until the build is green.

- [ ] **Step 4: Run focused tests and build to verify they pass**

  Run: `rtk npm test -- tests/unit/grpc/grpc-update-read-mapper.test.ts tests/unit/services/update-service-client.test.ts && rtk npm run build`

  Expected: PASS.

- [ ] **Step 5: Commit**

  ```bash
  rtk git add -A
  rtk git commit -m "refactor: expose protobuf update service"
  ```

### Task 4: Classify and enforce JSON Update-service capability

**Files:**
- Modify: `src/transports/json/json-transport.ts`
- Modify: `src/transports/json/json-ledger-client.ts` if it exposes Update service methods
- Modify: `docs/protobuf-rpc-inventory.md`
- Test: `tests/unit/json/json-update-service.test.ts`

- [ ] **Step 1: Write failing JSON capability tests**

  For each Update RPC classified as public `direct-rpc` but JSON-adapter `unsupported` in the inventory, invoke the generated-message public method through JSON transport and assert the existing `NotSupportedError` with an operation-specific message. Do not test an invented JSON DTO conversion.

- [ ] **Step 2: Run the test to verify it fails**

  Run: `rtk npm test -- tests/unit/json/json-update-service.test.ts`

  Expected: FAIL until JSON transport’s method signatures accept generated Update requests and report the documented capability consistently.

- [ ] **Step 3: Align JSON transport signatures and capability errors**

  Update method types to generated requests/responses while preserving explicit rejection for unsupported Update RPCs. Mark the inventory status and exact error behavior; do not add an unsafe generic protobuf-JSON encoder.

- [ ] **Step 4: Run test and build to verify they pass**

  Run: `rtk npm test -- tests/unit/json/json-update-service.test.ts && rtk npm run build`

  Expected: PASS.

- [ ] **Step 5: Commit**

  ```bash
  rtk git add src/transports/json docs/protobuf-rpc-inventory.md tests/unit/json/json-update-service.test.ts
  rtk git commit -m "refactor: classify json update rpc support"
  ```

### Task 5: Package and regression verification

**Files:**
- Modify: documentation only if verification finds stale Update DTO examples

- [ ] **Step 1: Verify the published export surface**

  Run: `rtk npm run build && rtk npm run verify:pack && rtk npm pack --json`

  Expected: PASS; update `scripts/verify-npm-pack.mjs` and its tests to require the `./protobuf` export, then unpack the tarball into a temporary directory and dynamically import `@distrohelena/canton-typescript-sdk/protobuf` from that package. Assert `ledgerApiV2.GetUpdateByIdRequest.create` is present and usable, and that generated runtime files are included.

- [ ] **Step 2: Run all unit tests**

  Run: `rtk npm run test:unit`

  Expected: PASS.

- [ ] **Step 3: Run the direct-Update legacy audit**

  Run: `rtk test ! -e src/core/types/requests/get-update-by-id-request.ts && rtk test ! -e src/core/types/requests/get-update-by-offset-request.ts && rtk test ! -e src/core/types/requests/get-update-by-hash-request.ts && rtk test ! -e src/core/types/requests/get-updates-page-request.ts && rtk test ! -e src/core/types/requests/get-updates-request.ts && rtk rg -n 'core/types/(requests|responses)/get-update|mapGrpcGetUpdate|mapGrpcStreamTransactionsRequest' src tests --glob '*.ts' -g '!src/transports/grpc/generated/**'`

  Expected: all deleted paths are absent and ripgrep finds no SDK Update DTO imports or lossy/legacy mapper symbol outside explicitly documented migration history.

- [ ] **Step 4: Commit verification corrections if needed**

  ```bash
  rtk git add -A
  rtk git commit -m "test: verify protobuf update api"
  ```

## Follow-on Plans

After Phase 1, use the committed inventory to create and execute separate plans for command/completion (including high-level signing classification), event/transaction/contracts, identity/party/user/package, and Canton administration. Each follow-on plan must remove the corresponding direct-RPC DTOs rather than carrying them forward.
