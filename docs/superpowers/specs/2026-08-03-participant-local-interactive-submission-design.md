# Participant-Local Interactive Command Submission Design

## Status

Approved direction. This specification defines the first participant-local
interactive command-submission pass for the high-level TypeScript SDK.

## Goal

Add one explicit high-level command API that uses the Ledger API interactive
prepare-and-execute flow for a party hosted on the connected participant,
without asking the application to provide an external signature:

```ts
commandService.submitInteractivelyAndWaitAsync(request, options?)
```

The operation returns `SubmitCommandResponse` and is supported by gRPC only.

## Current Gap

The SDK currently exposes three related behaviors:

1. `submitAndWaitAsync` without a configured signer uses the ordinary
   `CommandService.SubmitAndWait` RPC.
2. `submitAndWaitAsync` with a configured signer uses interactive prepare,
   application signing, and interactive execute.
3. `prepareAsync` plus `executeAndWaitAsync` exposes detached signing, but
   `executeAndWaitAsync` requires an application signature for every `actAs`
   party.

There is therefore no high-level path that deliberately uses interactive
submission while allowing the participant to authorize a locally hosted party.

The generated Ledger API contract describes signatures as authorization from
the submitting external party. For a participant-local party, the execute
request must omit `party_signatures`; it must not send an empty signature
envelope that claims to contain external-party signatures.

## Chosen Public API

Add this method to `CommandServiceClient`:

```ts
public submitInteractivelyAndWaitAsync(
    request: SubmitCommandsRequest,
    options?: RequestOptions,
): Promise<SubmitCommandResponse>;
```

The name makes the Ledger API flow explicit without exposing raw generated
interactive-service messages. It is intentionally separate from
`submitAndWaitAsync`.

### Why a separate method

- Existing unsigned callers retain the ordinary, lower-overhead submission
  path.
- JSON behavior remains unsurprising.
- Call sites visibly opt into two-step interactive submission.
- A configured external signer cannot silently change this method's
  participant-local authorization semantics.

### Rejected alternatives

1. **A mode flag on `submitAndWaitAsync`.** This hides the selected Ledger API
   flow inside options and complicates transport behavior.
2. **Changing unsigned gRPC submission globally.** This would add an
   unnecessary prepare round trip and could alter existing failure and timeout
   behavior.
3. **A new public interactive-service client.** The first pass needs one
   high-level operation, not a raw parallel service surface.

## Semantics

`submitInteractivelyAndWaitAsync` has the following contract:

- gRPC only;
- exactly one `actAs` party in the first pass;
- intended for a party hosted locally by the connected participant;
- preserves the non-empty ordered `commands` batch;
- prepares once and executes once;
- sends no application-provided party signatures;
- never invokes a configured `ICommandSigner` or `CommandSigners` map;
- never falls back to ordinary `SubmitAndWait`;
- returns `SubmitCommandResponse`, using the interactive response update ID as
  the SDK transaction ID;
- forwards `RequestOptions` to both interactive RPCs, matching the existing
  signed interactive path.

If an `actAs` party is external, is not hosted on the connected participant, or
otherwise requires a client signature, Canton remains authoritative and the SDK
surfaces the normalized gRPC failure. The SDK does not perform a separate party
topology lookup before submission.

## High-Level Data Flow

```text
CommandServiceClient.submitInteractivelyAndWaitAsync
    -> CommandSubmissionPipeline.submitInteractivelyAsync
        -> ITransport.submitCommandInteractivelyAsync
            -> InteractiveSubmissionService.PrepareSubmission
            -> InteractiveSubmissionService.ExecuteSubmissionAndWait
               (party_signatures omitted)
            -> SubmitCommandResponse
```

The same `SubmitCommandsRequest` instance supplies both stages. A missing
`commandId` is replaced by one generated command ID before preparation. Execute
uses a fresh generated submission ID.

## Internal Boundaries

### Command service and pipeline

`CommandServiceClient` delegates to a new
`CommandSubmissionPipeline.submitInteractivelyAsync` method. The pipeline:

- checks that the selected transport exposes the participant-local interactive
  operation;
- otherwise throws `NotSupportedError` with an interactive-submission-specific
  message;
- does not inspect or pass its configured signer;
- delegates request and request options unchanged.

### Transport interface

Add an optional transport capability:

```ts
submitCommandInteractivelyAsync?(
    request: SubmitCommandsRequest,
    options?: RequestOptions,
): Promise<SubmitCommandResponse>;
```

The optional method is the capability boundary. No new broad feature flag is
needed. gRPC implements it; JSON leaves it absent so the pipeline produces the
standard `NotSupportedError`.

### gRPC transport

`GrpcTransport.submitCommandInteractivelyAsync`:

1. checks disposal;
2. rejects any request whose `actAs.length` is not exactly one;
3. verifies prepare and execute operations are available;
4. chooses `request.commandId` or generates one UUID;
5. calls `PrepareSubmission` with the existing plural request mapper;
6. requires a prepared transaction and a usable hashing-scheme version;
7. calls `ExecuteSubmissionAndWait` with a fresh submission ID and no
   `partySignatures` field;
8. maps the response through the existing interactive response mapper.

The prepare hash may be returned by Canton, but this participant-local path does
not sign it and must not require it merely to execute locally. External signing
and detached preparation retain their existing hash validation.

Shared private helpers may be extracted to remove duplication between local and
externally signed interactive execution, but ordinary submit behavior must not
change.

## Execute Request Mapping

The mapper must distinguish authorization modes explicitly rather than
representing participant-local authorization as an empty signer result list.
The preferred internal shape is a discriminated union:

```ts
type InteractiveAuthorization =
    | { readonly kind: "participantLocal" }
    | {
        readonly kind: "external";
        readonly signerResults: readonly InteractiveSignerResult[];
    };
```

For `participantLocal`, the generated request has:

```ts
partySignatures: undefined
```

For `external`, existing behavior remains: `partySignatures.signatures` is
non-empty and contains each mapped party signature.

All common fields remain identical between modes:

- prepared transaction;
- deduplication period;
- submission ID;
- user ID;
- hashing scheme version.

## Validation and Errors

Fail before execute I/O when:

- the transport does not expose participant-local interactive submission;
- the gRPC transport lacks prepare or execute operations;
- `actAs` contains anything other than one party;
- prepare returns no prepared transaction;
- prepare returns an unusable hashing-scheme version.

Do not:

- call the configured signer;
- synthesize an empty external signature envelope;
- retry prepare or execute automatically;
- fall back to plain submission;
- reinterpret a Canton rejection as a transport-capability failure.

Transport and Canton failures continue through the existing gRPC error
normalization path.

## Existing API Compatibility

The change is additive:

- `submitAndWaitAsync` remains ordinary unsigned submission unless an external
  signer is configured, exactly as today;
- externally signed `submitAndWaitAsync` remains interactive;
- `submitAndWaitForTransactionAsync` remains ordinary gRPC submission;
- `prepareAsync` and `executeAndWaitAsync` retain detached-signing semantics and
  continue to require caller-provided signatures;
- no transaction-returning participant-local interactive method is added in
  this pass;
- no JSON behavior changes.

## Testing Strategy

### Pipeline and public surface

Add tests proving:

- `CommandServiceClient.submitInteractivelyAndWaitAsync` delegates through the
  high-level pipeline;
- the pipeline calls only `submitCommandInteractivelyAsync`;
- a configured signer is not called or forwarded;
- request identity, ordered commands, and `RequestOptions` are preserved;
- a transport without the optional method throws `NotSupportedError`.

### Mapper

Add tests proving:

- participant-local execute omits `partySignatures` entirely;
- external execution still emits the existing non-empty signatures;
- deduplication, user ID, hashing scheme, prepared transaction, and submission
  ID map identically in both modes.

### gRPC runtime

Add tests proving:

- prepare runs exactly once before execute;
- ordinary `submitCommandAsync` is never called;
- no signer is invoked, including when the client was constructed with one;
- the request's command ID is preserved and a missing command ID is generated;
- a fresh submission ID is supplied;
- ordered multi-command batches reach prepare unchanged;
- missing prepared transaction and unsupported operations fail precisely;
- multiple `actAs` parties fail before RPC I/O;
- the response update ID maps to `SubmitCommandResponse.transactionId`.

### JSON and contract coverage

Add tests proving JSON rejects the method through the pipeline capability check
and that the public transport/client contract exposes the optional operation
without weakening other transport implementations.

### Live compatibility

Run the same high-level source with one locally hosted party against participant
3.5.7 and 3.5.8. Each run must prove:

- prepare succeeded;
- execute succeeded without an external signature;
- the expected contract is active;
- the reported compatibility path is common and contains no version branch.

No fallback to ordinary submission is permitted in the live proof.

## Documentation

Update `README.md` and `DOCUMENTATION.md` to distinguish:

- ordinary participant-local submission via `submitAndWaitAsync`;
- participant-local **interactive** submission via
  `submitInteractivelyAndWaitAsync`;
- externally signed interactive submission through configured signers or the
  detached prepare/execute API.

Document gRPC-only support, the single-`actAs` first-pass limit, absence of a
transaction-returning variant, and the fact that Canton rejects parties that
cannot be authorized locally without supplied signatures.

## Non-Goals

This pass does not add:

- a transaction-returning participant-local interactive method;
- asynchronous execute without waiting;
- JSON interactive submission;
- a raw public `InteractiveSubmissionService` client;
- external/local mixed authorization in one request;
- multi-party participant-local interactive submission;
- topology preflight or automatic hosting detection;
- automatic retry or fallback to ordinary submission;
- changes to generated protobuf sources or localnet configuration.

## Success Criteria

The work is complete when:

1. callers can explicitly submit a `SubmitCommandsRequest` through interactive
   prepare and execute without supplying signatures;
2. the high-level pipeline never calls plain submit or a configured signer for
   that method;
3. the execute request omits `partySignatures`;
4. existing ordinary and external-signing flows remain unchanged;
5. unit, integration, package, and live 3.5.7/3.5.8 verification pass;
6. the worktree contains no generated-protobuf or localnet configuration
   changes.
