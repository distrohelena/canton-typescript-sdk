# Update Lookup Reconciliation Example Design

## Goal

Add `examples/96-update-lookup-reconciliation.ts`: a standalone, gRPC-only
proof that an exact transaction observed from `UpdateService.GetUpdates` can
be read back immediately and identically through both
`UpdateService.GetUpdateById` and `UpdateService.GetUpdateByOffset`.

The same TypeScript source and assertions must pass against the local 3.5.7
and 3.5.8 participants, in both default-party and explicit-party modes. This
is an update-identity/offset reconciliation example, not a transaction search,
history example, JSON example, or version-detection branch. Do not add a
public SDK helper, modify generated code, or use `getUpdateByHashAsync`.

Add `example:workflow:update-lookup-reconciliation` to `package.json` and the
README workflow-examples table. Preserve the user-owned package-version edit,
the four untracked July plans, the pinned DAR, and package contents.

## Proven selection and wire contract

The fixture remains Explorer's `DebugPlayground:Message`: exactly
`sender : Party`, `recipient : Party`, and `text : Text`. Submit a self-party
Message so the expected visible sets are exact: witnesses and signatories are
`[actor.party]`; observers are `[]`. Its record payload must be the complete,
labelled three-field value, not a run-marker-only match.

Build exactly one generated, verbose ACS-delta `UpdateFormat` for the run and
use that same format in the stream and both unary lookups:

```ts
ledgerApiV2.UpdateFormat.create({
    includeTransactions: ledgerApiV2.TransactionFormat.create({
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
        transactionShape: ledgerApiV2.TransactionShape.ACS_DELTA,
    }),
});
```

The filter selector deliberately uses `#${packageName}`, not the returned
event's package hash. The common 3.5.7/3.5.8 live audit proved raw-hash
selectors invalid and verbose history/stream payloads labelled. Validate all
template-id components, including package name, before construction. Use
generated `.create(...)` factories rather than casts or internal imports.

## Program flow

The thin entry point uses `runExampleAsync`, `createExampleClient`, and
`runClientWorkflowWithDisposalAsync`; disposal is exactly once and must not
mask a primary error. The dependency-injected workflow creates exactly one
`OperationDeadline` as its first action. Every setup, submit, stream, and
lookup request receives fresh `deadline.createRequestOptions()`; no helper
creates a second relative timeout.

1. Load/prove the fixture DAR, resolve the default or supplied nonblank
   `SDK_EXAMPLE_PARTY`, and read compatibility. Keep the established durable
   DAR, fallback-party, and contract-state warnings.
2. After those setup actions, call `StateService.GetLedgerEnd` once, require a
   nonblank saved offset, then construct the one format and open a forward
   `GetUpdates` stream from that `beginExclusive` offset. Create its iterator
   and call `iterator.next()` before submitting; attach a rejection handler so
   an early stream failure never becomes unhandled.
3. Generate one run id and submit one self-party Message with exact text
   `update-lookup-reconciliation-${runId}` and a distinct matching command id.
   Do not retry the submission or add a sleep/poll: the already-open stream is
   the synchronization mechanism.
4. Consume the stream until exactly one matching ACS-delta `Transaction` is
   found. It must have nonempty update id, offset, and synchronizer id; exactly
   one created event for the submitted contract; the fixture template id;
   strict labelled Message payload; and the exact visibility sets above. Any
   malformed/ambiguous matching transaction fails immediately. Unrelated
   updates are skipped. Ended stream and deadline errors are clear failures.
   Close the iterator in `finally`, preserving the primary failure.
5. Immediately issue generated `GetUpdateByIdRequest.create({ updateId,
   updateFormat })` and `GetUpdateByOffsetRequest.create({ offset,
   updateFormat })`, each with fresh options. Each response must be a
   transaction (not reassignment/topology/empty) and exactly equal to the
   captured stream transaction on update id, offset, synchronizer id, command
   id, fixture template, contract id, strict payload, and visibility. The
   response is not accepted merely because it contains the same contract.
6. Log only bounded useful evidence: run marker, actor, contract ID, update
   ID, offset, synchronizer ID, participant version/release core/compatibility
   path, and the two reconciliation confirmations. Never log credentials,
   headers, raw DAR data, raw protobuf response objects, or a transaction hash.

No retries, JSON transport, package hash selector, `getUpdateByHashAsync`, or
participant-version conditional is allowed. If a future participant changes a
structural response, first record the new shape and make a shared structural
decision; do not key behavior on container tag, endpoint, or error prose.

## Structure and testing

Keep reusable example-suite mechanics in `examples/shared/ledger-requests.ts`:
extract a private-to-examples generated Message `UpdateFormat` builder from the
existing stream request builder, so existing stream examples and example 96
share the exact selector/verbose/ACS-delta construction. Put exact transaction
capture and reconciliation assertions in new
`examples/shared/update-lookup-reconciliation.ts`; put sequencing and logging
in new `examples/shared/update-lookup-reconciliation-workflow.ts`. This is not
ready for an SDK extraction: it is fixture-specific (Message payload and
self-party visibility) and its stream lifecycle is presentation-level.

Unit tests must prove generated request shape, only one matching transaction,
strict payload/template/visibility/identity comparison, unrelated-update
skipping, malformed lookup failures, stream cleanup, fresh shrinking deadline
options, no retry, and disposal primary-error safety. Extend the AST source
contracts to prevent accidental JSON/hash/version branches and ensure the
saved ledger end, `iterator.next` before submit, one deadline, and both lookup
calls remain visible. Live evidence is four sanitized rows: 3.5.7 default,
3.5.7 explicit, 3.5.8 default, and 3.5.8 explicit; every row records the same
source commit/path plus non-secret run/identity confirmation fields.
