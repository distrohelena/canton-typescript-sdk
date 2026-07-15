# Public Foundry-Style Testing SDK Design

**Date:** 2026-07-14  
**Status:** Approved for planning

## Goal

Expose an experimental public TypeScript testing API that brings the useful
semantics of Foundry fuzzing and invariant campaigns to Canton applications.
It must support both broad declarative coverage derived from DAML metadata and
deep, protocol-specific coverage supplied through typed TypeScript handlers.

The result is a test library, not an EVM emulation layer. It targets a real
Canton ledger through the existing SDK clients and uses fast-check for input
generation and shrinking.

## Decisions

- The API is public through a new `@distrohelena/canton-typescript-sdk/testing`
  package export, but marked experimental until a release-quality API review.
- A hybrid target model gives the greatest coverage: automatic template/choice
  targets provide a broad baseline; typed handlers can add to or replace any
  automatic action.
- A campaign uses Foundry-like `runs × depth` semantics. Invariants run after
  every action, and an action that reverts still consumes a depth slot.
- `failOnRevert` defaults to `false`, matching Foundry invariant testing.
- Canton isolation is explicit. The supported policies are `snapshot`,
  `cleanup`, and `external`; unavailable capabilities fail clearly.
- Semantic and workflow parity are goals. Exact Foundry PRNG streams,
  shrink paths, Solidity ABI support, EVM state mutation, and cheatcodes are
  explicitly out of scope.

## Public surface

`package.json` gains a `./testing` export pointing to `src/testing/index.ts`.
`fast-check` becomes a production dependency because public consumers execute
the campaign engine at runtime.

The entry point exports the campaign builder, target builders, runtime adapter
types, result and failure types, and focused testing utilities. The top-level
SDK export remains unchanged.

```ts
import {
  defineInvariantCampaign,
  targetTemplate,
  auto,
  createCantonTestRuntime,
} from "@distrohelena/canton-typescript-sdk/testing";

const runtime = createCantonTestRuntime({
  participants: { issuer: issuerClient, owner: ownerClient },
  actors: { issuer: issuerParty, owner: ownerParty },
  isolation: { kind: "cleanup" },
});

const campaign = defineInvariantCampaign({
  runtime,
  packageSource: { kind: "dar", path: "./.daml/dist/app.dar" },
  targets: [
    targetTemplate("Main:Iou")
      .create({ generator: auto })
      .choice("Archive", { generator: auto }),
  ],
  config: { runs: 100, depth: 20, failOnRevert: false },
  invariants: [
    invariant("no duplicate active IOUs", async ({ ledger, model }) => {
      // application assertion
    }),
  ],
  handlers: [
    handler("deposit", {
      actors: ["issuer"],
      weight: 4,
      generate: ({ fc }) => ({ amount: fc.bigInt({ min: 1n, max: 1_000n }) }),
      execute: async (context, input) => context.submit(/* command */),
      apply: (model, result) => model.recordDeposit(result),
    }),
  ],
});

await campaign.run();
```

The actual API may use factory functions rather than mutable builders, but it
must preserve the concepts and type boundaries above. All public configuration
is immutable after `defineInvariantCampaign` returns.

The first stable type boundary is deliberately explicit:

```ts
interface CantonTestActor {
  readonly party: string;
  readonly participant: string;
  readonly actAs?: readonly string[];
  readonly readAs?: readonly string[];
}

interface CampaignRuntime {
  readonly actors: Readonly<Record<string, CantonTestActor>>;
  submit(route: CampaignCommandRoute, command: LedgerCommand): Promise<CommandResult>;
  readActiveContracts(query: ActiveContractQuery): Promise<readonly ActiveContract[]>;
  readLedgerEnd(participant: string): Promise<string>;
  isolate: CampaignIsolation;
}
```

The public package also exposes named interfaces for `InvariantCampaignConfig`,
`CampaignTarget`, `CampaignHandler`, `CampaignInvariant`, `CampaignAction`,
`CampaignTrace`, `CampaignReplayArtifact`, `CampaignMetrics`, and
`InvariantCampaignFailure`. Type tests lock these interfaces before the
experimental export is declared stable.

## Declarative and custom targets

### Declarative targets

The declarative layer reads a DAR/package through the existing DAML-LF loading
and semantic-model facilities. It resolves template IDs, choices, payload
types, choice argument types, signatories, observers, and controllers when
that information is available from metadata.

`targetTemplate`, `targetInterface`, `targetChoice`, `excludeTemplate`,
`excludeChoice`, `targetActor`, and `excludeActor` form the Foundry-shaped
selection API. Target precedence is explicit and deterministic: specific
choice/interface inclusions override exclusions; exclusions override broad
template selections; broad selections override automatic discovery.

Automatic submission never infers authorization from DAML metadata. Every
mutating declarative target must name one or more actor keys with `.actors()`
or provide a `resolveRoute(context, action)` callback. The scheduler chooses
uniformly among the eligible named actors unless action weights state
otherwise. The resolved actor supplies its participant, `actAs` (defaulting to
that actor's party), and `readAs` (defaulting to the actor configuration).
Reads use the selected actor's participant and party visibility. Missing actor
configuration, a callback that returns an unknown actor, or a target without
a route resolver is a campaign-definition error, not a generated revert.

Generated DAML party values are likewise explicit: `auto` draws only from the
campaign's `valueParties` list, which defaults to no parties. A target needing
a party-valued field must set `valueParties`, provide a field generator, or is
reported as unsupported. This prevents the engine from treating a generated
payload party as a usable submitting actor.

For each selected create or choice action, the auto generator produces only
well-typed DAML values for supported LF types. It supports primitives,
optional values, lists, records, variants, enums, maps, numeric values,
parties, contract IDs, and timestamps subject to configured limits. Recursive
or unsupported shapes require a user-provided generator; the engine reports a
skipped-target diagnostic rather than guessing an invalid value.

Automatic choice generation only targets an active contract whose template and
visibility are known to the model. It does not claim to infer business-level
preconditions or controller authorization.

### Typed handlers

Typed handlers add the protocol knowledge that metadata cannot supply. A
handler declares a name, weight, valid actors, an input arbitrary, optional
precondition, execution function, and model transition. It can replace an
automatic action using the same target key or introduce a composed workflow
such as mint/approve/deposit.

```ts
handler("deposit", {
  actors: ["alice", "bob"],
  weight: 4,
  generate: ({ fc }) => ({
    amount: fc.bigInt({ min: 1n, max: 1_000n }),
  }),
  assume: async (context, input) => context.model.canDeposit(input),
  execute: async (context, input) => context.submit(/* command */),
  apply: (model, result) => model.recordDeposit(result),
});
```

`assume` produces a recorded discard rather than a revert. `bound` is a pure
helper that maps generated numbers and bigints into an inclusive range. Both
are available through handler context. A handler may declare which contract
IDs it creates, consumes, or observes so the campaign model can reject
impossible follow-up actions before submission.

Every mutating target or handler also declares one of these cleanup contracts:

- `cleanup: "none"`, allowed only with `snapshot` or `external` isolation;
- `cleanup: { discover, archive }`, where the caller supplies deterministic
  discovery and an authorized archive/close action; or
- `cleanup: { discover, trackCreated?, archive }`, where `discover` supplies
  reconciliation-capable recovery and `execute` may report created contract
  IDs to optimize normal cleanup.

`cleanup` isolation rejects campaign construction if any mutating action lacks
an authorized cleanup contract with `discover`. This is required because a
timed-out or ambiguous submission may have committed without returning a
created ID. The engine never assumes an arbitrary DAML choice is named
`Archive`, nor does it inject a marker into a payload unless the target
generator explicitly consumes `context.runMarker`. A target that cannot
discover its possible ambiguous creations must use `snapshot` or `external`
isolation instead.

## Campaign execution

Each generated run consists of exactly `depth` action slots. The scheduler
selects enabled targets by weight, renormalizing after applying target filters,
actor availability, model state, and handler preconditions. If no mutating
action is eligible, the engine schedules a ledger probe, preserving exact
depth without inventing state.

The runner records one outcome for every slot:

```ts
type CampaignActionOutcome =
  | { kind: "accepted"; updateId: string }
  | { kind: "discarded"; reason: string }
  | { kind: "protocol-revert"; reason: string }
  | { kind: "timeout"; reason: string }
  | { kind: "transport-error"; reason: string }
  | { kind: "malformed-response"; reason: string }
  | { kind: "unknown-commit-outcome"; reason: string };
```

Only `protocol-revert` continues when `failOnRevert` is false. An ambiguous
commit outcome is always a failure and triggers every configured `discover`
cleanup strategy. A deterministic run-marker scan is a common, but optional,
implementation of `discover`. `discarded` inputs are tracked separately from
rejected commands.

Hooks run in this order for each run: `beforeRun`, action execution,
`afterAction` invariants after every action, end-of-run invariants,
`afterInvariant` once after those end-of-run invariants, isolation cleanup or
restore, then post-cleanup invariants. One campaign owns a fresh model per run.
Campaigns run serially by default because a shared Canton environment cannot
be assumed safe for concurrent mutation.

## Invariants, metrics, and failure reporting

Invariants receive a read-only context containing the runtime, active-contract
model, ghost state, last action and outcome, ledger offsets, and campaign
metadata. They may return structured failures or throw an assertion error.
The runner aggregates all failed invariants for a checkpoint before stopping.

`campaign.run()` returns a structured successful result. Failure throws
`InvariantCampaignFailure`, which includes a safe summary and an optional
artifact path. Both success and failure expose Foundry-style metrics by target,
choice, actor, outcome, discard reason, action count, and invariant count.
This is the public equivalent of Foundry `show_metrics`: a campaign that
mostly reverts or discards must be visible in output.

The active-contract model has two layers. At `beforeRun`, the runtime hydrates
the ledger layer by querying the ACS for every selected template and configured
reader route. That layer, including visibility and contract IDs, is the source
of truth for target eligibility. The runner records an accepted command's
reported events, then performs bounded ledger reconciliation before the next
slot; only reconciled creates and archives alter the ledger layer. A handler's
`apply` function may update ghost state only after this reconciliation and may
not manufacture ledger contracts. Before every invariant checkpoint and at
run end, the runner refreshes the selected ACS/offset view and reports
unexpected external changes as structured observations. An unknown commit
outcome performs the same reconciliation for cleanup diagnostics, invokes
every configured `trackCreated` and `discover` cleanup strategy, and always
fails the run without applying ghost state. A deterministic run-marker scan is
an optional `discover` implementation when the relevant target generator
explicitly included `context.runMarker`; it is never assumed to exist.

## Reproducibility and artifacts

The engine uses `fc.check` and persists only the final minimized
counterexample. A replay artifact includes a version, canonical campaign
fingerprint, seed, fast-check counterexample path, generated action list,
actor routing, payload markers, outcomes, model diagnostics, metric summary,
and shrink counts.

Artifacts contain only allowlisted data. They never serialize endpoints,
credentials, authentication headers, or arbitrary error objects. Persisted
files use restrictive permissions, symlink-safe directory traversal,
same-directory temporary files, and atomic no-clobber publication. Replay
validates schema and fingerprint before connecting to a participant.

Fast-check seed/path and action replay provide deterministic reproduction in
the SDK engine. This intentionally does not promise a seed or shrinking path
compatible with Forge.

## Canton test runtime

`createCantonTestRuntime` adapts existing `CantonClient` and service clients.
It owns named participants, named actors, party-to-participant routes, command
submission, ACS/event/offset reads, bounded polling, and run-marker cleanup.

Isolation is declared, never inferred:

| Policy | Requirement | Per-run behavior |
| --- | --- | --- |
| `snapshot` | caller supplies supported create/restore callbacks | create/restore snapshot |
| `cleanup` | every mutating target supplies an authorized cleanup contract | discover/track only those contracts, call the supplied close action, and verify absence |
| `external` | caller supplies reset callback | call reset before/after runs as configured |

The runtime optionally exposes ledger-time advancement. It only advertises
this when a configured adapter supports it. EVM-only controls such as direct
storage writes, arbitrary balance injection, or chain forking are not
simulated.

## Compatibility and migration

The current test-only `tests/live/fuzz` harness remains unchanged during the
first public release candidate. A migration adapter will let it execute its
existing `Main:Iou` campaign through the public engine, proving the public API
before the old harness is deprecated.

Foundry-style environment aliases and CLI reporting are convenience features;
the public TypeScript configuration is authoritative. No existing SDK client
API, transport behavior, or package export changes incompatibly.

## Implementation milestones

1. Public campaign core: export boundary, configuration, scheduler, target
   filtering, typed handlers, model/invariant lifecycle, metrics, and replay.
2. DAML-LF declarative targets: metadata catalog, supported value generators,
   overrides, and clear unsupported-shape diagnostics.
3. Canton runtime: cleanup isolation, actor routing, probes, polling, then
   optional external reset, snapshots, and ledger-time adapters.
4. Compatibility and documentation: migrate the existing live fuzz fixture,
   Foundry-shaped config/CLI reports, examples, and migration guide.
5. Hardening: offline property tests, public API type tests, secure artifact
   tests, local multi-participant live smoke, and package-content verification.

## Non-goals

- Exact Foundry PRNG, shrinking, artifact, or CLI-output compatibility.
- Solidity ABI generation or execution.
- EVM snapshots, forks, storage mutation, or cheatcode emulation.
- Inferring arbitrary business invariants or authorization preconditions from
  DAML metadata.
- Fuzzing a production/shared ledger without an explicit isolation policy.
