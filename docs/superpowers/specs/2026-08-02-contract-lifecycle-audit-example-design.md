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
only `dist`, `node`, and `README.md`, while `.gitignore` excludes runtime
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
`Filters`, `CumulativeFilter`, and `TemplateFilter`; helper implementation may
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
   used as supplied; otherwise allocate the existing fallback party.  Warn when
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
   three-field labelled record `{ sender: actor.party, recipient: actor.party,
   text: originalText }`; it is not a loose text-marker match.
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

   Require `originalLookup.createdEvent`, exact `contractId`, a nonempty
   `templateId` equal to the fixture's package ID/module/entity, and exact
   `createArguments` through `assertExactCreatedMessagePayload`.  Assert the
   documented visible-party fields: `witnessParties` is exactly `[actor.party]`
   as a set, `signatories` is exactly `[actor.party]`, and `observers` is
   exactly `[actor.party]`.  Do not assert the five ContractService fields the
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
   the replacement ID, fixture template ID, visible-party/signatory/observer
   sets, and exact three-field replacement payload.  It must not read the old
   ID through ContractService after the consuming exercise.
6. Build a fresh explicit Message `EventFormat` for the original history and
   invoke `eventQueryService.getEventsByContractIdAsync` with fresh deadline
   options:

   ```ts
   ledgerApiV2.GetEventsByContractIdRequest.create({
       contractId: original.contractId,
       eventFormat: ledgerApiV2.EventFormat.create({
           filtersByParty: {
               [actor.party]: ledgerApiV2.Filters.create({
                   cumulative: [{
                       identifierFilter: {
                           oneofKind: "templateFilter",
                           templateFilter: {
                               templateId: {
                                   packageId: fixture.templateId.packageId,
                                   moduleName: fixture.templateId.moduleName,
                                   entityName: fixture.templateId.entityName,
                               },
                               includeCreatedEventBlob: false,
                           },
                       },
                   }],
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
   The template filter is the explicit payload-requesting selection for the
   fixture Message and `verbose: true` preserves the `sender`, `recipient`, and
   `text` labels used by the exact payload helper.  Do not use a wildcard,
   `filtersForAnyParty`, a ledger-effects transaction shape, or an omitted
   `eventFormat`.
7. Require exactly the response's one `created` and one `archived` members;
   this unary response has no event array to count.  Require
   `created.createdEvent` and `archived.archivedEvent`, both nonempty trimmed
   `synchronizerId` values, exact original contract ID on each event, and the
   fixture template ID on each.  Require the historical created event to carry
   the exact original Message payload.  Its witnesses/signatories/observers
   must agree with the known actor topology.  The archive's witnesses must be
   `[actor.party]`; its payload is intentionally absent because `ArchivedEvent`
   has no create arguments.  The proof is therefore a strict lineage statement:
   one known original ID was created with the exact original payload and then
   archived, while `ReplaceText` independently created the distinct active
   replacement with its exact replacement payload.
8. Print only useful, non-secret evidence: run marker, actor party, original
   and replacement IDs, direct-read payload text (or the three known values),
   creation/archive synchronizer IDs, authenticated participant version,
   release core, and compatibility path.  Do not print bearer tokens, refreshed
   sidecar credentials, endpoint authorization metadata, or the raw DAR.

There is no ACS traversal, sleep, polling loop, update stream, update-by-ID,
offset, hash, database/PQS query, or stale command in this audit.  The command
responses make the transition immediate, and the two unary read contracts are
the behavior being demonstrated.

## Helper boundaries and failure ownership

Keep the script standalone in the user-facing sense: it can run without another
workflow and shows both primary service calls and generated request factories.
Reuse only established fixture/command/payload helpers.  If needed for
readability, add a narrowly example-private
`examples/shared/contract-lifecycle-audit.ts` with three cohesive functions:

- `buildMessageLifecycleEventFormat(party, templateId)` creates the exact
  generated `EventFormat` above;
- `assertDirectMessageLookup(...)` validates only the documented populated
  ContractService fields and exact Message payload;
- `assertArchivedMessageHistory(...)` validates the original's create/archive
  lineage and synchronizer IDs.

The helper must not own client construction, command submission, environment
selection, version handling, deadlines, or logging.  It takes values already
returned by the calls and throws structural errors.  Keep it in `examples/`;
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

1. Add focused unit tests for the example-private assertion/builder module.
   Construct generated `ledgerApiV2` messages and cover the exact
   `filtersByParty` template filter, `verbose: true`, no wildcard/any-party
   filter, and expected labelled payload.  Cover direct lookup acceptance and
   rejection for absent created event, wrong contract ID/template/payload,
   wrong visibility sets, and each forbidden ContractService-only field being
   ignored rather than asserted.  Cover history acceptance only when created
   plus archived refer to the original and both synchronizer IDs are nonblank;
   reject a missing member, original/replacement ID confusion, wrong created
   payload, wrong template/witnesses, and empty synchronizer IDs.
2. Extend `tests/unit/examples/application-example-sources.test.ts` with
   durable source-contract checks for example 95: one deadline is made before
   fixture work, common fixture/party/compatibility setup receives it, both
   direct lookups have explicit `[actor.party]` querying parties and fresh
   options, history has explicit Message `EventFormat` and fresh options,
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
  options per unary call and primary-error-safe disposal.
- It proves the exact run-scoped Message payload before and after the consuming
  replacement, passes explicit querying parties to both direct reads, and never
  relies on ContractService fields the proto says are unavailable.
- It proves a strict original create/archive lineage with nonempty creation and
  archival synchronizer IDs through an explicit labelled Message EventFormat.
- It is gRPC-only, has no speculative old-contract lookup assertion, no JSON
  support work, no update lookup, future fields, message-text matching, or
  version branch; generic SDK lifecycle code is intentionally not introduced.
- Unit/source/type/build/lint/pack checks and the 3.5.7/3.5.8 live matrix give
  non-sensitive evidence for the same final source.
