# Canton Wallet Phase 1 Design

## Goal

Design the first subproject for a new `canton-wallet` desktop application that uses Electron, NestJS, TypeScript, Vue, and the local `canton-typescript-sdk` package to deliver a business-first, slightly playful wallet shell for Canton.

Phase 1 should establish the product and technical foundation, not full wallet semantics.

## Decision Summary

- build the app as a `pnpm` workspace monorepo
- use Electron for the desktop shell
- embed a NestJS backend inside the desktop app
- use Vue with TypeScript for the renderer UI
- depend on the local Canton TypeScript SDK as a package through a thin adapter layer
- model the product around wallets, not around individual nodes
- allow one wallet to bind to one or more nodes
- keep node selection and capability routing inside the backend
- use gRPC first for Canton connectivity
- use SQLite plus a file cache for local workspace state
- add a first-run wizard that creates a wallet and binds one or more nodes
- start with unauthenticated node connections, but keep the connection model ready for later OIDC support
- use `CIP-56` as an adapter-oriented inspiration for wallet vocabulary and metadata, not as a strict compatibility contract
- ship a polished wallet shell with placeholder balances and placeholder activity instead of inventing fake financial semantics too early

## Product Scope

This work is large enough that it should be treated as a sequence of subprojects.

Phase 1 covers:

- desktop shell and process architecture
- local workspace storage
- wallet and node connection domain model
- first-run onboarding wizard
- unified wallet home shell
- wallet-domain backend APIs
- Canton SDK integration through gRPC

Phase 1 does not cover:

- real balance derivation
- real activity derivation
- transaction submission UX
- model-specific DAML wallet flows
- OIDC implementation
- external signer integration
- local key custody
- external-party account flows

## Runtime Architecture

The application should be split into explicit runtime boundaries.

### Electron

Electron should own:

- desktop process startup
- window lifecycle
- packaging
- OS path discovery
- preload bridge exposure
- launching and supervising the embedded backend

Electron should not own wallet domain logic.

### Vue Renderer

Vue should own:

- onboarding wizard UI
- wallet shell UI
- wallet navigation
- local interaction state
- view composition

Vue should not talk to Canton directly.

Vue should consume a typed preload bridge only.

The preload bridge should expose wallet-domain methods, not generic transport primitives.

### Embedded NestJS Backend

NestJS should own:

- wallet domain APIs
- persistence orchestration
- onboarding workflow state
- node connection verification
- capability probing
- unified wallet home projections
- Canton SDK integration

The backend is the long-term stability boundary for the product.

This is important because the product is expected to move from node-managed identities toward external-party and external-signer flows later.

## Renderer To Backend Transport Contract

Phase 1 should use a two-hop renderer contract:

- Vue calls typed preload methods
- preload uses Electron IPC to call the main process
- Electron main forwards those requests to the embedded Nest backend over a private loopback HTTP client

This means:

- Vue never calls localhost directly
- Vue never imports a backend HTTP client directly
- Nest can still be implemented with normal controllers and DTOs
- Electron remains the trust and lifecycle boundary for the app

### Why This Contract

This choice matters for planning because it fixes:

- startup and shutdown responsibilities
- DTO ownership
- packaging assumptions
- test seams
- error propagation between processes

It also keeps the renderer isolated while still letting the backend behave like a real application boundary.

### Shared Contract Ownership

`packages/shared` should define:

- preload-facing wallet-domain method contracts
- IPC request and response DTOs
- shared backend DTOs where intentional
- wallet-domain view models
- wallet-domain error models

The preload surface should be stable and wallet-oriented.

Representative operations:

- `createWallet`
- `listWallets`
- `addNodeConnection`
- `verifyNodeConnection`
- `finalizeOnboarding`
- `getWalletHome`

## Repository Shape

The wallet should start as a `pnpm` workspace monorepo.

Recommended shape:

- `apps/desktop`
- `apps/ui`
- `apps/backend`
- `packages/shared`
- `packages/sdk-adapter`

### `apps/desktop`

Responsibilities:

- Electron main process
- backend bootstrap and lifecycle
- window creation
- preload registration
- app-path and workspace-path resolution

### `apps/ui`

Responsibilities:

- Vue app
- onboarding flows
- wallet shell
- node management screens
- settings screens

### `apps/backend`

Responsibilities:

- Nest modules and controllers
- repository layer
- wallet projections
- Canton integration orchestration

### `packages/shared`

Responsibilities:

- shared DTOs
- view models
- typed IPC contracts
- enums
- wallet-domain error shapes

### `packages/sdk-adapter`

Responsibilities:

- wrap `canton-typescript-sdk`
- normalize SDK usage into wallet-oriented backend services
- keep raw Canton service boundaries out of the rest of the backend where possible

## Wallet-Centric Domain Model

The product should be centered on wallets.

The user clarified that node relationships are per wallet, not the other way around.

That means one wallet can bind to one or more nodes, and the UI should still present a single wallet view.

### Core Records

#### `WalletWorkspace`

Top-level local workspace container.

Responsibilities:

- own the set of wallets
- own global preferences
- own cache locations and artifact metadata

#### `Wallet`

The primary product object.

Responsibilities:

- identity and display metadata
- onboarding status
- playful-but-business presentation settings
- bound node relationships
- cached home data
- future account mappings

Representative fields:

- `id`
- `name`
- `description?`
- `accentTheme?`
- `createdAt`
- `updatedAt`
- `onboardingStatus`

One wallet should also be marked as the active wallet for the current workspace session state.

The workspace should persist:

- `activeWalletId?`

#### `NodeConnection`

Represents a reusable Canton node connection definition.

Phase 1 rule:

- a `NodeConnection` is owned by exactly one wallet
- node connections are not shared across wallets in Phase 1

If a user wants to connect two wallets to the same underlying node endpoint, Phase 1 should create two separate `NodeConnection` records.

Representative fields:

- `id`
- `displayName`
- `ledgerEndpoint`
- `transportKind`
- `grpcSecurity`
- `adminEndpoint?`
- `publicEndpoint?`
- `authMode`
- `notes?`
- `lastHealthStatus?`
- `lastCapabilitySnapshot?`

Initial auth behavior:

- unauthenticated connections only

Required future-ready placeholders:

- OIDC mode
- token or login configuration metadata

These fields should be user-editable in Phase 1 onboarding, but only the unauthenticated path should be executable.

#### `WalletNodeBinding`

Join record between a wallet and one or more nodes.

Responsibilities:

- bind multiple nodes to a single wallet
- preserve per-wallet node usage preferences later
- support internal capability routing

Representative fields:

- `walletId`
- `nodeConnectionId`
- `priority`
- `enabled`

The explicit binding record is still useful in Phase 1 because it preserves the future direction where shared or more complex wallet-node relationships may exist later, but the current invariant remains one connection owned by one wallet.

#### `OnboardingState`

Tracks wizard progress for a wallet.

Representative fields:

- `walletId`
- `currentStep`
- `connectionVerificationStatus`
- `identityDiscoveryStatus`
- `completedAt?`

#### `HomeSnapshot`

Cached wallet home view model.

Phase 1 responsibilities:

- connected-node summary
- health and readiness indicators
- placeholder balances cards
- placeholder activity feed
- setup and next-step prompts

Discovery artifacts should live in both places:

- per-node snapshots for operational truth about each bound node
- per-wallet home snapshots for the aggregated active-wallet view

## CIP-56 Positioning

`CIP-56` should influence the wallet domain model as an adapter target, not as a hard compatibility promise.

Use it for:

- vocabulary
- metadata layout ideas
- wallet and account modeling direction

Do not use Phase 1 to claim:

- strict storage compatibility
- strict API compatibility
- strict wire-format compatibility

The design goal is to remain close enough that a future `CIP-56` adapter can be added without rewriting the wallet core.

## Storage Design

Use SQLite plus a file cache.

### SQLite

SQLite should store:

- wallets
- node connections
- wallet-node bindings
- onboarding state
- settings
- cached home summaries
- capability snapshots

### File Cache

The file cache should be reserved for:

- imported interface metadata later
- generated interface artifacts later
- richer node snapshots
- temporary payload caches if needed

This avoids turning structured state into ad hoc JSON blobs while still leaving room for larger artifact-oriented files later.

## Onboarding Wizard

Phase 1 needs a first-run wizard.

The wizard should create the first wallet, then bind one or more nodes to it.

### Success Criteria

Wizard success means:

- wallet created
- one or more node connections saved
- connectivity verified
- lightweight identity discovery completed
- user lands on a real wallet home screen

For multi-node wallets, onboarding should succeed if:

- at least one bound node verifies successfully
- at least one successful node completes the Phase 1 discovery pass

Onboarding should not require every entered node to verify successfully.

Failed or degraded nodes should still be saved on the wallet and marked with explicit status so the user can fix them later from the `Nodes` view.

Discovery should run on every healthy entered node during onboarding.

The minimum success rule is still:

- at least one healthy node must complete discovery

But if several entered nodes are healthy, all of them should be probed and persisted so the first home screen reflects the real wallet state.

### Wizard Steps

#### 1. Welcome

Explain:

- what the wallet is
- that it starts with node-managed identities
- that auth flows like OIDC can come later

#### 2. Create Wallet

Collect:

- wallet name
- optional description
- optional accent or theme choice

#### 3. Add Node Connections

Allow one or more node connections to be defined for the wallet.

Initial node fields:

- display name
- ledger endpoint
- transport settings
- gRPC security settings
- optional separate admin endpoint
- optional separate public endpoint
- auth mode selector
- notes

In Phase 1 these fields should be collected and persisted even though:

- the admin and public endpoint split is not required for the working path
- only unauthenticated connectivity is actually exercised

#### 4. Verify Connections

The backend should:

- attempt connection
- record health
- record version
- record capability snapshot
- normalize failures into wallet-domain errors

#### 5. Discover Wallet Identity

Phase 1 identity discovery is intentionally lightweight.

It should gather enough node-facing identity or readiness context to make the resulting wallet shell believable.

It should not pretend to derive full account and balance semantics yet.

Exact Phase 1 discovery payload:

- node health status
- ledger API version
- capability snapshot for the wallet-supported service surface
- first bounded page of known parties from the node
- summary of discovered party presence from that bounded probe
- package visibility readiness from ledger package enumeration where available

Persist the following from discovery:

- last successful health probe
- ledger API version
- discovered party sample and bounded count
- package count or package-ready boolean
- last discovery timestamp

The discovery pass should stay cheap and deterministic.

It should not attempt full ledger indexing or domain-specific semantic inference.

The bounded known-party probe should be capped at:

- 20 parties

#### 6. Land On Wallet Home

The user should land on:

- wallet header
- connected node summary
- readiness cards
- placeholder balances area
- placeholder activity area
- next-step prompts

## UX Direction

The user wants something in the direction of MetaMask, but more business-oriented while still playful.

That means:

- operational clarity first
- structured, confident layouts
- not a raw explorer or admin panel
- restrained delight through color, illustration, and typography
- avoid toy-like crypto tropes

Main navigation for Phase 1:

- `Home`
- `Wallets`
- `Nodes`
- `Activity`
- `Settings`

### Wallet Home Semantics

Phase 1 home should not fake real business data semantics.

Balances and activity should be placeholders backed by explicit readiness state.

This avoids prematurely hard-coding financial assumptions before a real DAML model adapter exists.

When a wallet has multiple bound nodes:

- the home screen should show aggregate wallet readiness
- the home screen should also show per-node status chips or cards
- degraded or failed nodes should appear as operational issues, not as onboarding blockers once one healthy node exists

That keeps the wallet view unified while still surfacing partial node failures honestly.

## Active Wallet Model

Phase 1 should support multiple wallets in one workspace with one active wallet at a time.

Rules:

- onboarding creates the first wallet and makes it active
- the app should reopen to the last active wallet if one exists
- if multiple wallets exist, the `Wallets` screen should allow switching the active wallet
- creating a new wallet after first run should also be done from the `Wallets` screen
- switching wallets should update the shell context without changing the underlying workspace

The main shell should always render in the context of the active wallet.

### Additional Wallet Creation Flow

Creating a wallet after first run should use a shortened onboarding flow:

- no global welcome screen
- create wallet metadata
- add one or more node connections
- verify connections
- run Phase 1 discovery
- land on the new wallet as the active wallet

Phase 1 should not allow creation of a permanently incomplete wallet shell with no node setup.

## Backend Module Design

The embedded Nest backend should expose wallet-domain modules, not raw Canton-shaped modules.

### `wallets`

Responsibilities:

- create wallet
- list wallets
- rename wallet
- set active wallet
- load wallet shell metadata

### `nodeConnections`

Responsibilities:

- create node connection
- update node connection
- test node connection
- bind node to wallet
- unbind node from wallet
- list wallet-bound nodes

Phase 1 should include post-onboarding node retry and unbind flows.

### `onboarding`

Responsibilities:

- create onboarding session
- advance wizard state
- persist wizard progress
- finalize wallet setup

### `home`

Responsibilities:

- compute wallet home snapshot
- expose readiness cards
- expose placeholder balances
- expose placeholder activity

### `activity`

Responsibilities:

- return placeholder activity view models for Phase 1

### `settings`

Responsibilities:

- workspace preferences
- wallet preferences

### `cantonIntegration`

Internal module only.

Responsibilities:

- SDK client creation
- node health probing
- capability probing
- wallet-node routing

## Integration Layers

### `SdkClientFactory`

Constructs SDK clients from stored node connection settings.

### `NodeCapabilityProbe`

Checks:

- health
- version
- basic service readiness
- package and template readiness signals later

### `WalletBindingResolver`

Chooses which bound node satisfies a wallet capability.

Important rule:

- the UI never chooses nodes directly for wallet behavior unless a future feature explicitly requires it

### `WalletProjectionService`

Builds the unified wallet home view from one or more bound nodes.

In Phase 1 this projection is mostly readiness-oriented.

## Canton SDK Usage

Phase 1 should use the local `canton-typescript-sdk` package through `packages/sdk-adapter`.

Start with gRPC only.

Initial SDK use cases:

- ledger API version checks
- health checks
- node capability and readiness checks
- bounded known-party discovery
- package or interface readiness checks where useful

For Phase 1, “identity discovery” should mean:

- health and version verified
- known parties probe executed
- package readiness probe executed

No richer account semantics should be inferred yet.

The backend should not forward raw gRPC service shapes to Vue.

## Error Model

Backend errors should be normalized into wallet-domain errors.

Initial error categories:

- `nodeUnreachable`
- `authenticationRequired`
- `capabilityUnavailable`
- `walletBindingIncomplete`
- `onboardingIncomplete`
- `workspaceCorrupted`

Each error should include:

- stable machine-readable code
- operator-oriented explanation
- suggested remediation text for UI display

## Platform Strategy

Phase 1 should be developed on one platform first while keeping packaging structure ready for macOS, Windows, and Linux later.

Initial development target:

- Linux first

This means:

- avoid OS-specific assumptions in workspace paths
- isolate platform-specific packaging logic in Electron
- keep monorepo scripts portable

## Phase 1 Deliverable

A successful Phase 1 implementation should produce:

- a runnable desktop app
- an embedded backend
- a persistent workspace
- multiple wallets support
- wallet-to-multiple-node bindings
- a first-run wizard
- a verified gRPC node connection path
- a polished wallet shell landing page

It should also include these post-onboarding screens at Phase 1 scope:

- `Wallets`
  - real screen
  - list wallets
  - create wallet
  - rename wallet
  - switch active wallet
- `Nodes`
  - real screen
  - list bound nodes for the active wallet
  - add node connection
  - retry verification
  - update node metadata
  - unbind node
- `Activity`
  - shell screen backed by placeholder data
- `Settings`
  - minimal real screen for workspace and wallet preferences

`Home` is the main real screen and remains the primary landing surface after onboarding.

It should feel like a real product foundation even though balances and activity are still placeholder projections.

## Explicit Non-Goals

Phase 1 should not include:

- real balance semantics
- real activity semantics
- transaction authoring or submission UX
- template-driven business actions
- model-specific DAML interface import flows
- OIDC implementation
- local secret custody
- external signer support
- external-party account support
- per-node wallet subviews
- cross-wallet aggregation
- strict `CIP-56` conformance guarantees

## Phase 2 Direction

Phase 2 can build on this foundation with:

- OIDC and auth onboarding
- interface metadata import
- generated DAML interface awareness
- real account, balance, and activity projections
- template-driven action flows
- external signer integration
- external-party support

## Planning Readiness

This spec is intentionally limited to a single first subproject:

- desktop foundation
- wallet workspace domain
- onboarding
- multi-node wallet bindings
- backend integration boundary
- placeholder wallet home shell

It should be narrow enough to support one concrete implementation plan without mixing in later transaction UX or model-specific semantics.
