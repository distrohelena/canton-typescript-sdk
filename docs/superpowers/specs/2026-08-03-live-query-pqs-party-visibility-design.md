# Live Query PQS Party Visibility Design

## Problem

The live query parity fixture currently allocates a new party for every run. The
configured app-provider PQS instance ingests as `app-provider-pqs-user`, whose
ledger rights normally expose only a pre-onboarded party. Granting the separate
command user permission to act as the newly allocated party does not expand the
PQS ingestion stream, so the fixture commands succeed while every PQS readiness
query remains empty.

## Design

The parity fixture will resolve its seeding party before submitting commands.
Resolution has strict precedence:

1. A nonblank `SDK_TEST_PQS_VISIBLE_PARTY` is authoritative. The fixture uses it
   without querying PQS-user rights or allocating a party.
2. Otherwise the fixture lists rights for
   `SDK_TEST_PQS_LEDGER_USER_ID ?? "app-provider-pqs-user"` through the public
   `UserManagementServiceClient.listUserRightsAsync` API and a
   `ListUserRightsRequest`.
3. A `UserRightKind.canReadAsAnyParty` right permits the fixture to allocate its
   existing unique `sdk-query-parity-<run-id>` party.
4. Without that global right, the fixture deduplicates parties from
   `UserRightKind.canReadAs` and `UserRightKind.canActAs`. Exactly one party is
   accepted.
5. Zero or multiple usable parties produce an explicit configuration error.

After resolution, the fixture grants the command user permission to act as the
chosen party and creates one active and one archived `Main:Iou`, as it does now.
The pruning fixture is unchanged and continues allocating a unique dedicated
local party.

## Boundaries and Error Handling

The resolver lives in the live parity runtime module and accepts optional
configuration values so unit tests can exercise resolution without mutating
process-wide environment state. Its defaults read the two `SDK_TEST_*`
variables. Blank override values are treated as absent. Errors name the PQS
ledger user and explain whether no usable visible party or multiple parties were
found, pointing callers to `SDK_TEST_PQS_VISIBLE_PARTY` for disambiguation.

## Tests

Offline unit tests use a mocked manager boundary to cover:

- authoritative explicit-party selection with no rights lookup or allocation;
- default and overridden PQS ledger-user request selection;
- unique allocation when `canReadAsAnyParty` is present;
- reuse of one deduplicated `canReadAs`/`canActAs` party;
- explicit rejection of missing usable visibility; and
- explicit rejection of multiple visible parties.

Focused live-runtime unit tests, ESLint, the TypeScript ESM/CJS build, and a diff
check provide completion evidence. The controller owns the subsequent live
rerun.
