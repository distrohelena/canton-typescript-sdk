# Contract Lifecycle Audit Example Design

## Goal and scope

Add `examples/95-contract-lifecycle-audit.ts`, a standalone gRPC-only audit of
one `DebugPlayground:Message` contract's lifecycle.  It will create a
run-marked Message, read that active contract through `ContractService`, replace
it through the consuming `ReplaceText` choice, and prove the original's
create/archive history through `EventQueryService`.  It is an example of the
two Ledger API read contracts, not a new generic lifecycle abstraction.

Add the script:

```json
"example:workflow:contract-lifecycle-audit": "npm run build && node --loader ts-node/esm examples/95-contract-lifecycle-audit.ts"
```

to `package.json`, and add that command to the README Workflow examples list
and explanation.  The example remains repository-only: `package.json` packs
only `dist`, `node`, `README.md`, and `LICENSE`, while `.gitignore` excludes runtime
`.generated/` material.  Do not change the pinned DAR, any production SDK
surface, generated protobuf code, or the existing application workflows.

This design deliberately does **not** combine an update lookup with the
lifecycle audit.  `EventQueryService.GetEventsByContractId` is the contract-ID
history API.  Offset/update-id correlation belongs in a separate example 96 so
this example never mixes `getUpdateById`, `getUpdateByOffset`, or
`getUpdateByHash` semantics with the historical contract proof.

## Existing evidence and decisions

The current fixture is the pinned Explorer Debug Playground DAR.  Its
`Message` template has exactly `sender : Party`, `recipient : Party`, and
`text : Text`; `sender` is signatory, `recipient` is observer, and its
consuming `ReplaceText(replacement : Text)` creates a new Message.  Existing
`application-fixture.ts` already builds both commands and has
`assertExactCreatedMessagePayload`, `extractCreatedContract`,
`extractReplacementContracts`, and `readCreatedMessageText`.

The current `contract_service.proto` calls `ContractService` experimental/
alpha and explicitly says no backwards compatibility is guaranteed.  Its
`GetContract` endpoint accepts a contract ID plus optional `querying_parties`;
the result's `created_event` intentionally cannot populate `offset`, `node_id`,
`created_event_blob`, `interface_views`, or `acs_delta`.  The current public
client documents it as gRPC-supported and JSON-rejected.

The current `event_query_service.proto` says that
`GetEventsByContractId` returns the create event and, when present and not
pruned, the consuming archive event for that exact ID.  It returns the
sequencing synchronizer ID alongside each.  Its `event_format` is required and
the result shape is ACS delta (created plus archived), not ledger effects.
The public client likewise supports it only on gRPC; JSON currently throws
`NotSupportedError` for both lifecycle calls.

Live discovery against the common 3.5.7 and 3.5.8 participants established two
wire-shape rules that the example must preserve.  `EventFormat` template
filters use the existing package-name selector convention:
`Identifier.packageId` is `#${fixture.templateId.packageName}`, not the raw
package hash in `fixture.templateId.packageId`.  Both participants rejected
the raw hash selector with `INVALID_ARGUMENT`; this is a selector convention,
not a change to the package hash used by returned event template IDs.  Also,
`ContractService.GetContract` has no `verbose` option and returns the Message
arguments as exactly three blank-label fields—`party`, `party`, then `text`—on
both participants.  The root cause is that direct lookup and verbose history
have different materialized payload encodings: direct lookup is positional,
while EventQuery history remains verbose and labelled.  These are structural
requirements, not a participant-version branch or a status/error-prose match.

The example imports `OperationDeadline` from
`@distrohelena/canton-typescript-sdk` and the generated namespace as
`import { ledgerApiV2 } from "@distrohelena/canton-typescript-sdk/protobuf"`.
It must construct—not type-cast—the following generated shapes:

```ts
ledgerApiV2.GetContractRequest.create({
    contractId: string,
    queryingParties: [actor.party],
});
// Promise<ledgerApiV2.GetContractResponse>, { createdEvent?: CreatedEvent }

ledgerApiV2.GetEventsByContractIdRequest.create({
    contractId: string,
    eventFormat: ledgerApiV2.EventFormat.create({ ... }),
});
// Promise<ledgerApiV2.GetEventsByContractIdResponse>,
// { created?: { createdEvent?: CreatedEvent; synchronizerId: string },
//   archived?: { archivedEvent?: ArchivedEvent; synchronizerId: string } }
```

The public method signatures are
`contractService.getContractAsync(request, options)` and
`eventQueryService.getEventsByContractIdAsync(request, options)`.  The
namespace also exports `CreatedEvent`, `ArchivedEvent`, `EventFormat`,
`Filters`, `CumulativeFilter`, `TemplateFilter`, and `Identifier`; helper implementation may
use their type names but must obtain runtime messages with their generated
`.create(...)` factories.  This keeps oneof and optional-field checks aligned
with the current generated code rather than with invented DTOs.

Use the following decision table rather than guessing from a service name:

| Read | Decision | Reason |
| --- | --- | --- |
| Original before replacement | Call `ContractService.GetContract` and assert its supported materialized fields. | This proves the alpha direct lookup while the contract is active and visible to the named actor. |
| Replacement after `ReplaceText` | Call `ContractService.GetContract` with the replacement ID and prove the same supported fields for its exact replacement payload. | The replacement is active and has a known ID from the command response, so this is a valuable second direct-lookup proof rather than an inference from the exercise response. |
| Original after replacement | Do not call or assert `GetContract` success/failure. | The proto does not specify archived-contract lookup behavior or a stable error/result distinction, and the endpoint is alpha. Existing live-fuzz use reads a contract but does not establish archive semantics. A test that expects success or `CONTRACT_PAYLOAD_NOT_FOUND` would therefore turn an unspecified behavior into a portability promise. |
| Original history after replacement | Call `EventQueryService.GetEventsByContractId` and require both `created` and `archived`. | This is the documented, contract-ID-scoped historical result and gives the exact lineage without an update scan. |

No participant-version branch or version-specific error-message match is part
of the implementation.  The current workflow convention reads authenticated
participant version/release core and prints the selected common path.  The
same source must prove its structural result on 3.5.7 and 3.5.8; a future
branch needs newly recorded structural evidence, not a container tag, endpoint,
or prose error text.

## Concrete program flow

`95-contract-lifecycle-audit.ts` follows the shape of examples 93 and 94:
`runExampleAsync`, `createExampleClient`, and
`runClientWorkflowWithDisposalAsync`.  Create exactly one
`new OperationDeadline({ timeoutMs: exampleTimeoutMs() })` as the first action
inside the workflow.  Every unary RPC below receives a fresh
`deadline.createRequestOptions()`; no helper may reset a full independent
timeout.

1. Load the fixture with `loadExampleApplicationFixtureAsync`, prove/upload it
   with `ensureExampleDarUploadedAsync(client, fixture, deadline)`, resolve the
   actor with `resolveExamplePartyAsync(client, process.env, deadline)`, and
   read `readWorkflowCompatibilityAsync(client, deadline)`.  Preserve the
   established default/explicit party modes: a nonblank `SDK_EXAMPLE_PARTY` is
   used as supplied; otherwise allocate a new fallback party.  Warn when
   fallback allocation made durable topology state and always warn that DAR and
   contract state remain durable.
2. Generate `runId` from `randomBytes(12).toString("hex")`; derive distinct
   `originalText = \`contract-lifecycle-original-${runId}\``,
   `replacementText = \`contract-lifecycle-replacement-${runId}\``,
   `createCommandId = \`contract-lifecycle-create-${runId}\``, and
   `replaceCommandId = \`contract-lifecycle-replace-${runId}\``.  Submit
   `buildCreateMessageRequest` with `sender === recipient === actor.party` and
   `text === originalText`, then use `extractCreatedContract` to require its
   nonempty original ID.  The expected original payload is exactly the
   three-field Message `{ sender: actor.party, recipient: actor.party,
   text: originalText }`; it is not a loose text-marker match and introduces no
   second party.
3. Issue the direct active read visibly in the example:

   ```ts
   const originalLookup = await client.contractService.getContractAsync(
       ledgerApiV2.GetContractRequest.create({
           contractId: original.contractId,
           queryingParties: [actor.party],
       }),
       deadline.createRequestOptions(),
   );
   ```

   `GetContract` has no `verbose` option.  Require `originalLookup.createdEvent`,
   exact `contractId`, a nonempty `templateId` equal to the fixture's package
   ID/module/entity, and exact `createArguments` through
   `assertExactCreatedMessagePayload`.  For direct lookup, that assertion must
   accept either (a) exactly three all-blank labels in positional
   `party`/`party`/`text` order or (b) a complete labelled record, whose labels
   may be in any order; it rejects mixed labels, wrong count, kind, or value.
   Assert the
   documented visible-party fields: `witnessParties` is exactly `[actor.party]`
   as a set, `signatories` is exactly `[actor.party]`, and `observers` is
   exactly `[]`.  This is a self-party Message: because one party is both
   sender/signatory and recipient/observer, the `CreatedEvent` contract says
   observers never contain signatories.  Do not assert the five ContractService fields the
   proto says cannot be populated; in particular do not treat their generated
   defaults as evidence.  Do not print raw request credentials, bearer tokens,
   DAR bytes, or unbounded payload objects.
4. Submit `buildReplaceMessageTextRequest` with the exact original ID,
   `replacementText`, and the distinct replacement command ID.  Use
   `extractReplacementContracts` and require one archived ID equal to the
   original, a nonempty created replacement ID, and that replacement ID differs
   from the original.  This confirms the command response's one-original to
   one-replacement transition before calling either read API.
5. Repeat the exact direct lookup structure for the replacement ID and
   `[actor.party]`, with fresh options.  Require a materialized created event,
   the replacement ID, fixture template ID, exact
   `witnessParties === [actor.party]`, `signatories === [actor.party]`,
   `observers === []`, and exact three-field replacement payload.  It must not
   read the old ID through ContractService after the consuming exercise.
6. Build a fresh explicit Message `EventFormat` for the original history and
   pass its generated request to the bounded EventQuery projection loop below;
   each loop attempt invokes `eventQueryService.getEventsByContractIdAsync`
   with fresh deadline options:

   ```ts
   ledgerApiV2.GetEventsByContractIdRequest.create({
       contractId: original.contractId,
       eventFormat: ledgerApiV2.EventFormat.create({
           filtersByParty: {
               [actor.party]: ledgerApiV2.Filters.create({
                   cumulative: [ledgerApiV2.CumulativeFilter.create({
                       identifierFilter: {
                           oneofKind: "templateFilter",
                           templateFilter: ledgerApiV2.TemplateFilter.create({
                               templateId: ledgerApiV2.Identifier.create({
                                   packageId: `#${fixture.templateId.packageName}`,
                                   moduleName: fixture.templateId.moduleName,
                                   entityName: fixture.templateId.entityName,
                               }),
                               includeCreatedEventBlob: false,
                           }),
                       },
                   })],
               }),
           },
           verbose: true,
       }),
   })
   ```

   `GetEventsByContractIdRequest`, `EventFormat`, `Filters`, and its nested
   `CumulativeFilter`/`TemplateFilter` are generated types exported from
   `@distrohelena/canton-typescript-sdk/protobuf` as `ledgerApiV2.*`; use those
   constructors rather than hand-written interfaces or internal import paths.
   Validate the nonblank fixture package name before constructing the selector;
   this filter must never use the raw package hash.  The template filter is the
   explicit payload-requesting selection for the fixture Message and
   `verbose: true` preserves the labelled `sender`, `recipient`, and `text`
   history payload.  `verbose` belongs only to EventQuery history, not
   `GetContract`.  Do not use a wildcard,
   `filtersForAnyParty`, a ledger-effects transaction shape, or an omitted
   `eventFormat`.
7. Require exactly the completed loop response's one `created` and one
   `archived` members; this unary response has no event array to count. Require
   `created.createdEvent` and `archived.archivedEvent`, both nonempty trimmed
   `synchronizerId` values, exact original contract ID on each event, and the
   fixture template ID on each.  Require the historical created event to carry
   the exact original Message payload.  Its witnesses/signatories/observers
   must be exactly `[actor.party]`, `[actor.party]`, and `[]`, respectively.
   The archive's witnesses must be `[actor.party]`; its payload is intentionally absent because `ArchivedEvent`
   has no create arguments.  The proof is therefore a strict lineage statement:
   one known original ID was created with the exact original payload and then
   archived, while `ReplaceText` independently created the distinct active
   replacement with its exact replacement payload.
8. Print only useful, non-secret evidence: run marker, actor party, original
   and replacement IDs, direct-read payload text (or the three known values),
   creation/archive synchronizer IDs, authenticated participant version,
   release core, and compatibility path.  Do not print bearer tokens, refreshed
   sidecar credentials, endpoint authorization metadata, or the raw DAR.

### Bounded EventQuery projection loop

The history call in step 6 is an example-local bounded projection read, not an
assumption that the command response and EventQuery index become visible in the
same instant.  Add `waitForCompleteOriginalHistoryAsync` under
`examples/shared/contract-lifecycle-audit.ts`; it receives the immutable
generated request, the one workflow `OperationDeadline`, an injected
`readHistoryAsync(request, options)`, and an injected `sleepAsync(milliseconds)`.
The production wrapper supplies the actual EventQuery call and a local
`setTimeout` promise.  Tests supply both a deterministic deadline clock through
`new OperationDeadline({ timeoutMs, now })` and a sleep fake that advances that
clock.  No core/public poll helper is reused or exported: the existing
`src/core/polling/poll-until-async.ts` owns an independent relative timeout and
would not express the workflow's single absolute deadline or this response
validation rule.

Use a fixed example-private `EVENT_QUERY_PROJECTION_POLL_INTERVAL_MS = 100`.
On every iteration, first call `deadline.createRequestOptions()` and only then
dispatch `readHistoryAsync`.  Thus every dispatched unary call gets fresh,
shrinking options and a deadline that expired before dispatch produces no RPC.
Do not retry either create or `ReplaceText` submission.

After a successful EventQuery response, validate every side that is present
before deciding whether to retry.  A present `created` must contain a present
`createdEvent` with the original ID, fixture template, exact original payload,
`signatories === [actor.party]`, `observers === []`, and
`witnessParties === [actor.party]` (set comparisons with exact cardinality).
A present `archived` must contain a present `archivedEvent` with the original
ID, fixture template, and `witnessParties === [actor.party]`.  Every present
wrapper must also have a nonblank `synchronizerId`.  These are structural
validation failures and throw immediately; they are never reclassified as
eventual consistency and never retried.

The sole retryable result is an otherwise-valid response with one or both
top-level members absent: `created === undefined` and/or `archived ===
undefined`.  Record the missing names and increment the attempt count only for
the call that was dispatched.  Before sleeping, call
`deadline.remainingTimeoutMs()`, then sleep for
`Math.min(EVENT_QUERY_PROJECTION_POLL_INTERVAL_MS, remainingMs)`.  At the next
iteration the fresh `createRequestOptions()` check prevents another dispatch if
that bounded delay consumed the remaining budget.  A `TimeoutError` from either
pre-dispatch deadline check is converted to one credential-safe structural
diagnostic with only `attempts`, `missing=created|archived`,
`originalContractId`, and `replacementContractId`; preserve the timeout as its
cause.  A timeout while no call was dispatched reports `attempts=0` and both
missing sides.  Do not include a raw response, payload text, party name,
endpoint, headers, token, or transport metadata in this diagnostic.

Do not catch errors thrown by `readHistoryAsync`: gRPC/transport errors,
including a deadline that expired after dispatch, propagate unchanged.  The
loop owns no stream or socket cleanup.  Its caller remains within
`runClientWorkflowWithDisposalAsync`, so client-disposal failure cannot mask a
submission, direct-read, validation, EventQuery, or projection-timeout primary
failure.

There is no ACS traversal, update stream, update-by-ID, offset, hash,
database/PQS query, stale command, or submission retry in this audit.  The
history read has the bounded projection loop specified above; it exists only
because command completion and the EventQuery projection can become visible at
different times.  The two unary read contracts remain the behavior being
demonstrated.

## Helper boundaries and failure ownership

Keep the script standalone in the user-facing sense: it can run without another
workflow and shows both primary service calls and generated request factories.
Reuse only established fixture/command/payload helpers.  Add the narrowly
example-private `examples/shared/contract-lifecycle-audit.ts` with four cohesive
functions:

- `buildMessageLifecycleEventFormat(party, templateId)` creates the exact
  generated `EventFormat` above;
- `assertDirectMessageLookup(...)` validates only the documented populated
  ContractService fields and exact Message payload;
- `assertArchivedMessageHistory(...)` validates the original's create/archive
  lineage and synchronizer IDs.
- `waitForCompleteOriginalHistoryAsync(...)` owns only the injected,
  deadline-bounded EventQuery projection loop above; it neither constructs a
  client nor retries a command.

The helper must not own client construction, command submission, environment
selection, version handling, deadline construction/reset, or logging.  The
projection function may consume the caller's one supplied deadline, but cannot
create a second full timeout.  The assertion functions take values already
returned by calls and throw structural errors.  Keep it in `examples/`;
the audit provides only one consumer and there is no mature generic SDK
contract-lifecycle API, cancellation policy, historical-read abstraction, or
cross-transport contract to publish.  Therefore no code enters `src/`,
`src/index.ts`, generated exports, or the JSON transport.

`runClientWorkflowWithDisposalAsync` continues to own client disposal.  A
workflow error is primary; `cleanupWithoutMaskingAsync` means disposal failure
cannot replace it.  The example does not attempt to archive the replacement as
cleanup, because a failed mid-workflow command makes state ambiguous and the
project's documented examples intentionally leave durable ledger state.  Each
created run marker keeps later inspection and manual cleanup scoped without
claiming automatic deletion.

Errors remain original structured transport/protobuf failures.  The program
may add contextual structural errors for absent response fields, wrong IDs,
empty synchronizer IDs, or non-exact payloads, but it must not classify or
branch on server message prose.  A JSON client must reject at its existing
`NotSupportedError`; this is a gRPC example, not a request to add JSON parity.

## Tests and documentation

Implement test-first before the script/helper:

1. Add focused unit tests for the example-private assertion/builder/projection
   module.  Construct generated `ledgerApiV2` messages and cover the exact
   factory nesting: `EventFormat.create`, `Filters.create`,
   `CumulativeFilter.create`, `TemplateFilter.create`, and `Identifier.create`,
   with the `identifierFilter` `templateFilter` oneof.  Assert
   `filtersByParty`, `verbose: true`, no wildcard/any-party filter, and the
   expected verbose labelled history payload.  Cover direct lookup acceptance
   for both strict all-blank positional and complete labelled (order-independent)
   payloads, and rejection for mixed labels, wrong count/kind/value, absent
   created event, wrong contract ID/template/payload, and wrong visibility
   sets, and the self-party invariants `signatories === [actor.party]`,
   `observers === []`, and `witnessParties === [actor.party]`.  Cover history
   acceptance only when created plus archived refer to the original, the
   created event has those same self-party invariants, and both synchronizer
   IDs are nonblank; reject a missing inner event, original/replacement ID
   confusion, wrong created payload/template/witnesses/signatories/observers,
   and empty synchronizer IDs.  All generated Message event fixtures use one
   actor for sender and recipient; do not add a second-party fixture to make an
   observer assertion easier.

   Include an accepted direct-lookup fixture built with
   `ledgerApiV2.GetContractResponse.create({ createdEvent:
   ledgerApiV2.CreatedEvent.create(...) })` whose supported fields and exact
   self-party Message payload is the strict all-blank positional encoding and
   every
   ContractService-unavailable field is deliberately non-default:
   `offset: "42"`, `nodeId: 7`, `createdEventBlob: Uint8Array.of(1, 2)`,
   `interfaceViews: [ledgerApiV2.InterfaceView.create({ interfaceId:
   ledgerApiV2.Identifier.create({ packageId: "interface-package",
   moduleName: "Fixture", entityName: "View" }), viewStatus:
   google.rpc.Status.create({ code: 0, message: "fixture interface view" }),
   implementationPackageId: "interface-package" })]`, and `acsDelta: true`.
   The fixture imports `google` alongside `ledgerApiV2` from the public
   `/protobuf` entry point.  The generated
   `CreatedEvent` types are respectively `string`, `number`, `Uint8Array`,
   `InterfaceView[]`, and `boolean`.  `assertDirectMessageLookup` must accept
   that response without reading or comparing any of those five fields.  This
   is a regression test for the ContractService proto rule that they are not
   populated by that endpoint, not a claim that EventQuery must ignore them.

   Test the projection loop with an injected `OperationDeadline` clock and
   injected sleep fake: immediate complete history dispatches once and never
   sleeps; a valid created-only first response sleeps no more than the remaining
   budget then accepts the delayed archive; expiry after an incomplete response
   yields the restricted timeout diagnostic and sends no extra RPC; a malformed
   present created or archived side fails immediately without sleep/retry; and
   an EventQuery transport error is the unchanged thrown value.  Assert fresh
   `RequestOptions` per dispatched attempt, the capped sleep duration, no
   dispatch after deadline expiry, and a timeout diagnostic containing only
   attempt count/missing sides/contract IDs—not token, endpoint, party, payload,
   header, or raw response.  Cover workflow disposal where a primary
   projection/submission failure and a concurrent disposal failure occur so the
   primary error wins.
2. Extend `tests/unit/examples/application-example-sources.test.ts` with
   durable source-contract checks for example 95: one deadline is made before
   fixture work, common fixture/party/compatibility setup receives it, both
   direct lookups have explicit `[actor.party]` querying parties and fresh
   options, history has explicit Message `EventFormat`, an example-local
   bounded projection loop, and fresh options on every attempt,
   `ReplaceText` has exact original/different replacement IDs, and the source
   contains no `getUpdateById`, `getUpdateByOffset`, `getUpdateByHash`, version
   branch, or message-text error matching.  The test must not overfit local
   variable names or console wording.
3. Retain/add unit coverage for the existing command builders and extraction
   behavior rather than duplicating it in the audit tests.  Type-check all
   examples through `npm run examples:check`, then run the focused Vitest files,
   the full unit suite, build, lint, and `npm run verify:pack`.  Verify the pack
   still excludes examples and generated/runtime state.
4. Update README's Workflow examples command block and add a paragraph that
   says this command is standalone, gRPC-only, uses the normal
   `SDK_EXAMPLE_*` endpoint/auth/TLS/party/timeout configuration, retains
   default-versus-explicit party behavior, and leaves durable DAR/topology/
   contract state.  Explain that it reads the active original and replacement
   via alpha ContractService but obtains the original archive history from
   EventQueryService; it intentionally makes no post-archive ContractService
   claim.  Correct the existing API-support list: replace the stale
   `eventQueryService` and `contractService` “placeholder” entries with their
   actual gRPC-only methods and say JSON rejects them.

## Live acceptance matrix

Run the unchanged final source against both authenticated participants.  Use
the normal protected child-shell credential refresh flow for the 3.5.8 sidecar;
never capture the token or credential output in tests, logs, docs, or commits.

Run the matrix again from committed fix `bb8e298`, rather than treating an
earlier blocked observation as current evidence.  On success, replace that
blocked evidence with the sanitized structural proof below.  The rerun verifies
the package-name selector and direct blank-label shape; it must not introduce a
version branch or match status/error prose.

| Environment | Run | Required recorded non-sensitive evidence | Expected result |
| --- | --- | --- | --- |
| Authenticated Participant 3.5.7 | `npm run example:workflow:contract-lifecycle-audit`, then rerun with an existing `SDK_EXAMPLE_PARTY` | authenticated full participant version and parsed release core, common path, run marker, actor, original/replacement IDs, direct-read IDs and exact three-field payload checks, created/archive synchronizer IDs, lifecycle lineage result | original direct lookup succeeds while active; replacement direct lookup succeeds after replacement; original history contains exact created plus archived events |
| Isolated authenticated Participant 3.5.8 | same command and explicit-party rerun with sidecar endpoint variables | the same evidence, recorded without credentials | same source and common path with the same structural proof |

If the live matrix exposes a ContractService or EventQuery response difference,
record the response shape and re-evaluate this design before code changes.  Do
not hide it behind a version string branch.  A pruned original contract is not
an accepted live result: EventQuery documentation permits history absence after
pruning, so the fresh just-created lifecycle should be run before pruning; a
missing history response is a failed audit, not evidence that the archive was
proved.

## Success criteria

- `npm run example:workflow:contract-lifecycle-audit` is a separately runnable
  TypeScript example and README-documented workflow command.
- One absolute deadline covers DAR setup, party resolution, compatibility read,
  submission, both direct reads, and historical query, with fresh request
  options per unary call/each bounded history attempt and primary-error-safe
  disposal.
- It proves the exact run-scoped Message payload before and after the consuming
  replacement, passes explicit querying parties to both direct reads, and never
  relies on ContractService fields the proto says are unavailable.  For the
  self-party Message, both direct and historical created-event checks require
  signatories/witnesses `[actor.party]` and observers `[]`.
- It proves a strict original create/archive lineage with nonempty creation and
  archival synchronizer IDs through an explicit verbose EventQuery Message
  format and labelled history payload,
  retrying only a valid but incomplete EventQuery projection within the same
  deadline.
- It is gRPC-only, has no speculative old-contract lookup assertion, no JSON
  support work, no update lookup, future fields, message-text matching, or
  version branch; generic SDK lifecycle code is intentionally not introduced.
- Unit/source/type/build/lint/pack checks and the 3.5.7/3.5.8 live matrix give
  non-sensitive evidence for the same final source.
