# Operation Deadline and Bounded ACS Traversal Design

## Goal

Move the examples' reusable deadline and active-contract-pagination mechanics into
the public SDK, so callers can impose one safe total budget and bounded lazy ACS
page traversal without collecting an unbounded snapshot. Keep example/shared code
about the Message fixture, DAR setup, filtering, and assertions—not transport
plumbing.

## Decisions

- Add root-exported `OperationDeadline` in
  `src/core/types/operation-deadline.ts`.
- Add root-exported, immutable `ActiveContractsTraversalOptions` in
  `src/core/types/active-contracts-traversal-options.ts`.
- Add `StateServiceClient.getActiveContractsPagesAsync(...)`, a lazy gRPC raw-page
  `AsyncIterable`; do not add a collect-all SDK wrapper in this cycle.
- Add root-exported `ActiveContractsTraversalError` for SDK-detected traversal
  invariants and caller-selected traversal limits. Reuse `ValidationError` for
  invalid public arguments and the existing `TimeoutError` for a budget exhausted
  before dispatch.
- Migrate examples 60 and 90--93 to these APIs and remove
  `examples/shared/workflow-deadline.ts`; no compatibility shim is required.

## Public API

### `OperationDeadline`

Expose this exact class from the package root:

```ts
export class OperationDeadline {
    public constructor(init: { timeoutMs: number; now?: () => number });
    public remainingTimeoutMs(): number;
    public createRequestOptions(): RequestOptions;
}
```

`timeoutMs` must be a positive safe integer. The constructor calls `now` once,
requires a safe-integer millisecond timestamp, and rejects a start-plus-timeout
sum outside the safe-integer range with `ValidationError`. Every later clock
sample is subject to the same safe-integer validation.

The instance captures an absolute end time, but it also retains the least
remaining amount it has ever returned. Thus `remainingTimeoutMs()` is monotonic
non-increasing even if a wall clock rolls backward. It returns a positive safe
integer while budget remains and throws the existing `TimeoutError` once the
budget is exhausted. It must keep throwing `TimeoutError` after expiry, including
if the clock subsequently moves backwards. `createRequestOptions()` obtains the
current remaining budget and returns a new `RequestOptions({ timeoutMs })` each
time; it therefore also throws `TimeoutError` before any call can be dispatched
when expired.

This class deliberately has no `idleProbeMs`, sleep, polling, or retry policy.
It models one total operation budget only. A transport error from an RPC or stream
already dispatched with a nonzero request timeout, including gRPC
`DEADLINE_EXCEEDED`, is not rewritten as `TimeoutError` and must propagate
unchanged.

### Traversal options and errors

Expose:

```ts
export class ActiveContractsTraversalOptions {
    public readonly deadline: OperationDeadline;
    public readonly maxPages: number;
    public readonly maxContracts: number;
    public constructor(init: {
        deadline: OperationDeadline;
        maxPages: number;
        maxContracts: number;
    });
}

export class ActiveContractsTraversalError extends CantonError {
    public readonly code:
        | "active-at-offset-mismatch"
        | "missing-active-at-offset"
        | "repeated-page-token"
        | "max-pages-exceeded"
        | "max-contracts-exceeded";
}
```

The options constructor requires an `OperationDeadline` and positive safe-integer
`maxPages` and `maxContracts`; bad caller input throws `ValidationError`. Freeze
the options instance after construction so its references and numeric bounds
cannot be changed at runtime. The deadline intentionally remains stateful: its
monotonic budget is shared by all pages and by the enclosing workflow.

`ActiveContractsTraversalError` is justified because a page-token loop, a
snapshot shift, and an explicit safety bound are neither caller-validation errors
nor gRPC failures. Its messages should identify the observed condition and bound,
but clients can branch only on `code`, never text. Do not wrap transport,
`NotSupportedError`, or `TimeoutError` failures in this error.

### State service method

Add this root-reachable method to `StateServiceClient`:

```ts
public getActiveContractsPagesAsync(
    request: ledgerApiV2.GetActiveContractsPageRequest,
    options: ActiveContractsTraversalOptions,
): AsyncIterable<ledgerApiV2.GetActiveContractsPageResponse>;
```

The generated request/response types are the existing
`canton/com/daml/ledger/api/v2/state_service.js` exports. The method returns an
async generator without starting validation or I/O until its first `next()`.
Every yielded item is the unmodified generated gRPC response; no event mapping,
filtering, or collection occurs in the SDK.

On first iteration, reject an initial `pageToken` that is present and nonempty
with `ValidationError`. Preserve the caller's `eventFormat` and `maxPageSize` on
the first and every derived request. An explicit initial `activeAtOffset` is
allowed: the first response must return that exact nonempty offset. If it is
omitted, the first response supplies the nonempty snapshot offset. Each later
response must return the same nonempty offset. A missing/empty response offset
or any mismatch raises the corresponding `ActiveContractsTraversalError` before
another request or yield.

For each nonterminal response, detect repeat tokens by byte content, not object
identity (for example, a stable hexadecimal/base64 key copied from the
`Uint8Array`). A repeated nonempty token raises `repeated-page-token`. The next
request uses that response's token plus the locked snapshot offset and preserves
only `eventFormat` and `maxPageSize` from the original request; it must not carry
an unrelated initial token.

Before dispatching a page, fail with `max-pages-exceeded` if another page would
exceed `maxPages`; after receiving a response, calculate its
`activeContracts.length` and fail with `max-contracts-exceeded` before yielding
if the cumulative count would exceed `maxContracts`. Check both boundaries before
unsafe additional work/yielding. Each actual page RPC receives a fresh
`options.deadline.createRequestOptions()`, so every dispatch gets the current
remaining total budget. Completion is the first page with no/empty
`nextPageToken`. A consumer breaking from `for await` causes generator cleanup
and must result in no later page call.

The transport keeps responsibility for transport support. In particular, the
existing JSON `getActiveContractsPageAsync` rejection is reached on the first
generator iteration and remains the existing `NotSupportedError`; merely calling
`getActiveContractsPagesAsync` does not throw. gRPC transport errors are also
unchanged.

## Example migration

`examples/60-query-active-contracts.ts` creates one `OperationDeadline` for its
fixture setup, party resolution, submit, and ACS traversal. It passes fresh
`deadline.createRequestOptions()` to ordinary RPCs and consumes
`stateService.getActiveContractsPagesAsync(request, new
ActiveContractsTraversalOptions(...))`; its Message-specific search stays in the
example/shared layer and can break as soon as the matching contract is found.

Examples 90--93 follow the same total-budget rule. Their setup helpers accept the
deadline/request-options boundary instead of a `remainingTimeoutMs` callback.
ACS scans consume raw pages through the new method and retain only Message
filtering and exact fixture assertions in `examples/shared/ledger-requests.ts`.
Ordinary update streams use a single `deadline.createRequestOptions()` at stream
dispatch. Example 92 keeps its existing expected idle-timeout proof with an
example-local, bounded sub-budget: immediately before opening its deliberately
idle stream, capture

```ts
const idleTimeoutMs = Math.max(
    1,
    Math.min(2_000, Math.floor(deadline.remainingTimeoutMs() / 4)),
);
```

and pass a fresh `new RequestOptions({ timeoutMs: idleTimeoutMs })` to that
stream. The shared `OperationDeadline` still bounds the whole workflow; this
derived one-shot stream timeout is test-fixture behavior only, not an
`OperationDeadline` method or public SDK idle policy. Refactor lifecycle
utilities only as needed to preserve primary errors while closing iterators and
disposing clients.

Delete `examples/shared/workflow-deadline.ts` and
`tests/unit/examples/workflow-deadline.test.ts`. Remove the old generic
`findActiveMessageAcrossPagesAsync` and `collectActiveMessagesAcrossPagesAsync`
pagination mechanisms (and their pagination/deadline tests) rather than leaving
duplicate implementations. Update source-contract tests that currently assert
the helper names or `RequestOptions` construction patterns. No shim or deprecated
example export is needed.

`GrpcContractQueryClient.readSnapshotAsync` currently has a separate unbounded
`do/while` around `getActiveContractsPageAsync` and lacks a caller-provided total
deadline and page/contract bounds. Do not silently adopt arbitrary defaults or
change its query API in this work. Its integration is a later project, after a
query-level configuration contract can express those values precisely.

## Implementation and test plan

1. Add focused unit tests for `OperationDeadline`: valid fresh options, invalid
   timeout/clock values, constructor overflow, monotonic rollback behavior,
   expiry, and `TimeoutError` pre-dispatch behavior.
2. Add traversal tests in `tests/unit/services/state-service-client.test.ts` (or
   a focused sibling) using a fake transport. Prove laziness, initial-token
   rejection on first iteration, exact derived requests, fresh shrinking request
   options, explicit and discovered offset locking, missing/mismatched offsets,
   byte-equal repeated tokens, both bounds before yield/call, early break, raw
   responses, and unchanged fake transport errors.
3. Test the JSON path with the real JSON transport stub: constructing the
   iterable is harmless and first iteration rejects `NotSupportedError`.
4. Migrate and retest examples 60 and 90--93, their fixture helpers, and the
   source-level contracts. Add `OperationDeadline`, traversal options, and the
   traversal error to `src/index.ts`; update public-export/package smoke tests
   and README API-support text to describe gRPC-only lazy paged ACS traversal.
   Update example 92's tests to prove it captures the stated bounded sub-budget
   immediately before idle-stream dispatch, preserves its expected timeout, and
   does not add an idle method or policy to the public deadline type.
5. Run focused unit suites, `npm run examples:check`, build, lint, and the
   appropriate live example matrix before claiming compatibility.

## Alternatives and trade-offs

- Keeping the workflow helper would be less disruptive, but leaves a generic
  deadline primitive private, retains an arbitrary idle policy, and duplicates
  pagination safety in examples.
- A collect-all `getActiveContractsAsync` convenience method is simpler for a
  short example but defeats bounded/lazy use cases and invites accidental memory
  growth; consumers can collect explicitly if desired.
- Retrofitting `GrpcContractQueryClient` now would eliminate one loop, but its
  current public query surface cannot supply meaningful bounds or total budget.
- Relying on gRPC timeout alone misses pre-dispatch expiry and lets each page
  reset the available time; the shared deadline prevents both problems.

## Success criteria

- Root imports expose `OperationDeadline`, `ActiveContractsTraversalOptions`,
  and `ActiveContractsTraversalError`; expired pre-dispatch work throws the
  existing `TimeoutError`.
- ACS traversal is lazy, raw, bounded by explicit caller values, snapshot-safe,
  token-loop-safe, and uses one monotonic total deadline without inventing idle
  probing or masking transport errors.
- Examples 60 and 90--93 contain no generic deadline/pagination implementation,
  and the removed workflow-deadline helper has no remaining references. Example
  92 alone retains its deliberately bounded local idle-stream timeout calculation
  while sharing the operation-wide deadline.
- `GrpcContractQueryClient` remains explicitly unchanged pending a separately
  designed bounds/deadline configuration surface.
