# Party Hosting Lifecycle Reuse Design

## Goal

Move the generally useful party-hosting readiness behavior discovered in the
standalone examples into the SDK, and fix the decentralized-party lifecycle so
all allocation controls survive prepare/finalize. Keep localnet configuration,
ephemeral key generation, and other tutorial policy in `examples/`.

## Context

`CreateDecentralizedPartyRequest` accepts `identityProviderId`,
`waitForAllocation`, and `userId`, but `PreparedDecentralizedParty` does not
retain them. Consequently, `finalizeDecentralizedPartyAsync` cannot include
them in `AllocateExternalPartyRequest`, and the online convenience flow silently
drops the values. Canton documents `waitForAllocation` as best-effort and
ignored for decentralized parties, so preserving it fixes request fidelity but
does not replace explicit topology observation.

The decentralized example separately polls `ListParties` until the created
party is hosted by the expected participant on the expected synchronizer. That
polling is useful to applications, but the current helper is example-local and
fetches up to 1,000 unfiltered parties per attempt. A second example-local
helper reads raw `PartyToParticipant` mappings; it is no longer used because
that low-level response was not compatible with the Canton 3.5.7 runtime.

## Considered approaches

### Selected: prepared allocation controls and a focused hosting waiter

Add the three allocation controls to `PreparedDecentralizedParty`, populate
them during preparation, and consume them during finalization. This preserves
the current `finalizeDecentralizedPartyAsync(prepared, signatures, options?)`
signature and makes online and offline flows behave identically.

Add `waitForPartyHostingAsync` to `TopologyAggregationServiceClient`. It uses
the stable aggregate `ListParties` API with server-side party, participant, and
synchronizer filters, and returns the matching aggregate result.

This approach is non-breaking, keeps the prepared object self-contained across
an offline signing boundary, and puts topology observation on the service that
owns the read operation.

### Rejected: pass allocation controls as new finalization arguments

This keeps allocation policy separate from signed topology, but changes or
overloads the public finalization signature and lets online and offline paths
drift. It also requires callers to preserve additional state beside the
prepared object.

### Rejected: make creation always perform SDK-side polling

This would hide the distinction between Canton's `waitForAllocation` behavior
and explicit topology observation, add latency to every creation, and make the
caller unable to choose whether it needs proof of hosting. The SDK should
provide the wait operation without forcing it.

## Public API

`PreparedDecentralizedParty` gains immutable optional properties:

```ts
readonly identityProviderId?: string;
readonly waitForAllocation?: boolean;
readonly userId?: string;
```

Its constructor accepts and copies those values. Preparation copies them from
`CreateDecentralizedPartyRequest`; finalization forwards them to
`AllocateExternalPartyRequest`. They are allocation metadata and do not alter
the canonical topology bytes, hashes, signing requests, or signature checks.

The topology aggregation service gains a request DTO and method equivalent to:

```ts
class WaitForPartyHostingRequest {
    readonly partyId: string;
    readonly participantId: string;
    readonly synchronizerId: string;
    readonly pollIntervalMs: number; // default 500
    readonly timeoutMs: number;      // default 30_000
}

waitForPartyHostingAsync(
    request: WaitForPartyHostingRequest,
    options?: RequestOptions,
): Promise<
    comDigitalasset.canton.topology.admin.v30.ListPartiesResponse_Result
>;
```

The actual return type is the existing generated
`comDigitalasset.canton.topology.admin.v30.ListPartiesResponse_Result`, matching
the result family already returned by `listPartiesAsync`.
`WaitForPartyHostingRequest` is exported from the package root, while consumers
that need to name the result type import `comDigitalasset` from the package's
`/protobuf` entry point. The existing
`listPartiesAsync` signature and its generated request/response types remain
unchanged. A package-shape/type-consumer test protects both documented import
paths.

The request rejects empty identifiers and timing values that are not finite
safe integers. `timeoutMs` must be positive and `pollIntervalMs` must be
non-negative. The method calls `ListParties` with `limit: 1`,
`filterParty`, `filterParticipant`, and `synchronizerIds` populated from the
request. Filters are treated as server-side narrowing only: success additionally
requires exact `result.party === request.partyId`, an exact participant UID,
and a permission entry for the exact synchronizer. It returns the matched
generated result so callers can inspect permissions and physical synchronizer
data without a lossy remapping. A decoy result that does not have the exact
party ID can never satisfy the wait.

Each RPC attempt receives the caller's `RequestOptions`. The lifecycle timeout
governs when the waiter may start another RPC or sleep; it does not cancel an
already-running RPC. Callers that need a hard wall-clock bound must also set an
appropriate per-RPC `RequestOptions.timeoutMs`.

## Internal polling

Introduce one internal polling primitive with explicit timeout, interval,
clock, sleeper, read, match, and timeout-error callbacks. It performs an
immediate first read. After an unsuccessful read, it checks the clock: if the
deadline has been reached it throws without sleeping; otherwise it sleeps for
`min(pollIntervalMs, remainingMs)`. It starts no read at or after the deadline.
It supports a zero interval, avoids sleeping after a successful read, and
retains the final observed value for diagnostics. Injected clock and sleeper
seams make the boundary deterministic in unit tests.

`waitForPartyHostingAsync` uses this primitive, which remains internal. Refactoring
`ExternalPartyActivationClient` onto it is deferred because that client has
distinct existing timeout boundaries and error contracts; changing those is
not necessary to make the example behavior reusable.

## Examples and cleanup

The decentralized example calls
`client.topologyAggregationService.waitForPartyHostingAsync(...)` instead of
importing the example helper or constructing `ListPartiesRequest`. The local
participant lookup remains in the example because it supplies the expected
host identity.

Delete `examples/shared/party-hosting.ts` and migrate/delete
`tests/unit/examples/party-hosting.test.ts` after the behavior is covered by
the new SDK service tests. Delete the unused
`examples/shared/party-to-participant.ts` and
`tests/unit/examples/party-to-participant.test.ts`; do not promote the
incompatible low-level reader.

Keep these in `examples/`:

- environment-driven localnet/TLS/JWT client construction;
- selection of a single healthy synchronizer;
- ephemeral Node.js Ed25519 keys and signing callbacks;
- party-hint generation and standalone process handling.

These are application policy, runtime-specific tutorial code, or private-key
custody concerns rather than SDK protocol abstractions.

## Errors and compatibility

Timeout errors identify the party, participant, and synchronizer and summarize
the last aggregate result, or state that none was observed. Transport errors
are propagated unchanged. No retry is performed after a successful match.

The public creation and finalization method signatures remain compatible. The
new prepared fields are additive. Existing callers that do not set allocation
controls retain current behavior. The aggregate API remains gRPC-only, with
the existing JSON `NotSupportedError` behavior flowing through unchanged.

## Testing

Unit tests will prove:

- preparation preserves all three allocation controls immutably;
- finalization forwards them to `AllocateExternalPartyRequest`;
- online decentralized creation preserves and forwards `waitForAllocation`,
  including explicit `false`, while documenting that Canton ignores it for
  decentralized parties;
- party-hosting waiting sends all server-side filters and forwards
  `RequestOptions`;
- the waiter succeeds immediately, retries until a match, and emits useful
  timeout diagnostics;
- a decoy result with a non-matching party ID cannot satisfy the waiter;
- invalid request identifiers and timing values fail before transport calls;
- deterministic clock/sleeper tests cover deadline and sleep clamping behavior;
- package-shape/type-consumer coverage proves the waiter request is available
  from the package root and its result type is available from `/protobuf`;
- the decentralized example uses the SDK method and has no dependency on the
  removed helpers.

Verification includes the focused unit suites, `npm run examples:check`, the
full build, lint/diff checks, and end-to-end decentralized example runs against
both Canton Participant 3.5.7 and the isolated 3.5.8 sidecar when those local
participants are available.
