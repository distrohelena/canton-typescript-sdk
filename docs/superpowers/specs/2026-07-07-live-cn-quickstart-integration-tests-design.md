# Live CN Quickstart Integration Tests Design

## Summary

The Canton TypeScript SDK should gain a dedicated live integration test suite that runs against an already-running CN quickstart localnet.

This suite is not a mock-backed transport test layer. It is a real end-to-end SDK validation layer that:
- uses only the public `CantonClient`
- connects to live local quickstart endpoints
- exercises both `grpc` and `json` where the SDK surface supports both
- creates real data through SDK writes when needed to make reads meaningful
- fails fast when the localnet is unavailable

The suite should also define a coverage matrix for the full public `CantonClient` surface so the repository has an explicit record of:
- what is live-tested now
- what is intentionally deferred
- what is transport-specific
- what is blocked by missing write/setup capability

## Goals

- Add a dedicated live integration suite for the public `CantonClient`.
- Validate real SDK behavior against a running CN quickstart localnet.
- Cover every public SDK function that is meaningfully testable today.
- Use real SDK writes to seed the ledger/admin state required by follow-up reads.
- Exercise both `grpc` and `json` transports where the SDK surface supports both.
- Fail immediately when the target localnet is unreachable or misconfigured.
- Create a durable coverage matrix for every public `CantonClient` function.
- Keep the suite honest: no mocks, no fake servers, no empty-result assertions that prove nothing.

## Non-Goals

- Start or stop CN quickstart from the test process.
- Hide connectivity problems behind skipped tests.
- Replace the existing unit, contract, or mock-backed transport tests.
- Force all live tests into normal `npm test`.
- Pretend unsupported or not-yet-meaningful surfaces are covered.
- Add topology write flows in this pass.
- Add full auth coverage in the first pass.

## Constraints And Assumptions

- The developer starts CN quickstart manually before running the live suite.
- The first pass defaults to unauthenticated local quickstart usage.
- Endpoint defaults should target standard local quickstart values, with environment variable overrides.
- The public `CantonClient` is the only client surface under test.
- Some public functions need write paths or domain-specific setup that the SDK does not expose yet; those functions must be classified explicitly instead of faked.

## Public Test Contract

The live suite should be treated as the SDK's closest approximation to real user behavior.

That means:
- all calls go through `CantonClient`
- transport selection happens through normal client options
- request and response types are the public SDK types
- setup data is created through the same public service methods that application code would use

The suite should not:
- instantiate internal generated clients
- call transport mappers directly
- inject fake HTTP or gRPC handlers
- use mock servers or fake protocol responses

## Execution Model

Add a dedicated command for live validation, separate from normal repository tests.

Recommended command:
- `npm run test:live`

This command should:
1. load live test configuration
2. probe the configured endpoints immediately
3. abort on the first hard connectivity or misconfiguration failure
4. build reusable seeded test context
5. execute the live service suites
6. report coverage classification for all known public functions

The live suite should not be part of:
- `npm test`
- CI by default in this phase

## Configuration Model

The suite should use quickstart-friendly defaults, with environment variables as overrides.

Recommended environment variables:
- `SDK_TEST_LEDGER_ENDPOINT`
- `SDK_TEST_LEDGER_ADMIN_ENDPOINT`
- `SDK_TEST_PARTICIPANT_ADMIN_ENDPOINT`

Future auth-oriented variables can be added later, for example:
- `SDK_TEST_LEDGER_BEARER_TOKEN`
- `SDK_TEST_LEDGER_ADMIN_BEARER_TOKEN`
- `SDK_TEST_PARTICIPANT_ADMIN_BEARER_TOKEN`

First-pass behavior:
- if an override is present, use it
- otherwise use standard local quickstart defaults
- if the resulting endpoint set is unreachable, fail fast

## Live Harness Design

The live suite should have a small runtime layer that all specs share.

### Environment Loader

Responsibilities:
- read override env vars
- provide default local endpoints
- validate required configuration
- surface clear startup errors

### Client Factory

Responsibilities:
- create public `CantonClient` instances
- support `grpc` and `json`
- apply the same endpoint model as real application usage
- optionally inject future auth providers without changing test structure

### Connectivity Preflight

Responsibilities:
- prove the localnet is reachable before expensive setup begins
- verify ledger endpoint availability
- verify ledger admin endpoint availability
- verify participant admin endpoint availability when participant-admin tests are in scope

The preflight should fail the suite, not skip it.

### Seeded Test Context

Responsibilities:
- create deterministic run-scoped test data once
- cache created identifiers for downstream specs
- avoid each spec redoing the same expensive setup

The seeded context should be the single source of truth for artifacts such as:
- allocated test parties
- created users or granted rights
- uploaded DAR/package identifiers
- any future contract/template fixtures

## Test Data Strategy

Meaningful live reads require meaningful live writes.

The suite should therefore create real test data through SDK writes before asserting read behavior.

### Naming

Use deterministic, collision-resistant names with an SDK-owned prefix, for example:
- `sdk-live-party-<run-id>`
- `sdk-live-user-<run-id>`

This makes failures easier to inspect without mixing test artifacts with unrelated local data.

### Reuse

Seed data once per run and reuse it across service suites where practical.

This reduces:
- runtime
- duplicate setup complexity
- accidental differences between test scenarios

### Cleanup

Do not block the suite on perfect cleanup in phase 1.

Some localnet artifacts may remain after a run. That is acceptable initially as long as:
- names are test-scoped
- collisions are avoided
- reads are written to tolerate prior local state outside the test namespace

## Coverage Model

Every public `CantonClient` function should appear in a machine-readable coverage matrix.

Each function should have one status, such as:
- `covered`
- `grpc-only`
- `json-only`
- `unsupported-on-json`
- `deferred-needs-write-path`
- `deferred-needs-domain-setup`
- `not-meaningful-on-empty-localnet`

Each non-covered entry should also carry a concise reason.

This matrix is important because the user goal is broader than "some live tests":
- it should show exactly what the SDK can validate today
- it should show what remains blocked
- it should prevent false claims of completeness

## Initial Phase 1 Coverage

Phase 1 should cover the public functions that are meaningful on a minimally prepared quickstart plus SDK-created setup data.

Recommended first-pass live coverage:
- ledger API version reads
- gRPC health checks
- party allocation
- known party reads
- DAR upload
- ledger package reads
- participant package reads
- participant status reads
- any surface that becomes meaningful directly from the above setup

This should include both `grpc` and `json` where both transports are supported.

## Deferred Coverage

Some public surfaces should be declared out of scope for phase 1 even though they remain in the coverage matrix.

### Topology Reads

Do not write live tests that merely assert empty topology results.

Low-level topology reads and aggregation reads need corresponding write/setup flows to prove anything meaningful. Until the SDK exposes the necessary write paths or the suite has a sanctioned external setup flow, these should be marked deferred with explicit reasons.

### Command / State / Contract / Event / Update Flows

These should move into live coverage when the suite owns a real DAR-backed workflow end to end:
- upload DAR
- create usable ledger/application context
- submit real commands
- read contracts, updates, and events back

This is phase 2, not phase 1.

### Auth Variants

Bearer-token and other auth-provider flows should have dedicated live suites later.

The first pass should keep the harness auth-ready but start unauthenticated.

## Proposed Directory Structure

Recommended structure:

- `tests/live/fixtures/`
  - endpoint defaults
  - env parsing
  - live test constants
- `tests/live/runtime/`
  - `CantonClient` factory
  - transport helpers
  - connectivity preflight
  - seeded run context
- `tests/live/scenarios/`
  - reusable setup flows that create data through public SDK writes
- `tests/live/specs/`
  - service-oriented live integration specs
- `tests/live/coverage/`
  - public surface coverage matrix and validation helpers

This split keeps concerns clean:
- runtime bootstrapping is not mixed into service assertions
- setup scenarios are reusable
- coverage accounting is separate from the test bodies

## Failure Model

The suite should fail loudly and early for infrastructure problems.

Examples:
- endpoint unreachable
- wrong port/protocol
- expected surface missing on the configured node
- auth unexpectedly required in a supposedly unauthenticated setup

It should not silently:
- skip the suite
- downgrade hard failures to warnings
- reinterpret infrastructure failure as test pass

Function-level unsupported behavior should still be represented honestly:
- if JSON does not support a surface, mark it transport-specific in the matrix
- if a service is not supposed to work on quickstart without extra setup, mark it deferred with the exact reason

## Testing Strategy

The live suite should complement the existing test pyramid instead of replacing it.

Existing layers still matter:
- unit tests verify mapping and client composition
- contract tests verify surface shape assumptions
- live tests verify end-to-end behavior against a real node

Phase 1 acceptance should require:
1. the live harness fails fast on bad connectivity
2. seeded setup works through public SDK writes
3. at least one meaningful live read exists for each phase 1 service area
4. both `grpc` and `json` are exercised where supported
5. the coverage matrix accounts for the full public `CantonClient` surface

## Decision Summary

Chosen decisions:
- use a dedicated live suite against an already-running CN quickstart localnet
- test only through the public `CantonClient`
- fail fast when the node is unreachable
- support both `grpc` and `json` where the SDK supports both
- use env vars as overrides, with quickstart defaults
- start unauthenticated in phase 1
- create real setup data through SDK writes
- classify every public function in a coverage matrix
- do not write meaningless empty-result tests for topology and similar surfaces
- defer auth variants and DAR-backed command/state/event coverage to later phases
