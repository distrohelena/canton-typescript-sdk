# Canton Wallet Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first working `canton-wallet` desktop foundation in `/home/helena/env/daml/canton-wallet` with Electron, Vue, an embedded NestJS backend, SQLite-backed wallet persistence, multi-wallet support, wallet-local multi-node bindings, a first-run wizard, and a wallet shell backed by placeholder home projections.

**Architecture:** Create a new `pnpm` monorepo with `apps/desktop`, `apps/ui`, `apps/backend`, `packages/shared`, and `packages/sdk-adapter`. Vue talks only to a typed preload bridge, preload uses Electron IPC, Electron forwards wallet-domain operations to the embedded Nest backend over loopback HTTP, and the backend uses a thin adapter over the local `canton-typescript-sdk` package for gRPC node probing and bounded discovery.

**Tech Stack:** `pnpm` workspaces, TypeScript, Electron, Vue 3, Vite, NestJS, SQLite, Vitest, Supertest, local `canton-typescript-sdk` file dependency

---

## File Structure

**Repository Root:** `/home/helena/env/daml/canton-wallet`

### Workspace and toolchain bootstrap

- Create: `package.json`
- Create: `pnpm-workspace.yaml`
- Create: `tsconfig.base.json`
- Create: `.gitignore`
- Create: `.npmrc`
- Create: `README.md`

### Shared wallet-domain contracts

- Create: `packages/shared/package.json`
- Create: `packages/shared/tsconfig.json`
- Create: `packages/shared/src/index.ts`
- Create: `packages/shared/src/contracts/wallet-ipc.ts`
- Create: `packages/shared/src/contracts/wallet-http.ts`
- Create: `packages/shared/src/domain/wallet-summary.ts`
- Create: `packages/shared/src/domain/node-connection-summary.ts`
- Create: `packages/shared/src/domain/home-snapshot.ts`
- Create: `packages/shared/src/domain/onboarding-state.ts`
- Create: `packages/shared/src/errors/wallet-error-code.ts`
- Create: `packages/shared/src/errors/wallet-error.ts`
- Create: `packages/shared/tests/shared-contracts.test.ts`

### Electron shell and preload bridge

- Create: `apps/desktop/package.json`
- Create: `apps/desktop/tsconfig.json`
- Create: `apps/desktop/src/main/main.ts`
- Create: `apps/desktop/src/main/create-main-window.ts`
- Create: `apps/desktop/src/main/backend-runtime.ts`
- Create: `apps/desktop/src/main/wallet-backend-client.ts`
- Create: `apps/desktop/src/main/ipc/register-wallet-ipc.ts`
- Create: `apps/desktop/src/preload/preload.ts`
- Create: `apps/desktop/tests/preload-contract.test.ts`
- Create: `apps/desktop/tests/backend-runtime.test.ts`

### Embedded Nest backend foundation

- Create: `apps/backend/package.json`
- Create: `apps/backend/tsconfig.json`
- Create: `apps/backend/src/main.ts`
- Create: `apps/backend/src/app.module.ts`
- Create: `apps/backend/src/config/backend-config.ts`
- Create: `apps/backend/src/config/workspace-paths.ts`
- Create: `apps/backend/src/http/health.controller.ts`
- Create: `apps/backend/test/app.e2e-spec.ts`

### SQLite workspace persistence

- Create: `apps/backend/src/persistence/sqlite/sqlite-database.ts`
- Create: `apps/backend/src/persistence/sqlite/workspace-schema.ts`
- Create: `apps/backend/src/persistence/file-cache/file-cache-root.ts`
- Create: `apps/backend/src/persistence/repositories/wallet.repository.ts`
- Create: `apps/backend/src/persistence/repositories/node-connection.repository.ts`
- Create: `apps/backend/src/persistence/repositories/wallet-node-binding.repository.ts`
- Create: `apps/backend/src/persistence/repositories/onboarding-state.repository.ts`
- Create: `apps/backend/src/persistence/repositories/settings.repository.ts`
- Create: `apps/backend/src/persistence/repositories/home-snapshot.repository.ts`
- Create: `apps/backend/tests/persistence/workspace-schema.test.ts`
- Create: `apps/backend/tests/persistence/wallet-repository.test.ts`
- Create: `apps/backend/tests/persistence/onboarding-state-repository.test.ts`
- Create: `apps/backend/tests/persistence/file-cache-root.test.ts`

### SDK adapter and node probing

- Create: `packages/sdk-adapter/package.json`
- Create: `packages/sdk-adapter/tsconfig.json`
- Create: `packages/sdk-adapter/src/index.ts`
- Create: `packages/sdk-adapter/src/sdk-client-factory.ts`
- Create: `packages/sdk-adapter/src/node-capability-probe.ts`
- Create: `packages/sdk-adapter/src/bounded-party-discovery.ts`
- Create: `packages/sdk-adapter/src/package-readiness-probe.ts`
- Create: `packages/sdk-adapter/tests/node-capability-probe.test.ts`
- Create: `packages/sdk-adapter/tests/bounded-party-discovery.test.ts`

### Backend wallet-domain modules

- Create: `apps/backend/src/modules/wallets/wallets.module.ts`
- Create: `apps/backend/src/modules/wallets/wallets.controller.ts`
- Create: `apps/backend/src/modules/wallets/wallets.service.ts`
- Create: `apps/backend/src/modules/node-connections/node-connections.module.ts`
- Create: `apps/backend/src/modules/node-connections/node-connections.controller.ts`
- Create: `apps/backend/src/modules/node-connections/node-connections.service.ts`
- Create: `apps/backend/src/modules/onboarding/onboarding.module.ts`
- Create: `apps/backend/src/modules/onboarding/onboarding.controller.ts`
- Create: `apps/backend/src/modules/onboarding/onboarding.service.ts`
- Create: `apps/backend/src/modules/home/home.module.ts`
- Create: `apps/backend/src/modules/home/home.controller.ts`
- Create: `apps/backend/src/modules/home/home.service.ts`
- Create: `apps/backend/src/modules/activity/activity.module.ts`
- Create: `apps/backend/src/modules/activity/activity.controller.ts`
- Create: `apps/backend/src/modules/settings/settings.module.ts`
- Create: `apps/backend/src/modules/settings/settings.controller.ts`
- Create: `apps/backend/src/modules/settings/settings.service.ts`
- Create: `apps/backend/tests/modules/wallets.service.test.ts`
- Create: `apps/backend/tests/modules/node-connections.service.test.ts`
- Create: `apps/backend/tests/modules/onboarding.service.test.ts`
- Create: `apps/backend/tests/modules/home.service.test.ts`

### Vue wallet UI and navigation

- Create: `apps/ui/package.json`
- Create: `apps/ui/tsconfig.json`
- Create: `apps/ui/vite.config.ts`
- Create: `apps/ui/src/main.ts`
- Create: `apps/ui/src/App.vue`
- Create: `apps/ui/src/router/index.ts`
- Create: `apps/ui/src/layouts/wallet-shell-layout.vue`
- Create: `apps/ui/src/views/home-view.vue`
- Create: `apps/ui/src/views/wallets-view.vue`
- Create: `apps/ui/src/views/nodes-view.vue`
- Create: `apps/ui/src/views/activity-view.vue`
- Create: `apps/ui/src/views/settings-view.vue`
- Create: `apps/ui/src/views/onboarding/onboarding-view.vue`
- Create: `apps/ui/src/views/onboarding/steps/welcome-step.vue`
- Create: `apps/ui/src/views/onboarding/steps/create-wallet-step.vue`
- Create: `apps/ui/src/views/onboarding/steps/add-nodes-step.vue`
- Create: `apps/ui/src/views/onboarding/steps/verify-nodes-step.vue`
- Create: `apps/ui/src/views/onboarding/steps/discovery-step.vue`
- Create: `apps/ui/src/components/navigation/main-nav.vue`
- Create: `apps/ui/src/components/home/node-status-cards.vue`
- Create: `apps/ui/src/components/home/placeholder-balance-cards.vue`
- Create: `apps/ui/src/components/home/placeholder-activity-list.vue`
- Create: `apps/ui/src/services/wallet-desktop-client.ts`
- Create: `apps/ui/tests/onboarding-view.test.ts`
- Create: `apps/ui/tests/wallet-shell-layout.test.ts`
- Create: `apps/ui/tests/home-view.test.ts`

### Integration and developer scripts

- Create: `scripts/dev.mjs`
- Create: `scripts/test-backend.mjs`
- Create: `scripts/test-ui.mjs`
- Create: `scripts/test-desktop.mjs`
- Create: `README.md`

## Task 1: Bootstrap The New Monorepo

**Files:**
- Create: `/home/helena/env/daml/canton-wallet/package.json`
- Create: `/home/helena/env/daml/canton-wallet/pnpm-workspace.yaml`
- Create: `/home/helena/env/daml/canton-wallet/tsconfig.base.json`
- Create: `/home/helena/env/daml/canton-wallet/.gitignore`
- Create: `/home/helena/env/daml/canton-wallet/.npmrc`
- Create: `/home/helena/env/daml/canton-wallet/README.md`

- [ ] **Step 1: Run the missing-workspace check to verify the repo does not exist yet**

Run:

```bash
rtk test -d /home/helena/env/daml/canton-wallet
```

Expected:

- non-zero or falsey result showing the target directory does not exist yet

- [ ] **Step 2: Create the root monorepo scaffold**

Implement:

- root `package.json` with `pnpm` workspace scripts
- `pnpm-workspace.yaml`
- base TypeScript config
- `.gitignore` for `node_modules`, build output, SQLite artifacts, and Electron packaging output
- `README.md` with setup and workspace layout

Use a local file dependency strategy later through package-level manifests rather than root-only aliases.

- [ ] **Step 3: Run the root workspace sanity commands**

Run:

```bash
rtk pnpm -C /home/helena/env/daml/canton-wallet install
rtk pnpm -C /home/helena/env/daml/canton-wallet build
```

Expected:

- workspace installs successfully
- placeholder build command executes without missing-root-config failures

- [ ] **Step 4: Commit**

```bash
git -C /home/helena/env/daml/canton-wallet add package.json pnpm-workspace.yaml tsconfig.base.json .gitignore .npmrc README.md
git -C /home/helena/env/daml/canton-wallet commit -m "chore: bootstrap canton wallet workspace"
```

## Task 2: Add Shared Wallet-Domain Contracts

**Files:**
- Create: `/home/helena/env/daml/canton-wallet/packages/shared/package.json`
- Create: `/home/helena/env/daml/canton-wallet/packages/shared/tsconfig.json`
- Create: `/home/helena/env/daml/canton-wallet/packages/shared/src/index.ts`
- Create: `/home/helena/env/daml/canton-wallet/packages/shared/src/contracts/wallet-ipc.ts`
- Create: `/home/helena/env/daml/canton-wallet/packages/shared/src/contracts/wallet-http.ts`
- Create: `/home/helena/env/daml/canton-wallet/packages/shared/src/domain/wallet-summary.ts`
- Create: `/home/helena/env/daml/canton-wallet/packages/shared/src/domain/node-connection-summary.ts`
- Create: `/home/helena/env/daml/canton-wallet/packages/shared/src/domain/home-snapshot.ts`
- Create: `/home/helena/env/daml/canton-wallet/packages/shared/src/domain/onboarding-state.ts`
- Create: `/home/helena/env/daml/canton-wallet/packages/shared/src/errors/wallet-error-code.ts`
- Create: `/home/helena/env/daml/canton-wallet/packages/shared/src/errors/wallet-error.ts`
- Create: `/home/helena/env/daml/canton-wallet/packages/shared/tests/shared-contracts.test.ts`

- [ ] **Step 1: Write the failing shared-contract tests**

Add tests asserting:

```ts
expect(WalletErrorCode.nodeUnreachable).toBe("nodeUnreachable");
expect(WalletErrorCode.authenticationRequired).toBe("authenticationRequired");
expect(WalletErrorCode.capabilityUnavailable).toBe("capabilityUnavailable");
expect(WalletErrorCode.walletBindingIncomplete).toBe("walletBindingIncomplete");
expect(WalletErrorCode.onboardingIncomplete).toBe("onboardingIncomplete");
expect(WalletErrorCode.workspaceCorrupted).toBe("workspaceCorrupted");
```

Also assert the preload-facing operations exist as named contract entries:

```ts
expect(walletDesktopOperations).toContain("createWallet");
expect(walletDesktopOperations).toContain("getWalletHome");
expect(walletDesktopOperations).toContain("setActiveWallet");
expect(walletDesktopOperations).toContain("addNodeConnection");
expect(walletDesktopOperations).toContain("retryNodeVerification");
```

Add error payload assertions:

```ts
expect(new WalletError({
    code: WalletErrorCode.nodeUnreachable,
    operatorMessage: "Node is unreachable",
    remediation: "Check the endpoint and network path.",
})).toMatchObject({
    code: WalletErrorCode.nodeUnreachable,
});
```

- [ ] **Step 2: Run the shared package tests to verify they fail**

Run:

```bash
rtk pnpm -C /home/helena/env/daml/canton-wallet --filter @canton-wallet/shared test
```

Expected:

- `FAIL`
- missing shared package files and exports

- [ ] **Step 3: Implement the shared package**

Create:

- wallet-domain DTOs
- IPC contract names and payload types
- backend HTTP DTO types
- stable wallet error codes
- typed wallet errors with operator-facing message and remediation text
- an explicit inventory of the preload/IPC operations used by later backend and UI tasks

Keep the contracts wallet-domain-oriented, not Canton-service-oriented.

- [ ] **Step 4: Run the shared package tests to verify they pass**

Run:

```bash
rtk pnpm -C /home/helena/env/daml/canton-wallet --filter @canton-wallet/shared test
```

Expected:

- `PASS`

- [ ] **Step 5: Commit**

```bash
git -C /home/helena/env/daml/canton-wallet add packages/shared
git -C /home/helena/env/daml/canton-wallet commit -m "feat: add shared wallet domain contracts"
```

## Task 3: Build The Electron Shell And Preload Bridge

**Files:**
- Create: `/home/helena/env/daml/canton-wallet/apps/desktop/package.json`
- Create: `/home/helena/env/daml/canton-wallet/apps/desktop/tsconfig.json`
- Create: `/home/helena/env/daml/canton-wallet/apps/desktop/src/main/main.ts`
- Create: `/home/helena/env/daml/canton-wallet/apps/desktop/src/main/create-main-window.ts`
- Create: `/home/helena/env/daml/canton-wallet/apps/desktop/src/main/backend-runtime.ts`
- Create: `/home/helena/env/daml/canton-wallet/apps/desktop/src/main/wallet-backend-client.ts`
- Create: `/home/helena/env/daml/canton-wallet/apps/desktop/src/main/ipc/register-wallet-ipc.ts`
- Create: `/home/helena/env/daml/canton-wallet/apps/desktop/src/preload/preload.ts`
- Create: `/home/helena/env/daml/canton-wallet/apps/desktop/tests/preload-contract.test.ts`
- Create: `/home/helena/env/daml/canton-wallet/apps/desktop/tests/backend-runtime.test.ts`

- [ ] **Step 1: Write the failing desktop bridge tests**

Add tests asserting:

```ts
expect(window.cantonWallet.createWallet).toBeTypeOf("function");
expect(window.cantonWallet.getWalletHome).toBeTypeOf("function");
```

Add a main-process test that expects backend lifecycle helpers:

```ts
expect(startBackendRuntime).toBeTypeOf("function");
expect(stopBackendRuntime).toBeTypeOf("function");
```

- [ ] **Step 2: Run the desktop tests to verify they fail**

Run:

```bash
rtk pnpm -C /home/helena/env/daml/canton-wallet --filter @canton-wallet/desktop test
```

Expected:

- `FAIL`
- missing preload bridge and backend runtime files

- [ ] **Step 3: Implement the desktop app skeleton**

Implement:

- Electron main startup
- preload bridge exposing typed wallet-domain methods
- IPC registration in the main process
- backend runtime launcher abstraction
- loopback backend client wrapper used only by the main process

Do not let the preload expose generic `invoke(channel, payload)` helpers.

- [ ] **Step 4: Run the desktop tests to verify they pass**

Run:

```bash
rtk pnpm -C /home/helena/env/daml/canton-wallet --filter @canton-wallet/desktop test
```

Expected:

- `PASS`

- [ ] **Step 5: Commit**

```bash
git -C /home/helena/env/daml/canton-wallet add apps/desktop
git -C /home/helena/env/daml/canton-wallet commit -m "feat: add electron shell and preload bridge"
```

## Task 4: Bootstrap The Embedded Nest Backend

**Files:**
- Create: `/home/helena/env/daml/canton-wallet/apps/backend/package.json`
- Create: `/home/helena/env/daml/canton-wallet/apps/backend/tsconfig.json`
- Create: `/home/helena/env/daml/canton-wallet/apps/backend/src/main.ts`
- Create: `/home/helena/env/daml/canton-wallet/apps/backend/src/app.module.ts`
- Create: `/home/helena/env/daml/canton-wallet/apps/backend/src/config/backend-config.ts`
- Create: `/home/helena/env/daml/canton-wallet/apps/backend/src/config/workspace-paths.ts`
- Create: `/home/helena/env/daml/canton-wallet/apps/backend/src/http/health.controller.ts`
- Create: `/home/helena/env/daml/canton-wallet/apps/backend/test/app.e2e-spec.ts`

- [ ] **Step 1: Write the failing backend bootstrap test**

Add a Supertest-based e2e assertion:

```ts
await request(app.getHttpServer())
    .get("/health")
    .expect(200)
    .expect({ status: "ok" });
```

- [ ] **Step 2: Run the backend e2e test to verify it fails**

Run:

```bash
rtk pnpm -C /home/helena/env/daml/canton-wallet --filter @canton-wallet/backend test
```

Expected:

- `FAIL`
- backend app and health route missing

- [ ] **Step 3: Implement the embedded backend bootstrap**

Create:

- Nest bootstrap entry point
- config for loopback host and dynamic port
- workspace path resolution for the SQLite file and file-cache root
- minimal `AppModule`
- `/health` route

The backend should be runnable headlessly before Electron integration goes further.

- [ ] **Step 4: Run the backend e2e test to verify it passes**

Run:

```bash
rtk pnpm -C /home/helena/env/daml/canton-wallet --filter @canton-wallet/backend test
```

Expected:

- `PASS`

- [ ] **Step 5: Commit**

```bash
git -C /home/helena/env/daml/canton-wallet add apps/backend
git -C /home/helena/env/daml/canton-wallet commit -m "feat: bootstrap embedded nest backend"
```

## Task 5: Add SQLite Workspace Persistence

**Files:**
- Create: `/home/helena/env/daml/canton-wallet/apps/backend/src/persistence/sqlite/sqlite-database.ts`
- Create: `/home/helena/env/daml/canton-wallet/apps/backend/src/persistence/sqlite/workspace-schema.ts`
- Create: `/home/helena/env/daml/canton-wallet/apps/backend/src/persistence/file-cache/file-cache-root.ts`
- Create: `/home/helena/env/daml/canton-wallet/apps/backend/src/persistence/repositories/wallet.repository.ts`
- Create: `/home/helena/env/daml/canton-wallet/apps/backend/src/persistence/repositories/node-connection.repository.ts`
- Create: `/home/helena/env/daml/canton-wallet/apps/backend/src/persistence/repositories/wallet-node-binding.repository.ts`
- Create: `/home/helena/env/daml/canton-wallet/apps/backend/src/persistence/repositories/onboarding-state.repository.ts`
- Create: `/home/helena/env/daml/canton-wallet/apps/backend/src/persistence/repositories/settings.repository.ts`
- Create: `/home/helena/env/daml/canton-wallet/apps/backend/src/persistence/repositories/home-snapshot.repository.ts`
- Create: `/home/helena/env/daml/canton-wallet/apps/backend/tests/persistence/workspace-schema.test.ts`
- Create: `/home/helena/env/daml/canton-wallet/apps/backend/tests/persistence/wallet-repository.test.ts`
- Create: `/home/helena/env/daml/canton-wallet/apps/backend/tests/persistence/onboarding-state-repository.test.ts`
- Create: `/home/helena/env/daml/canton-wallet/apps/backend/tests/persistence/file-cache-root.test.ts`

- [ ] **Step 1: Write the failing persistence tests**

Add tests that:

```ts
await repository.createWallet({ id: "w1", name: "Treasury" });
expect(await repository.listWallets()).toHaveLength(1);
expect((await repository.getWorkspaceState()).activeWalletId).toBe("w1");
```

Also assert node connections are wallet-owned in Phase 1:

```ts
expect(await repository.listNodeConnections("wallet-a")).not.toEqual(
    await repository.listNodeConnections("wallet-b"),
);
```

Add onboarding-state persistence coverage:

```ts
await onboardingStateRepository.saveProgress({
    walletId: "w1",
    currentStep: "verifyNodes",
});

expect(await onboardingStateRepository.getByWalletId("w1")).toMatchObject({
    currentStep: "verifyNodes",
});
```

Add file-cache root coverage:

```ts
expect(await ensureFileCacheRootAsync()).toMatchObject({
    exists: true,
});
```

- [ ] **Step 2: Run the persistence tests to verify they fail**

Run:

```bash
rtk pnpm -C /home/helena/env/daml/canton-wallet --filter @canton-wallet/backend test -- persistence
```

Expected:

- `FAIL`
- missing schema and repository implementations

- [ ] **Step 3: Implement the SQLite schema and repositories**

Implement tables and repositories for:

- workspace state with `activeWalletId`
- wallets
- wallet-owned node connections
- wallet-node bindings
- onboarding state and wizard progress
- settings
- per-node discovery snapshots
- per-wallet home snapshots

Implement the file-cache boundary too:

- deterministic workspace cache root path
- creation of the cache directory at startup or first persistence use
- one place to resolve later interface-artifact and snapshot cache paths

Persist the full Phase 1 node placeholder fields as structured columns:

- `displayName`
- `transportKind`
- `grpcSecurity`
- `adminEndpoint`
- `publicEndpoint`
- `authMode`
- `notes`
- `oidcAudience?`
- `oidcClientId?`
- `tokenMetadata?`

Keep schema boundaries explicit instead of serializing the whole workspace as one blob.

- [ ] **Step 4: Run the persistence tests to verify they pass**

Run:

```bash
rtk pnpm -C /home/helena/env/daml/canton-wallet --filter @canton-wallet/backend test -- persistence
```

Expected:

- `PASS`

- [ ] **Step 5: Commit**

```bash
git -C /home/helena/env/daml/canton-wallet add apps/backend/src/persistence apps/backend/tests/persistence
git -C /home/helena/env/daml/canton-wallet commit -m "feat: add wallet workspace persistence"
```

## Task 6: Add The SDK Adapter And Node Probing

**Files:**
- Create: `/home/helena/env/daml/canton-wallet/packages/sdk-adapter/package.json`
- Create: `/home/helena/env/daml/canton-wallet/packages/sdk-adapter/tsconfig.json`
- Create: `/home/helena/env/daml/canton-wallet/packages/sdk-adapter/src/index.ts`
- Create: `/home/helena/env/daml/canton-wallet/packages/sdk-adapter/src/sdk-client-factory.ts`
- Create: `/home/helena/env/daml/canton-wallet/packages/sdk-adapter/src/node-capability-probe.ts`
- Create: `/home/helena/env/daml/canton-wallet/packages/sdk-adapter/src/bounded-party-discovery.ts`
- Create: `/home/helena/env/daml/canton-wallet/packages/sdk-adapter/src/package-readiness-probe.ts`
- Create: `/home/helena/env/daml/canton-wallet/packages/sdk-adapter/tests/node-capability-probe.test.ts`
- Create: `/home/helena/env/daml/canton-wallet/packages/sdk-adapter/tests/bounded-party-discovery.test.ts`

- [ ] **Step 1: Write the failing SDK adapter tests**

Add tests asserting:

```ts
expect(await probeNodeAsync(connection)).toMatchObject({
    healthy: true,
    ledgerApiVersion: "3.4.0",
});

expect(await discoverKnownPartiesAsync(connection)).toHaveProperty("parties");
expect(result.parties.length).toBeLessThanOrEqual(20);
```

- [ ] **Step 2: Run the SDK adapter tests to verify they fail**

Run:

```bash
rtk pnpm -C /home/helena/env/daml/canton-wallet --filter @canton-wallet/sdk-adapter test
```

Expected:

- `FAIL`
- missing SDK adapter package and probe logic

- [ ] **Step 3: Implement the SDK adapter**

Implement:

- local file dependency on `../../../typescript-sdk`
- client factory building gRPC SDK clients from wallet-owned node settings
- health and version probe
- bounded known-party discovery capped at `20`
- package readiness probe using ledger package visibility

Normalize outputs into wallet-domain probe models instead of returning SDK DTOs directly.

- [ ] **Step 4: Run the SDK adapter tests to verify they pass**

Run:

```bash
rtk pnpm -C /home/helena/env/daml/canton-wallet --filter @canton-wallet/sdk-adapter test
```

Expected:

- `PASS`

- [ ] **Step 5: Commit**

```bash
git -C /home/helena/env/daml/canton-wallet add packages/sdk-adapter
git -C /home/helena/env/daml/canton-wallet commit -m "feat: add canton sdk adapter and node probes"
```

## Task 7: Implement Wallet, Node, Onboarding, Home, Activity, And Settings Modules

**Files:**
- Create: `/home/helena/env/daml/canton-wallet/apps/backend/src/modules/wallets/wallets.module.ts`
- Create: `/home/helena/env/daml/canton-wallet/apps/backend/src/modules/wallets/wallets.controller.ts`
- Create: `/home/helena/env/daml/canton-wallet/apps/backend/src/modules/wallets/wallets.service.ts`
- Create: `/home/helena/env/daml/canton-wallet/apps/backend/src/modules/node-connections/node-connections.module.ts`
- Create: `/home/helena/env/daml/canton-wallet/apps/backend/src/modules/node-connections/node-connections.controller.ts`
- Create: `/home/helena/env/daml/canton-wallet/apps/backend/src/modules/node-connections/node-connections.service.ts`
- Create: `/home/helena/env/daml/canton-wallet/apps/backend/src/modules/onboarding/onboarding.module.ts`
- Create: `/home/helena/env/daml/canton-wallet/apps/backend/src/modules/onboarding/onboarding.controller.ts`
- Create: `/home/helena/env/daml/canton-wallet/apps/backend/src/modules/onboarding/onboarding.service.ts`
- Create: `/home/helena/env/daml/canton-wallet/apps/backend/src/modules/home/home.module.ts`
- Create: `/home/helena/env/daml/canton-wallet/apps/backend/src/modules/home/home.controller.ts`
- Create: `/home/helena/env/daml/canton-wallet/apps/backend/src/modules/home/home.service.ts`
- Create: `/home/helena/env/daml/canton-wallet/apps/backend/src/modules/activity/activity.module.ts`
- Create: `/home/helena/env/daml/canton-wallet/apps/backend/src/modules/activity/activity.controller.ts`
- Create: `/home/helena/env/daml/canton-wallet/apps/backend/src/modules/settings/settings.module.ts`
- Create: `/home/helena/env/daml/canton-wallet/apps/backend/src/modules/settings/settings.controller.ts`
- Create: `/home/helena/env/daml/canton-wallet/apps/backend/src/modules/settings/settings.service.ts`
- Create: `/home/helena/env/daml/canton-wallet/apps/backend/tests/modules/wallets.service.test.ts`
- Create: `/home/helena/env/daml/canton-wallet/apps/backend/tests/modules/node-connections.service.test.ts`
- Create: `/home/helena/env/daml/canton-wallet/apps/backend/tests/modules/onboarding.service.test.ts`
- Create: `/home/helena/env/daml/canton-wallet/apps/backend/tests/modules/home.service.test.ts`

- [ ] **Step 1: Write the failing wallet-domain module tests**

Add tests that cover:

```ts
expect(await walletsService.createWallet({ name: "Ops" })).toMatchObject({
    name: "Ops",
});

expect(await walletsService.setActiveWallet(walletId)).toMatchObject({
    activeWalletId: walletId,
});

expect(await onboardingService.finalizeAsync(...)).toMatchObject({
    success: true,
});
```

Also assert the multi-node onboarding rule:

```ts
expect(result.success).toBe(true);
expect(result.failedNodeCount).toBeGreaterThanOrEqual(0);
expect(result.healthyNodeCount).toBeGreaterThanOrEqual(1);
```

Also assert that discovery runs on every healthy entered node and that failed nodes are still persisted:

```ts
expect(result.discoveredNodeIds).toEqual(["node-a", "node-b"]);
expect(result.failedNodeIds).toContain("node-c");
expect(result.nodeStatuses).toHaveLength(3);
```

- [ ] **Step 2: Run the backend module tests to verify they fail**

Run:

```bash
rtk pnpm -C /home/helena/env/daml/canton-wallet --filter @canton-wallet/backend test -- modules
```

Expected:

- `FAIL`
- missing wallet-domain services and controllers

- [ ] **Step 3: Implement the wallet-domain modules**

Implement:

- wallet creation, listing, renaming, and active-wallet switching
- wallet-local node CRUD and unbind flows
- shortened additional-wallet onboarding flow
- onboarding success rule of at least one healthy discovered node
- discovery on every healthy entered node
- explicit persisted status for failed or degraded nodes
- per-node discovery persistence and per-wallet home snapshot aggregation
- placeholder `Activity` and minimal `Settings` endpoints

Do not expose Canton-shaped routes.

- [ ] **Step 4: Run the backend module tests to verify they pass**

Run:

```bash
rtk pnpm -C /home/helena/env/daml/canton-wallet --filter @canton-wallet/backend test -- modules
```

Expected:

- `PASS`

- [ ] **Step 5: Commit**

```bash
git -C /home/helena/env/daml/canton-wallet add apps/backend/src/modules apps/backend/tests/modules
git -C /home/helena/env/daml/canton-wallet commit -m "feat: add wallet domain backend modules"
```

## Task 8: Build The Vue Onboarding Flow

**Files:**
- Create: `/home/helena/env/daml/canton-wallet/apps/ui/package.json`
- Create: `/home/helena/env/daml/canton-wallet/apps/ui/tsconfig.json`
- Create: `/home/helena/env/daml/canton-wallet/apps/ui/vite.config.ts`
- Create: `/home/helena/env/daml/canton-wallet/apps/ui/src/main.ts`
- Create: `/home/helena/env/daml/canton-wallet/apps/ui/src/App.vue`
- Create: `/home/helena/env/daml/canton-wallet/apps/ui/src/router/index.ts`
- Create: `/home/helena/env/daml/canton-wallet/apps/ui/src/views/onboarding/onboarding-view.vue`
- Create: `/home/helena/env/daml/canton-wallet/apps/ui/src/views/onboarding/steps/welcome-step.vue`
- Create: `/home/helena/env/daml/canton-wallet/apps/ui/src/views/onboarding/steps/create-wallet-step.vue`
- Create: `/home/helena/env/daml/canton-wallet/apps/ui/src/views/onboarding/steps/add-nodes-step.vue`
- Create: `/home/helena/env/daml/canton-wallet/apps/ui/src/views/onboarding/steps/verify-nodes-step.vue`
- Create: `/home/helena/env/daml/canton-wallet/apps/ui/src/views/onboarding/steps/discovery-step.vue`
- Create: `/home/helena/env/daml/canton-wallet/apps/ui/src/services/wallet-desktop-client.ts`
- Create: `/home/helena/env/daml/canton-wallet/apps/ui/tests/onboarding-view.test.ts`

- [ ] **Step 1: Write the failing onboarding UI tests**

Add tests that assert:

```ts
expect(screen.getByText("Welcome")).toBeInTheDocument();
expect(screen.getByText("Create wallet")).toBeInTheDocument();
expect(screen.getByText("Verify connections")).toBeInTheDocument();
```

Also assert users can add more than one node row in the wizard.

Also assert the node form collects the Phase 1 connection shape:

```ts
expect(screen.getByLabelText("Node name")).toBeInTheDocument();
expect(screen.getByLabelText("Transport")).toBeInTheDocument();
expect(screen.getByLabelText("gRPC security")).toBeInTheDocument();
expect(screen.getByLabelText("Admin endpoint")).toBeInTheDocument();
expect(screen.getByLabelText("Public endpoint")).toBeInTheDocument();
expect(screen.getByLabelText("Auth mode")).toBeInTheDocument();
expect(screen.getByLabelText("OIDC client id")).toBeInTheDocument();
```

- [ ] **Step 2: Run the onboarding UI tests to verify they fail**

Run:

```bash
rtk pnpm -C /home/helena/env/daml/canton-wallet --filter @canton-wallet/ui test -- onboarding
```

Expected:

- `FAIL`
- onboarding components missing

- [ ] **Step 3: Implement the onboarding flow**

Implement:

- first-run welcome flow
- wallet metadata step
- multi-node entry step
- verify step showing per-node statuses
- discovery step
- completion handoff to the home shell

The node entry step must collect and persist:

- `displayName`
- `ledgerEndpoint`
- `transportKind`
- `grpcSecurity`
- `adminEndpoint`
- `publicEndpoint`
- `authMode`
- `notes`
- future-ready OIDC metadata placeholders

The additional-wallet flow should reuse the same components but skip the first-run welcome screen.

- [ ] **Step 4: Run the onboarding UI tests to verify they pass**

Run:

```bash
rtk pnpm -C /home/helena/env/daml/canton-wallet --filter @canton-wallet/ui test -- onboarding
```

Expected:

- `PASS`

- [ ] **Step 5: Commit**

```bash
git -C /home/helena/env/daml/canton-wallet add apps/ui
git -C /home/helena/env/daml/canton-wallet commit -m "feat: add wallet onboarding flow"
```

## Task 9: Build The Wallet Shell And Phase 1 Screens

**Files:**
- Create: `/home/helena/env/daml/canton-wallet/apps/ui/src/layouts/wallet-shell-layout.vue`
- Create: `/home/helena/env/daml/canton-wallet/apps/ui/src/views/home-view.vue`
- Create: `/home/helena/env/daml/canton-wallet/apps/ui/src/views/wallets-view.vue`
- Create: `/home/helena/env/daml/canton-wallet/apps/ui/src/views/nodes-view.vue`
- Create: `/home/helena/env/daml/canton-wallet/apps/ui/src/views/activity-view.vue`
- Create: `/home/helena/env/daml/canton-wallet/apps/ui/src/views/settings-view.vue`
- Create: `/home/helena/env/daml/canton-wallet/apps/ui/src/components/navigation/main-nav.vue`
- Create: `/home/helena/env/daml/canton-wallet/apps/ui/src/components/home/node-status-cards.vue`
- Create: `/home/helena/env/daml/canton-wallet/apps/ui/src/components/home/placeholder-balance-cards.vue`
- Create: `/home/helena/env/daml/canton-wallet/apps/ui/src/components/home/placeholder-activity-list.vue`
- Create: `/home/helena/env/daml/canton-wallet/apps/ui/tests/wallet-shell-layout.test.ts`
- Create: `/home/helena/env/daml/canton-wallet/apps/ui/tests/home-view.test.ts`
- Create: `/home/helena/env/daml/canton-wallet/apps/ui/tests/wallets-view.test.ts`
- Create: `/home/helena/env/daml/canton-wallet/apps/ui/tests/nodes-view.test.ts`
- Create: `/home/helena/env/daml/canton-wallet/apps/ui/tests/settings-view.test.ts`

- [ ] **Step 1: Write the failing wallet shell tests**

Add tests asserting:

```ts
expect(screen.getByText("Home")).toBeInTheDocument();
expect(screen.getByText("Wallets")).toBeInTheDocument();
expect(screen.getByText("Nodes")).toBeInTheDocument();
expect(screen.getByText("Activity")).toBeInTheDocument();
expect(screen.getByText("Settings")).toBeInTheDocument();
```

Also assert that the home view shows:

- aggregate wallet readiness
- per-node status chips or cards
- placeholder balances
- placeholder activity

Add screen-specific assertions too:

```ts
expect(screen.getByText("Create wallet")).toBeInTheDocument();
expect(screen.getByText("Retry verification")).toBeInTheDocument();
expect(screen.getByText("Workspace settings")).toBeInTheDocument();
```

- [ ] **Step 2: Run the wallet shell tests to verify they fail**

Run:

```bash
rtk pnpm -C /home/helena/env/daml/canton-wallet --filter @canton-wallet/ui test
```

Expected:

- `FAIL`
- wallet shell views missing

- [ ] **Step 3: Implement the shell and Phase 1 screens**

Implement:

- shell layout with active-wallet context
- `Home` real screen
- `Wallets` real screen with create, rename, and switch flows
- `Nodes` real screen with list, add, retry, update, and unbind flows
- `Activity` placeholder screen
- `Settings` minimal real screen

Keep the visual direction business-first with restrained playfulness.

- [ ] **Step 4: Run the wallet shell tests to verify they pass**

Run:

```bash
rtk pnpm -C /home/helena/env/daml/canton-wallet --filter @canton-wallet/ui test
```

Expected:

- `PASS`

- [ ] **Step 5: Commit**

```bash
git -C /home/helena/env/daml/canton-wallet add apps/ui
git -C /home/helena/env/daml/canton-wallet commit -m "feat: add wallet shell screens"
```

## Task 10: Wire End-To-End Desktop Integration And Developer Scripts

**Files:**
- Modify: `/home/helena/env/daml/canton-wallet/apps/desktop/src/main/main.ts`
- Modify: `/home/helena/env/daml/canton-wallet/apps/desktop/src/main/backend-runtime.ts`
- Modify: `/home/helena/env/daml/canton-wallet/apps/desktop/src/main/wallet-backend-client.ts`
- Modify: `/home/helena/env/daml/canton-wallet/apps/ui/src/services/wallet-desktop-client.ts`
- Modify: `/home/helena/env/daml/canton-wallet/apps/backend/src/main.ts`
- Create: `/home/helena/env/daml/canton-wallet/scripts/dev.mjs`
- Create: `/home/helena/env/daml/canton-wallet/scripts/test-backend.mjs`
- Create: `/home/helena/env/daml/canton-wallet/scripts/test-ui.mjs`
- Create: `/home/helena/env/daml/canton-wallet/scripts/test-desktop.mjs`
- Modify: `/home/helena/env/daml/canton-wallet/README.md`

- [ ] **Step 1: Write the failing integration smoke test**

Add a smoke test path that expects:

```ts
expect(await desktopClient.listWallets()).toEqual([]);
expect(await desktopClient.getHealth()).toMatchObject({ status: "ok" });
```

Also assert backend startup and shutdown are managed by Electron in one place.

Add startup persistence coverage:

```ts
expect(await desktopClient.getActiveWallet()).toMatchObject({
    id: "wallet-1",
});
```

after restarting the app runtime in the test harness.

- [ ] **Step 2: Run the smoke tests to verify they fail**

Run:

```bash
rtk pnpm -C /home/helena/env/daml/canton-wallet test
```

Expected:

- `FAIL`
- end-to-end integration path incomplete

- [ ] **Step 3: Implement the end-to-end wiring and scripts**

Implement:

- desktop startup launching backend and UI together
- UI service layer calling the preload API only
- backend loopback client in the main process
- root scripts for build, test, and dev
- README instructions for local development and the local SDK dependency

- [ ] **Step 4: Run the full verification to verify it passes**

Run:

```bash
rtk pnpm -C /home/helena/env/daml/canton-wallet build
rtk pnpm -C /home/helena/env/daml/canton-wallet test
```

Expected:

- `PASS`

- [ ] **Step 5: Commit**

```bash
git -C /home/helena/env/daml/canton-wallet add apps/desktop apps/ui apps/backend scripts README.md package.json pnpm-workspace.yaml tsconfig.base.json
git -C /home/helena/env/daml/canton-wallet commit -m "feat: wire canton wallet phase 1 foundation"
```
