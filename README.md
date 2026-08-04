# Canton TypeScript SDK

TypeScript SDK for Canton with:

- a shared `CantonClient`
- gRPC and JSON transports
- gRPC Ledger API-shaped service boundaries
- PQS-backed relational queries
- external-party lifecycle and signing
- authenticated and TLS-secured channels
- experimental tooling for invariant testing, DAML-LF inspection, interface
  generation, and replay debugging

## Install

```bash
npm install @distrohelena/canton-typescript-sdk
```

## Experimental invariant testing

`@distrohelena/canton-typescript-sdk/testing` is an experimental, opt-in
Foundry-style fuzzing surface for Canton. It provides semantic parity for
campaign runs, exact depth, handlers, permissive or strict protocol reverts,
invariants, shrinking, replay traces, and safe artifacts. It does not attempt
to reproduce Foundry's EVM, ABI, PRNG, or shrink sequence byte-for-byte.

Define the campaign once, keep ledger I/O in explicit runtime hooks, and use
safe isolation. Shared or production ledgers must use an explicit external or
snapshot policy; cleanup policies need contract discovery for ambiguous
submissions.

```ts
import * as fc from "fast-check";
import {
    defineInvariantCampaign,
    runInvariantCampaignCheckAsync,
} from "@distrohelena/canton-typescript-sdk/testing";

const campaign = defineInvariantCampaign<{ total: number }>({
    runtime: {
        actors: {
            issuer: { party: "Issuer", participant: "participant-a" },
        },
        isolation: { kind: "external" },
    },
    config: { runs: 100, depth: 8, failOnRevert: false, seed: 42 },
    targets: [{ key: "Main:Iou:Create", actors: ["issuer"] }],
    invariants: [async ({ model }) => {
        if (model.total < 0) throw new Error("negative total");
    }],
});

await runInvariantCampaignCheckAsync({
    campaign,
    arbitrary: fc.constant([{ actor: "issuer", targetKey: "Main:Iou:Create" }]),
    key: (actions) => JSON.stringify(actions),
    setupAsync: async () => ({ model: { total: 0 }, ghost: {} }),
    executeAsync: async () => ({ kind: "accepted", updateId: "update-1" }),
});
```

Use `createDamlTestingCatalog`, `targetTemplate`, and
`resolveDeclarativeTargets` to discover targets. `targetTemplate(id).create()`
and `.choice(name)` select create and exercise actions; pair the resolved
targets with `createDeclarativeCampaignArbitrary` for an exact-depth action
sequence. In `executeAsync`, pass each action to `executeDeclarativeActionAsync`
with the campaign runtime and an explicit `resolveContractIdAsync` callback for
choices. The callback is intentional: the SDK will not guess an active contract
from stale local state. `handler`, `bound`, and handler assumptions support
custom operations alongside declarative actions. A failed check returns the
shrunk counterexample trace; `InvariantCampaignFailure` and replay artifacts
expose only allowlisted diagnostics.

Automatic Party fields require an explicit `valueParties` list. When writing
commands by hand, use `DamlParty` and `DamlNumeric` for Party and exact decimal
Numeric values; a plain string is DAML `Text` and a plain JavaScript number is
not an exact Numeric value.

## Live Integration Tests

The repository also supports a live SDK validation suite against an already-running CN quickstart localnet.

The current party-creation flows were developed and live-tested against Canton
Participant 3.5.7. In particular, external-party allocation signs the generated
combined topology hash (`multi_hash`) rather than each topology transaction
individually.

The decentralized Ed25519 example was also run end-to-end against an isolated
Canton Participant 3.5.8 sidecar. On both 3.5.7 and 3.5.8 it creates the same
topology shape: a serial-1 decentralized namespace definition, one self-root
namespace certificate per owner, and a PartyToParticipant containing the party
signing key. No deprecated PartyToKeyMapping is created.

The SDK preserves `identityProviderId`, `userId`, and `waitForAllocation`
through decentralized prepare/finalize. Canton ignores `waitForAllocation` for
decentralized parties, so the example explicitly calls
`topologyAggregationService.waitForPartyHostingAsync(...)` to prove that the
expected participant is hosting the party on the expected synchronizer. That
aggregate topology check is the same on Participant 3.5.7 and 3.5.8.

## Standalone TypeScript examples

The repository includes runnable TypeScript examples for a local Canton
participant. Check them before running a lifecycle:

```bash
npm run examples:check
```

The setup and party examples are available individually:

```bash
npm run example:init
npm run example:tls
npm run example:jwt
npm run example:party:hosted
npm run example:party:external
npm run example:party:decentralized
```

For the application lifecycle, run these in order:

```bash
npm run example:dar:upload
npm run example:contract:create-exercise
npm run example:contract:query
npm run example:updates:stream
npm run example:user:rights
npm run example:topology:party-hosting
```

### Workflow examples

The eight stateful workflow examples are standalone proofs, not a sequence:
each uploads or verifies the fixture DAR, resolves a party, reads the
participant status, and creates its own run-scoped data. First make a Canton
participant available and verify the source with `npm run examples:check`; the
default endpoints and authentication environment variables are documented below.
The pruning preflight is a separate read-only operator check and does none of
those setup or mutation steps. Run any example independently:

```bash
npm run example:workflow:atomic
npm run example:workflow:retry
npm run example:workflow:resume
npm run example:workflow:stale-contract
npm run example:workflow:command-completion
npm run example:workflow:contract-lifecycle-audit
npm run example:workflow:update-lookup-reconciliation
npm run example:workflow:pruning-preflight
npm run example:workflow:participant-local
```

Those eight established stateful workflows intentionally leave durable state behind. A missing `SDK_EXAMPLE_PARTY`
causes fallback party allocation, which creates durable topology state; every
one also creates durable contracts. Set `SDK_EXAMPLE_PARTY` to an existing
party to rerun the established workflows against that party and avoid fallback
allocation. The fixture DAR remains installed after a run.

The participant-local command-submission workflow
(`npm run example:workflow:participant-local`) is a standalone gRPC-only proof
of the ordinary participant submission authorization route. It uses the normal
`SDK_EXAMPLE_*` endpoint, authentication, party, and timeout configuration:
`SDK_EXAMPLE_LEDGER_ENDPOINT`, `SDK_EXAMPLE_LEDGER_ADMIN_ENDPOINT`,
`SDK_EXAMPLE_PARTICIPANT_ADMIN_ENDPOINT`, `SDK_EXAMPLE_BEARER_TOKEN`,
`SDK_EXAMPLE_LEDGER_BEARER_TOKEN`, `SDK_EXAMPLE_LEDGER_ADMIN_BEARER_TOKEN`,
`SDK_EXAMPLE_PARTICIPANT_ADMIN_BEARER_TOKEN`, `SDK_EXAMPLE_PARTY`,
`SDK_EXAMPLE_PARTY_PREFIX`, `SDK_EXAMPLE_TIMEOUT_MS`, and
`SDK_EXAMPLE_TLS_ROOT_CERTIFICATE`. It configures a command signer that throws
if touched, then successfully creates and finds one exact active Message through
`commandService.submitParticipantLocalAndWaitAsync`; that success proves the
configured external signer was bypassed. An explicit party is reused, while
fallback allocation creates durable topology; the fixture upload leaves a
durable DAR and the proof leaves a durable contract. The unchanged
implementation uses the common compatibility path on Participant 3.5.7 and
the isolated Participant 3.5.8 sidecar.

The completion-correlation workflow (`npm run example:workflow:command-completion`)
is a standalone successful proof that creates durable Message state. It uses the
same normal `SDK_EXAMPLE_*` configuration: `SDK_EXAMPLE_LEDGER_ENDPOINT`,
`SDK_EXAMPLE_LEDGER_ADMIN_ENDPOINT`, `SDK_EXAMPLE_PARTICIPANT_ADMIN_ENDPOINT`,
`SDK_EXAMPLE_BEARER_TOKEN`, `SDK_EXAMPLE_LEDGER_BEARER_TOKEN`,
`SDK_EXAMPLE_LEDGER_ADMIN_BEARER_TOKEN`,
`SDK_EXAMPLE_PARTICIPANT_ADMIN_BEARER_TOKEN`,
`SDK_EXAMPLE_TLS_ROOT_CERTIFICATE`, `SDK_EXAMPLE_PARTY`,
`SDK_EXAMPLE_PARTY_PREFIX`, and `SDK_EXAMPLE_TIMEOUT_MS`.
`SDK_EXAMPLE_USER_ID` is mandatory: absent or blank input is rejected, while
every nonblank value is preserved untrimmed and exactly submitted and exactly
matched in the completion. With bearer authentication, the configured declared
user must equal the token's Ledger API user/subject; the example does not inspect
the token. It keeps the ledger end as its saved exclusive offset and begins the
first stream read before submission.
No public wait-for-command-completion helper or API is introduced; the
correlation helper remains example-only.
The completion-correlation example asserts successful correlation only; it does
not assert rejected-command correlation. On both participant observations, the
stream-first rejected-command probes observed no exact completion before their
bounded stream transport errors.

The contract-lifecycle audit workflow (`npm run example:workflow:contract-lifecycle-audit`) is a standalone gRPC-only proof. It uses the normal `SDK_EXAMPLE_*` endpoint, authentication, party, and timeout configuration: `SDK_EXAMPLE_LEDGER_ENDPOINT`, `SDK_EXAMPLE_LEDGER_ADMIN_ENDPOINT`, `SDK_EXAMPLE_PARTICIPANT_ADMIN_ENDPOINT`, `SDK_EXAMPLE_BEARER_TOKEN`, `SDK_EXAMPLE_LEDGER_BEARER_TOKEN`, `SDK_EXAMPLE_LEDGER_ADMIN_BEARER_TOKEN`, `SDK_EXAMPLE_PARTICIPANT_ADMIN_BEARER_TOKEN`, `SDK_EXAMPLE_PARTY`, `SDK_EXAMPLE_PARTY_PREFIX`, and `SDK_EXAMPLE_TIMEOUT_MS`. An explicit `SDK_EXAMPLE_PARTY` is reused; otherwise fallback allocation creates durable topology. The fixture upload leaves a durable DAR, and the workflow leaves durable contracts. It uses the alpha ContractService to prove the original active Message before replacement and the replacement active Message afterward, then uses EventQuery for the original contract's create/archive history. It makes no post-archive ContractService claim for the original.

The update-lookup reconciliation workflow (`npm run example:workflow:update-lookup-reconciliation`) is a standalone gRPC-only proof that observes one exact self-party Message transaction from `UpdateService.GetUpdates`, then immediately reconciles it through `getUpdateById` and `getUpdateByOffset`. It uses the normal `SDK_EXAMPLE_*` endpoint, authentication, party, and timeout configuration, including `SDK_EXAMPLE_PARTY` and `SDK_EXAMPLE_TIMEOUT_MS`; first run `npm run examples:check` and make an authenticated participant available. An explicit party is reused, while fallback allocation creates durable topology; the fixture upload leaves a durable DAR and the workflow leaves durable contracts. The same unchanged implementation is tested against authenticated Participant 3.5.7 and the isolated Participant 3.5.8 sidecar, in default-party and explicit-party modes.

The pruning-preflight workflow (`npm run example:workflow:pruning-preflight`) is a standalone gRPC-only, read-only operator check. It requires `SDK_EXAMPLE_OFFSET` to be a canonical positive decimal integer and uses the normal endpoint, authentication, and timeout variables: `SDK_EXAMPLE_LEDGER_ENDPOINT`, `SDK_EXAMPLE_LEDGER_ADMIN_ENDPOINT`, `SDK_EXAMPLE_PARTICIPANT_ADMIN_ENDPOINT`, `SDK_EXAMPLE_BEARER_TOKEN`, `SDK_EXAMPLE_LEDGER_BEARER_TOKEN`, `SDK_EXAMPLE_LEDGER_ADMIN_BEARER_TOKEN`, `SDK_EXAMPLE_PARTICIPANT_ADMIN_BEARER_TOKEN`, and `SDK_EXAMPLE_TIMEOUT_MS`. The participant-admin credential is required for the schedule and safe-pruning context reads. Its safe-pruning context request sends the saved ledger end and a validated current timestamp encoded in `beforeOrAt`; it leaves commitment-state absent. It does not mutate the participant or create durable state: no party, DAR, command, update query, schedule change, or pruning request is made. The later participant watermark classifies the supplied offset as `alreadyPruned`, `beyondLedgerEnd`, or `notObservedPruned`; all-divulged watermarks and schedule/safe-pruning context are reported separately and do not alter that result. `notObservedPruned` is not proven queryable, because pruning can race after the later observation and other query preconditions can still fail. The unchanged implementation is supported on Participant 3.5.7 and the isolated Participant 3.5.8 sidecar.

Each of the eight established stateful workflows prints its actor plus the full participant version returned by the
authenticated status API, its parsed release core, and its selected path:
`Participant version:`, `Release core:`, and `Compatibility path:`. The current
stateful-workflow implementation uses one common-code path for release cores 3.5.7 and 3.5.8. It
adds a version-specific behavioral difference only after live evidence proves
one; it does not infer compatibility from a container tag or endpoint.

- `example:workflow:atomic` first proves that a two-command batch with an
  invalid second command is rejected without creating its valid first Message,
  then proves that two independent creates commit atomically and remain active
  with their exact payloads.
- `example:workflow:retry` submits a caller-controlled command ID with a
  deduplication duration, retries the exact same request, classifies the
  duplicate outcome, and proves that exactly one matching contract is active.
- `example:workflow:resume` saves the ledger end before its post-offset create,
  proves the intentionally idle stream timeout, then resumes exclusively after
  that saved offset and rejects a pre-offset contract if it appears.
- `example:workflow:stale-contract` proves archive/replacement state and then
  proves that exercising the archived contract is rejected.

Expected failures are accepted only through structured error classification:
gRPC status code, decoded status, operation, and the selected compatibility
path—not prose matching. The retry example uses one explicit command ID and
deduplication period for the exact same request; changing either value is a new
request and is not a retry proof. The resume example treats the saved offset as
exclusive, so its resumed stream must observe only updates after the saved
ledger end.

The eight established stateful workflow sources and unit contracts were developed
and live-tested against authenticated Participant 3.5.7 and the isolated
Participant 3.5.8. Both final-tree matrices selected the same unchanged implementation and common
compatibility path. The normalized outcome comparison is identical: atomic
reports `invalidChoice` before its replacement proof, retry reports
`duplicateCommand` with one active contract, resume reports `idle-timeout` and
a post-offset update, and stale-contract reports `staleContract`.

For those eight established stateful workflows, the best multi-version path reads the authenticated full version, parses its
release core, and uses data-only structured compatibility for observed
outcomes. A behavioral difference is introduced only after live proof; it is
never inferred from a container tag, endpoint, or prose error message. For the
isolated 3.5.8 sidecar, use the SDK sidecar launcher's protected documented
credential refresh flow in a local child shell and refresh before expiry. Never
log its output or expose refreshed credentials beyond that child. Use the
documented `SDK_EXAMPLE_*` environment variables when running the workflow
commands.

By default, Ledger and Ledger Admin use `localhost:3901`; Participant Admin
uses `localhost:3902`. Override them with
`SDK_EXAMPLE_LEDGER_ENDPOINT`, `SDK_EXAMPLE_LEDGER_ADMIN_ENDPOINT`, and
`SDK_EXAMPLE_PARTICIPANT_ADMIN_ENDPOINT`. Use `SDK_EXAMPLE_BEARER_TOKEN` for a
shared bearer token, or set `SDK_EXAMPLE_LEDGER_BEARER_TOKEN`,
`SDK_EXAMPLE_LEDGER_ADMIN_BEARER_TOKEN`, and
`SDK_EXAMPLE_PARTICIPANT_ADMIN_BEARER_TOKEN` per surface. The examples also
accept `SDK_EXAMPLE_PARTY`, `SDK_EXAMPLE_USER_ID`, `SDK_EXAMPLE_SYNCHRONIZER`,
and `SDK_EXAMPLE_TIMEOUT_MS`; generated fallback party names use
`SDK_EXAMPLE_PARTY_PREFIX` when supplied. For TLS, set
`SDK_EXAMPLE_TLS_ROOT_CERTIFICATE` to a custom CA certificate path.

Some commands intentionally create durable localnet state: DAR upload installs
a package; create/exercise, query, and stream may allocate a fallback party and
create contracts; topology inspection may allocate a fallback party. User-rights
is read-only. These examples do not clean up durable state.

The uploaded asset is
`canton-explorer-debug-playground-0.1.0.dar`, the normal (not debug) Canton
Explorer Debug Playground DAR from
`/home/helena/dev/daml/canton-explorer/debug-playground/.daml/dist/canton-explorer-debug-playground-0.1.0.dar`.
Its Canton Explorer checkout commit is `750b28dd0ce4674e4368c12a6da1b5b5cbb00f88`,
its package-introduction commit is `abde077`, it is Apache-2.0 licensed, and
its SHA-256 is
`307cf7c52ac2770d1d1a2c5e1ec56a78ab7c70e7809c0cfb419abadb93cc6e29`.

The examples and their DAR are repository-only and excluded from the npm
tarball. The existing setup and decentralized-party examples were developed
and live-tested against Participant 3.5.7, then live-tested unchanged against
the isolated [Participant 3.5.8 sidecar](#optional-canton-358-participant-sidecar).
The workflow examples have completed 3.5.7 and 3.5.8 workflow matrices with
authenticated status evidence, the same unchanged implementation, and the
common compatibility path.

## Localnet launchers

The published package includes launchers for an existing CN Quickstart checkout.
Docker Compose must be installed and available. Set `CN_QUICKSTART_DIR` to the
checkout (or its `quickstart/` directory) when it is not in a supported relative
location.

After installing the package, run:

```bash
canton-localnet-start
canton-localnet-stop
```

You can also run them without a global install:

```bash
npm exec --package @distrohelena/canton-typescript-sdk canton-localnet-start
npm exec --package @distrohelena/canton-typescript-sdk canton-localnet-stop
```

These commands launch and stop CN Quickstart; they do not provision a
Quickstart checkout.

### Optional Canton 3.5.8 participant sidecar

For SDK compatibility work, an isolated Canton 3.5.8 participant can join an
already-running CN Quickstart localnet without changing its files or Compose
project:

```bash
canton-localnet-participant-358-start
canton-localnet-participant-358-stop
```

The sidecar owns `.generated/participant-358`, its `canton-participant-358`
Compose project, its Postgres container, and host ports `8901` (Ledger), `8902`
(Admin), and `8975` (JSON). The start launcher reads the existing localnet's
registered synchronizer via its Admin API, stores the exported connection
configuration in the sidecar runtime directory, and connects the sidecar with
its own Admin API. It generates a five-minute 3.5.8-compatible development JWT
at `.generated/participant-358/ledger-api-user.token`. When the connection is
healthy, use the protected child-shell credential flow below to make the
live-test and example endpoint/token variables available without logging them.
Canton 3.5.8 enforces this short lifetime for the unsafe development JWT.
`cn-quickstart` is strictly read-only: this launcher never writes to, starts,
or stops the normal Quickstart stack.

Refresh short-lived credentials before expiry without restarting or otherwise
touching the running containers. Use the launcher's protected documented
credential refresh flow only in a local child shell; do not log its output or
expose refreshed credentials beyond that child. The runtime credential file
remains protected with mode `0600`.

After the protected credential flow completes, run the example inside that same
short-lived credential-scoped child shell:

```bash
npm run example:party:decentralized
```

The defaults target the normal insecure shared-secret localnet at
`localhost:3902` on its `quickstart` Docker network. Override them when your
localnet differs:

```bash
PARTICIPANT_358_SOURCE_ADMIN_ENDPOINT=localhost:3902 \
PARTICIPANT_358_NETWORK=quickstart \
canton-localnet-participant-358-start
```

Provide any required source-admin credential only through the protected
child-scoped credential mechanism described above; do not place credentials in
command lines or logs.

Use `PARTICIPANT_358_CANTON_IMAGE`, `PARTICIPANT_358_PROJECT_NAME`,
`PARTICIPANT_358_RUNTIME_DIR`, `PARTICIPANT_358_LEDGER_PORT`,
`PARTICIPANT_358_ADMIN_PORT`, and `PARTICIPANT_358_JSON_PORT` to make an
explicitly isolated variant. The opt-in Docker check requires a running
localnet and is never part of the normal test suite:

```bash
PARTICIPANT_358_SMOKE_TEST=1 npm run test:participant-358-sidecar-smoke
```

### Optional ES256 bearer tokens

Set `LOCALNET_ES256_JWT=1` when starting the localnet to add ES256 JWT
verification to the primary participants and any `EXTRA_PARTICIPANTS`. The
existing `AUTH_MODE` stays active for Quickstart's internal services.

By default, the launcher creates reusable P-256 development key material and
a self-signed certificate in `.generated/localnet-es256` at the package root. Set
`LOCALNET_ES256_ROTATE=1` to replace generated material, or set both
`LOCALNET_ES256_PRIVATE_KEY_PATH` and `LOCALNET_ES256_CERTIFICATE_PATH` to
use your own matching PEM private key and certificate.

The launcher writes a short-lived (ten-minute) token for `ledger-api-user` to
`ledger-api-user.token` in that runtime directory and prints its path. In a
short-lived child shell, use a protected local credential mechanism to make the
token available without placing its value or a token-file read in a command
line or log. From within that same child shell, run the live SDK suite:

```bash
npm run test:live
```

This is development-only key material. A custom `LOCALNET_ES256_SUBJECT` must
already be a Ledger API user with the appropriate rights on each participant.
Extra participants use the existing shared-secret onboarding flow; the current
OAuth2-plus-extras limitation still applies.

### Optional localnet TLS

Set `LOCALNET_TLS=1` to enable TLS on every participant Ledger API and Admin API
listener, including generated extra participants. TLS is disabled by default,
so `LOCALNET_TLS=0` preserves the existing Quickstart behavior. The launcher
uses direct Compose mode when TLS is enabled so it can apply the generated
configuration overlay.

By default, development-only material is generated in
`.generated/localnet-tls`: `ca.crt`, `server.crt`, and `server.key`. Set
`LOCALNET_TLS_ROTATE=1` to replace it. To provide your own material, set all
three variables together:

```bash
LOCALNET_TLS=1 \
LOCALNET_TLS_CERT_CHAIN_PATH=/path/to/server-chain.pem \
LOCALNET_TLS_PRIVATE_KEY_PATH=/path/to/server-key.pem \
LOCALNET_TLS_CA_CERT_PATH=/path/to/root-ca.pem \
canton-localnet-start
```

The server certificate must cover the hostname used by the client, normally
`localhost` for host-side SDK calls. Client certificate authentication is not
enabled; authentication remains controlled by the existing Quickstart
`AUTH_MODE` and optional ES256 settings.

The SDK gRPC channels remain TLS by default. For generated localnet material,
pass the generated CA to the client:

```ts
import { readFileSync } from "node:fs";

const client = new CantonClient(new CantonClientOptions({
    transportKind: TransportKind.grpc,
    ledgerEndpoint: "localhost:3901",
    ledgerAdminEndpoint: "localhost:3902",
    participantAdminEndpoint: "localhost:3902",
    grpcTlsRootCertificates: readFileSync(
        ".generated/localnet-tls/ca.crt",
    ),
}));
```

The live suite runs single-worker with an extended timeout because it mutates and reads a shared localnet.

Prerequisites:

- CN quickstart is already running on your machine
- the suite is expected to fail fast if the configured node is unreachable

Default local endpoints:

- gRPC ledger: `http://localhost:3901`
- gRPC ledger admin: `http://localhost:3901`
- gRPC participant admin: `http://localhost:3902`
- JSON ledger and ledger admin: `http://localhost:3975`

Override environment variables:

- `SDK_TEST_LEDGER_ENDPOINT`
- `SDK_TEST_LEDGER_ADMIN_ENDPOINT`
- `SDK_TEST_PARTICIPANT_ADMIN_ENDPOINT`
- `SDK_TEST_SECONDARY_LEDGER_ENDPOINT`
- `SDK_TEST_SECONDARY_LEDGER_ADMIN_ENDPOINT`
- `SDK_TEST_SECONDARY_PARTICIPANT_ADMIN_ENDPOINT`
- `SDK_TEST_TERTIARY_LEDGER_ENDPOINT`
- `SDK_TEST_TERTIARY_LEDGER_ADMIN_ENDPOINT`
- `SDK_TEST_TERTIARY_PARTICIPANT_ADMIN_ENDPOINT`

The live harness also supports bearer-token overrides:

- `SDK_TEST_LEDGER_BEARER_TOKEN`
- `SDK_TEST_LEDGER_ADMIN_BEARER_TOKEN`
- `SDK_TEST_PARTICIPANT_ADMIN_BEARER_TOKEN`

For CN quickstart shared-secret mode, the harness generates a default bearer token automatically using:

- subject `ledger-api-user`
- audience `https://canton.network.global`
- shared secret `unsafe`

Run:

```bash
npm run test:live
```

The opt-in live stateful fuzz campaign uses the two-participant CN quickstart
`Main:Iou` fixture. It is disabled by default and must be enabled explicitly:

```bash
SDK_TEST_ENABLE_LIVE_FUZZING=1 \
FUZZ_NUM_RUNS=20 \
npm run test:live:fuzz
```

The campaign requires both gRPC participants, with node 0 using
`SDK_TEST_LEDGER_ENDPOINT`, `SDK_TEST_LEDGER_ADMIN_ENDPOINT`, and
`SDK_TEST_PARTICIPANT_ADMIN_ENDPOINT`, and node 1 using the corresponding
`SDK_TEST_SECONDARY_*` variables. It allocates an issuer on participant A and
an owner on participant B unless `FUZZ_LIVE_ISSUER_PARTY` and
`FUZZ_LIVE_OWNER_PARTY` are both supplied. For exact replay, keep those party
IDs, `FUZZ_LIVE_RUN_ID`, `FUZZ_SEED`, and `FUZZ_PATH` unchanged.

Campaign controls include:

- `FUZZ_LIVE_DEPTH=N` for exact-depth Foundry-style runs. If it is absent,
  `FUZZ_LIVE_MAX_COMMANDS=N` retains the legacy variable-length behavior;
  equal values are accepted when both are supplied, while conflicting values
  fail fast.
- `FUZZ_LIVE_FAIL_ON_REVERT=true|false` controls protocol reverts. It defaults
  to `false`; transport errors, timeouts, malformed responses, and ambiguous
  commit outcomes remain fatal. `FUZZ_LIVE_REQUIRE_ARCHIVE=true|false` also
  accepts legacy `1|0` and requires strict reverts for archive smoke mode.
- `FUZZ_LIVE_ACTION_WEIGHTS=query=30,fetch=20,events=20,exercise=10,probe=20`
  sets non-negative action weights. Exact-depth campaigns always retain a
  no-contract `probe` fallback and a post-archive read action.
- `FUZZ_LIVE_ACTORS=issuer,owner` selects eligible actors. `issuer` is
  mandatory; omitting `owner` removes owner-targeted generated reads while
  retaining the cross-participant fixture checks.
- `FUZZ_LIVE_POLL_TIMEOUT_MS`, `FUZZ_LIVE_POLL_INTERVAL_MS`,
  `FUZZ_LIVE_TEST_TIMEOUT_MS`, and `FUZZ_LIVE_CLEANUP_TIMEOUT_MS` control
  polling and timeouts.
- `FUZZ_LIVE_FAILURE_DIR` defaults to `tests/live/.artifacts/failures`.
  `FUZZ_LIVE_REPLAY_FAILURES=true|false` enables automatic replay of valid
  artifacts in that directory; stale or corrupt automatic artifacts are
  reported and skipped. `FUZZ_LIVE_REPLAY_FILE=/path/to/failure.json` performs
  explicit replay and validates run ID, party IDs, and fingerprints before
  connecting to participants.

Artifacts contain allowlisted campaign data only: endpoints, credentials,
headers, and arbitrary error objects are never serialized. They are written
with restrictive permissions and no-clobber atomic persistence. For a strict
four-step smoke run, use:

```bash
SDK_TEST_ENABLE_LIVE_FUZZING=1 \
FUZZ_NUM_RUNS=1 \
FUZZ_LIVE_DEPTH=4 \
FUZZ_LIVE_FAIL_ON_REVERT=true \
FUZZ_LIVE_REQUIRE_ARCHIVE=1 \
FUZZ_LIVE_FAILURE_DIR=tests/live/.artifacts/smoke \
npm run test:live:fuzz
```

This fixture assumes the CN quickstart already has the `Main:Iou` package on
both participants. The ledger-only DAML Ops localnet launcher is not a
substitute: open ports are insufficient without the quickstart Ledger API,
package, party, and cross-participant visibility checks.

Experimental multi-host external-party coverage is opt-in:

- set `SDK_TEST_ENABLE_MULTI_HOST_EXTERNAL_PARTY=1` to enable the multi-host live spec
- the default quickstart assumptions cover 2 nodes (`390x` and `490x`)
- configure the tertiary endpoint variables above to enable the 3-host scenario

## Shared Client

```ts
import {
    AllocatePartyRequest,
    BearerTokenAuthProvider,
    CantonClient,
    CantonClientOptions,
    HealthCheckRequest,
    GetLedgerApiVersionRequest,
    TransportKind,
} from "@distrohelena/canton-typescript-sdk";
import { ledgerApiV2 } from "@distrohelena/canton-typescript-sdk/protobuf";

const client = new CantonClient(
    new CantonClientOptions({
        transportKind: TransportKind.json,
        ledgerEndpoint: "https://ledger.example.com",
        ledgerAdminEndpoint: "https://ledger-admin.example.com",
        participantAdminEndpoint: "https://participant-admin.example.com",
        ledgerAuthProvider: new BearerTokenAuthProvider("ledger-token"),
        ledgerAdminAuthProvider: new BearerTokenAuthProvider(
            "ledger-admin-token",
        ),
        participantAdminAuthProvider: new BearerTokenAuthProvider(
            "participant-admin-token",
        ),
    }),
);

const version = await client.versionService.getLedgerApiVersionAsync(
    new GetLedgerApiVersionRequest(),
);
const health = await client.healthService.checkAsync(
    new HealthCheckRequest({
        service: "grpc.health.v1.Health",
    }),
);
const party = await client.partyManagementService.allocatePartyAsync(
    new AllocatePartyRequest({
        partyIdHint: "Alice",
        displayName: "Alice",
    }),
);
const contracts = await client.stateService.getActiveContractsPageAsync(
    ledgerApiV2.GetActiveContractsPageRequest.create({
        eventFormat: {
            filtersByParty: {
                Alice: { cumulative: [] },
            },
            verbose: true,
        },
    }),
);
```

`stateService.getActiveContractsPageAsync(...)` is gRPC-only and accepts the generated Ledger API request, including its `eventFormat`, `activeAtOffset`, `maxPageSize`, and `pageToken` fields. Build party, template, and interface filters in `eventFormat`.

`stateService.getActiveContractsPagesAsync(...)` is the gRPC-only lazy, raw, bounded traversal API. It starts from the same generated request and yields raw `GetActiveContractsPageResponse` values one page at a time. The caller selects the shared `OperationDeadline`, maximum pages, and maximum contracts with `ActiveContractsTraversalOptions`; there is no collect-all wrapper. Transport errors from dispatched RPCs propagate unchanged. Traversal safety, invariant, and bound failures use `ActiveContractsTraversalError` codes, such as an inconsistent offset, repeated page token, or exceeded bound.

JSON does not implement either paginated gRPC API. Its existing `stateService.getActiveContractsAsync(...)` behavior remains the distinct JSON streaming read.

For interface views, do not use `contractService.getContractAsync(...)`. That contract lookup surface cannot return interface views; use `stateService` or `updateService` instead.

`CantonClient` now splits its public surface across the real API boundaries:

- ledger services use `ledgerEndpoint`
- ledger admin services use `ledgerAdminEndpoint`
- participant admin services use `participantAdminEndpoint`

For gRPC, channel security resolves per surface:

- ledger services use `ledgerGrpcChannelSecurity ?? grpcChannelSecurity ?? GrpcChannelSecurity.tls`
- ledger admin services use `ledgerAdminGrpcChannelSecurity ?? grpcChannelSecurity ?? GrpcChannelSecurity.tls`
- participant admin services use `participantAdminGrpcChannelSecurity ?? grpcChannelSecurity ?? GrpcChannelSecurity.tls`

### gRPC error handling

gRPC failures reject with `GrpcTransportError`, a `TransportError` subclass
with the gRPC status code, service/method, copied metadata, and decoded
`google.rpc.Status` trailer when Canton provides one. Use `onGrpcError` for
centralized logging or telemetry; it observes the error but cannot replace the
rejection if the callback itself fails.

```ts
import { GrpcTransportError } from "@distrohelena/canton-typescript-sdk";

const client = new CantonClient(new CantonClientOptions({
    // existing gRPC connection options,
    onGrpcError: (error) => {
        logger.error({ code: error.grpcCode, status: error.status });
    },
}));

try {
    await client.userManagementService.listUsersAsync(/* request */);
} catch (error) {
    if (error instanceof GrpcTransportError) {
        console.error(error.grpcCode, error.serviceName, error.methodName);
    }
}
```

Application-specific `google.protobuf.Any` values in `error.status.details`
remain opaque (`typeUrl` and bytes) unless the application knows that type.

### External party lifecycle

For an externally controlled party, provide the public key and a callback that
delegates signing to your HSM, KMS, wallet, or other key service. The SDK
generates the Canton topology, requests signatures for each topology
transaction and its multihash, then allocates the party. It never receives a
private key.

```ts
import {
    CreateExternalPartyRequest,
    ExternalPartyCryptoKeyFormat,
    ExternalPartySignatureFormat,
    ExternalPartySigningAlgorithmSpec,
    ExternalPartySigningKeySpec,
    ExternalPartySigningPublicKey,
} from "@distrohelena/canton-typescript-sdk";

const party = await client.partyManagementService.createExternalPartyAsync(
    new CreateExternalPartyRequest({
        synchronizer: "sync::sandbox",
        partyHint: "alice",
        publicKey: new ExternalPartySigningPublicKey({
            format: ExternalPartyCryptoKeyFormat.raw,
            keyData: ed25519PublicKeyBytes,
            keySpec: ExternalPartySigningKeySpec.ecCurve25519,
        }),
        sign: async ({ payload }) => ({
            signature: await keyService.sign(payload),
            format: ExternalPartySignatureFormat.raw,
            signingAlgorithmSpec: ExternalPartySigningAlgorithmSpec.ed25519,
        }),
    }),
);
```

Use the same flow for secp256k1 by supplying
`ExternalPartySigningKeySpec.ecSecp256k1` and the signer’s compatible Canton
signature format and algorithm. This convenience operation is gRPC-only.

## Service Map

## Canton Manager queries

`CantonManager` keeps gRPC as the write path and selects one typed-query source
at initialization. The same typed query function works with either gRPC or
PQS; source selection changes how the data is read, not the query grammar.

```ts
import {
    CantonClientOptions,
    CantonManager,
    CreateCommand,
    DamlRecord,
    MemoryQueryCache,
    QuerySource,
    SubmitCommandsRequest,
    TransportKind,
} from "@distrohelena/canton-typescript-sdk";

const options = {
    grpc: new CantonClientOptions({
        transportKind: TransportKind.grpc,
        ledgerEndpoint: "localhost:6865",
    }),
    pqs: { connectionString: process.env.PQS_URL!, schema: "public" },
    cache: { store: new MemoryQueryCache(), ttlMs: 5_000 },
};

const readIous = (manager: CantonManager) => manager.query.contracts.findMany({
    where: { templateId: { moduleName: { equals: "Main" }, entityName: { equals: "Iou" } } },
    orderBy: [{ createdAt: "desc" }],
    take: 50,
});

const pqsManager = new CantonManager({ ...options, querySource: QuerySource.pqs });
const grpcManager = new CantonManager({ ...options, querySource: QuerySource.grpc });
const pqsContracts = await readIous(pqsManager);
const grpcContracts = await readIous(grpcManager);

// gRPC caching is explicit and point-in-time; ordinary reads never populate it.
await grpcManager.query.cacheContracts({ parties: ["Alice"] });
await grpcManager.query.invalidateContractsCache({ parties: ["Alice"] });

// A SubmitCommandsRequest contains a non-empty ordered atomic command batch:
// all commands commit together, or none of them do.
await grpcManager.grpc.commandService.submitAndWaitAsync(
    new SubmitCommandsRequest({
        applicationId: "example-app",
        actAs: ["Alice"],
        commands: [
            new CreateCommand({
                templateId: { packageId: "", moduleName: "Main", entityName: "Message" },
                createArguments: new DamlRecord({ author: "Alice", body: "Hello" }),
            }),
        ],
    }),
);
await Promise.all([pqsManager.disposeAsync(), grpcManager.disposeAsync()]);
```

To migrate a prior singleton submission, pass `commands: [previousCommand]`.
There is no compatibility alias; put multiple independent commands in that
array in their required atomic order.

An options object may contain both `grpc` and `pqs`; the PQS setting is used
only when `querySource` is `pqs`. Both sources expose `contracts`,
`contractTypes`, `events`, `exercises`, `exerciseTypes`, `packages`,
`transactions`, and `watermark`, including filters, includes, ordering,
pagination, projections, grouping, and aggregates. Literal parity requires
PQS and gRPC to observe the same participant-visible data; independently
configured participants can legitimately see different contracts.

`cacheContracts` is a gRPC-only explicit prewarm of active contracts for one
party scope. It needs a cache store and a positive TTL; reads may use a valid
entry but never renew it. A cached gRPC result is internally consistent at its
`activeAtOffset`, so it can be stale until expiry, refresh, or
`invalidateContractsCache`. Under PQS the same lifecycle calls are safe no-ops
and `cacheContracts` returns `{ source: QuerySource.pqs, cached: false }`.

Typed-query `pk`/`ix` values are canonical and source-independent. Transaction
and watermark keys are ledger offsets; event, package, contract-type, and
exercise-type keys are lossless positive-decimal encodings of their stable
semantic identities. PQS physical keys are retained only for internal joins.
If pruning has removed history needed by a gRPC typed query, it rejects with
`QuerySnapshotIncompleteError` rather than returning partial rows, groups, or
aggregates.

Raw SQL is the sole PQS-only query operation: use
`pqsManager.query.$queryRaw(...)` for one read-only statement with positional
parameters and a read-only PostgreSQL role. `$queryRaw` on a gRPC manager
rejects with `QueryCapabilityError`.

The typed relation delegates use a Prisma-like surface: `findMany({ where,
select, orderBy, skip, take })`, `findUnique({ where, select })`, `count`, and
`aggregate({ count, min, max, sum })`. Filters support `equals`, `in`,
`{ is: null }`, `{ isNot: null }`, and `{ has: party }` on array fields.
Ordering accepts an ordered list of one-field entries, so multi-field ordering
uses `[{ createdAt: "desc" }, { contractId: "asc" }]`. `exercises` intentionally has no `findUnique`
because the v1 PQS profile does not declare a stable key. The manager validates
the selected PQS schema profile before its first PQS query.

- Ledger endpoint:
- `versionService.getLedgerApiVersionAsync(...)`: `json`, `grpc`
- `healthService.checkAsync(...)`: `grpc` only
- `packageService.listPackagesAsync(...)`: `grpc` only
- `packageService.getPackageAsync(...)`: `grpc` only
- `packageService.getPackageStatusAsync(...)`: `grpc` only
- `packageService.listVettedPackagesAsync(...)`: `grpc` only
- `commandService.submitAndWaitAsync(...)`: `json`, `grpc`
- `commandSubmissionService.submitAsync(...)`: reserved, currently unsupported
- `stateService.getActiveContractsPageAsync(...)`: `grpc` only
- `stateService.getActiveContractsPagesAsync(...)`: `grpc` only, lazy raw bounded traversal
- `stateService.getActiveContractsAsync(...)`: `json` only, existing distinct streaming read
- `updateService.getUpdatesAsync(...)`: `grpc` only
- `commandCompletionService.getCompletionsAsync(...)`: `grpc` only, existing streaming API
- `eventQueryService.getEventsByContractIdAsync(...)`: `grpc` only; JSON rejects this request
- `contractService.getContractAsync(...)`: `grpc` only; JSON rejects this request

- Ledger Admin endpoint:
- `partyManagementService.allocatePartyAsync(...)`: `json`, `grpc`
- `partyManagementService.listKnownPartiesAsync(...)`: `json`, `grpc`
- `partyManagementService.getParticipantIdAsync(...)`: `grpc` only
- `partyManagementService.getPartiesAsync(...)`: `grpc` only
- `partyManagementService.generateExternalPartyTopologyAsync(...)`: `grpc` only
- `partyManagementService.allocateExternalPartyAsync(...)`: `grpc` only
- `partyManagementService.createExternalPartyAsync(...)`: `grpc` only
- `userManagementService.grantUserRightsAsync(...)`: `json`, `grpc`
- `packageManagementService.uploadDarFileAsync(...)`: `json`, `grpc`

- Participant Admin endpoint:
- `participantPackageService.listPackagesAsync(...)`: `grpc` only
- `participantPackageService.getPackageContentsAsync(...)`: `grpc` only
- `participantPackageService.getPackageReferencesAsync(...)`: `grpc` only
- `participantStatusService.getParticipantStatusAsync(...)`: `grpc` only
- `topologyManagerReadService.*`: `grpc` only
- `topologyAggregationService.*`: `grpc` only
- `topologyManagerWriteService.authorizeAsync(...)`: `grpc` only
- `topologyManagerWriteService.addTransactionsAsync(...)`: `grpc` only
- `topologyManagerWriteService.importTopologySnapshotAsync(...)`: `grpc` only
- `topologyManagerWriteService.importTopologySnapshotV2Async(...)`: `grpc` only
- `topologyManagerWriteService.signTransactionsAsync(...)`: `grpc` only
- `topologyManagerWriteService.generateTransactionsAsync(...)`: `grpc` only
- `topologyManagerWriteService.createTemporaryTopologyStoreAsync(...)`: `grpc` only
- `topologyManagerWriteService.dropTemporaryTopologyStoreAsync(...)`: `grpc` only
- `topologyManagerWriteService.assembleSignedTransactions(...)`: SDK-local on any client

Raw topology-write mapping support currently starts with `PartyToParticipant`. The detached-signature assembler is transport-independent, but the actual participant-admin write RPCs are `grpc` only and JSON rejects them with `NotSupportedError`.

## Protocol-Specific Clients

Subpath exports are available when you want to construct directly over a transport adapter:

- `@distrohelena/canton-typescript-sdk/grpc`
- `@distrohelena/canton-typescript-sdk/json`
- `@distrohelena/canton-typescript-sdk/daml-lf`
- `@distrohelena/canton-typescript-sdk/debugger`
- `@distrohelena/canton-typescript-sdk/daml-interface`

`GrpcLedgerClient` and `JsonLedgerClient` expose the same service properties as `CantonClient`.

JSON does not provide a `grpc.health.v1.Health.Check` equivalent. The shared SDK still exposes `healthService`, but JSON rejects calls with `NotSupportedError`.
JSON also does not provide a participant-admin status equivalent, so `participantStatusService` is currently `grpc` only.
JSON also does not expose the ledger-admin external-party RPCs, so `partyManagementService.generateExternalPartyTopologyAsync(...)` and `partyManagementService.allocateExternalPartyAsync(...)` are `grpc` only.

## DAML-LF Parser

The package also exposes a separate DAML-LF front-end at `@distrohelena/canton-typescript-sdk/daml-lf`.

Current scope:

- artifact-centric `DAR` and `DALF` loading
- LF `2.x` decoding
- immutable package/module/definition model
- workspace, compilation, and symbol resolution
- semantic queries over the compiled model
- evaluator core and trace-sink contracts
- replay-effect tracing for debugger-owned sessions

Example:

```ts
import {
    DarArchiveLoader,
    DamlLfCompilation,
    DamlLfPackageLoader,
    DamlLfWorkspace,
} from "@distrohelena/canton-typescript-sdk/daml-lf";

const archive = await new DarArchiveLoader().loadDarOrThrowAsync(darBytes);
const packageLoader = new DamlLfPackageLoader();
const packageModel = packageLoader.loadPackageOrThrow(
    archive.mainPackageEntry.bytes,
);
const workspace = new DamlLfWorkspace([packageModel]);
const compilation = DamlLfCompilation.createOrThrow(workspace);
const semanticModel = compilation.createSemanticModel();
```

## Replay Debugger

The package also exposes an experimental replay debugger at `@distrohelena/canton-typescript-sdk/debugger`.

Current scope:

- load a replay session from a committed update offset
- hydrate referenced contracts through the gRPC contract and event-query services
- precompute a stepwise LF trace and expose stepping/session APIs
- replay LF update bodies for the supported evaluator subset, including nested exercise-driven effects
- validate replay determinism against the observed update payload

Current limits:

- replay depends on gRPC-visible create/exercise payloads
- source-aware replay expects DAR provenance with debugger source-map metadata
- unsupported LF constructs still fail fast with `ReplayUnsupportedLfConstructException`
- source locations currently map to executable definition spans from the DAR source map

Example:

```ts
import {
    LedgerReplayDebuggerClient,
    ReplaySessionRequest,
} from "@distrohelena/canton-typescript-sdk/debugger";

const debuggerClient = new LedgerReplayDebuggerClient({
    sessionLoader,
});

const session = await debuggerClient.loadSessionAsync(
    new ReplaySessionRequest({ offset: "42" }),
);
```

## DAML Interface Generator

The `@distrohelena/canton-typescript-sdk/daml-interface` subpath exposes a generator that turns compiled `DAR` or `DALF` artifacts into an in-memory TypeScript binding project.

Current generated output shape:

- one file per template
- shared support files
- a registry file
- an index file

Example:

```ts
import { DamlInterfaceGenerator } from "@distrohelena/canton-typescript-sdk/daml-interface";

const project = await new DamlInterfaceGenerator().generateFromDalfOrThrowAsync(
    dalfBytes,
);

console.log(project.templateFiles[0].path);
console.log(project.registryFile?.path);
console.log(project.indexFile?.path);
```

You can also write the generated project to disk:

```ts
import {
    DamlInterfaceGenerator,
    DamlInterfaceWriter,
} from "@distrohelena/canton-typescript-sdk/daml-interface";

const generator = new DamlInterfaceGenerator();
const writer = new DamlInterfaceWriter();
const project = await generator.generateFromDarOrThrowAsync(darBytes);

await writer.writeProjectAsync(project, "./artifacts");
```

CLI:

```bash
npm run generate:daml-interface -- --input ./sample.dalf --output ./artifacts
```

Current limits:

- generation is strict and throws when a template shape is not supported yet
- milestone 1 supports the current `daml-lf` text-based analyzer surface only
- the generator works from compiled artifacts, not `.daml` source files

## External Signing

External signing is supported on `grpc` only through `ICommandSigner`.

```ts
import {
    ICommandSigner,
    SignCommandRequest,
    SignCommandResult,
} from "@distrohelena/canton-typescript-sdk";

class ExampleSigner implements ICommandSigner {
    public async signAsync(
        request: SignCommandRequest,
    ): Promise<SignCommandResult> {
        return new SignCommandResult({
            algorithm: "ed25519",
            signature: request.payload,
        });
    }
}
```

See [DOCUMENTATION.md](./DOCUMENTATION.md) for the full function-by-function reference.
