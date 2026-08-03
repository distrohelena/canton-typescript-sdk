# Participant-Local Command Submission Design

## Status

Corrected direction after distinguishing participant-hosted command submission
from externally signed interactive submission.

## Goal

Allow one high-level `CommandServiceClient` to submit both:

- externally authorized commands through interactive prepare/sign/execute; and
- participant-local commands for parties hosted by the connected participant,
  without invoking or supplying an external signer.

The new explicit API is:

```ts
commandService.submitParticipantLocalAndWaitAsync(request, options?)
```

It returns `SubmitCommandResponse` and uses the ordinary participant command
submission operation. It does not call `InteractiveSubmissionService`.

## Correct Domain Model

A party hosted by the connected participant does not need an application-held
external party key to submit a command. The participant authorizes and submits
that transaction through the ordinary `CommandService.SubmitAndWait` flow.

`InteractiveSubmissionService.PrepareSubmission` plus
`ExecuteSubmissionAndWait` is the externally signed flow. Its execute request
requires non-empty party signatures on Canton Participant 3.5.7 and 3.5.8,
including when the named party is also hosted locally. It must not be used as
an unsigned participant-local transport.

The distinction is therefore authorization mode, not whether both operations
are exposed by the same high-level SDK command pipeline.

## Current Gap

`CommandServiceClient` accepts an optional signer at construction time.
`submitAndWaitAsync` delegates that signer to the transport for every request:

- without a configured signer, the gRPC transport uses ordinary
  `CommandService.SubmitAndWait`;
- with a configured signer, the gRPC transport always uses interactive
  prepare/sign/execute.

Consequently, a client configured to submit for an external party has no
per-call high-level path for a participant-hosted party. Applications must
construct a second signer-free client even though endpoints, authentication,
transport lifetime, and all other services are identical.

## Public API

Add this method to `CommandServiceClient`:

```ts
public submitParticipantLocalAndWaitAsync(
    request: SubmitCommandsRequest,
    options?: RequestOptions,
): Promise<SubmitCommandResponse>;
```

The explicit name keeps the authorization decision visible at the call site.
It also preserves the existing meaning of `submitAndWaitAsync`: use the
client's configured signer when one exists.

### Why an explicit method

- A single client can deliberately choose hosted-party or external-party
  authorization per submission.
- Existing callers and signer behavior remain unchanged.
- `RequestOptions` remains transport-only and does not become a mixed bag of
  RPC controls and authorization policy.
- The method does not imply use of the Ledger API interactive RPC.

## Semantics

`submitParticipantLocalAndWaitAsync`:

- accepts the same plural, ordered `SubmitCommandsRequest` as
  `submitAndWaitAsync`;
- delegates to the selected transport's ordinary `submitCommandAsync` with no
  signer argument;
- never invokes or forwards the client-configured `ICommandSigner` or
  `CommandSigners` map;
- forwards `RequestOptions` unchanged;
- returns the transport's `SubmitCommandResponse` unchanged;
- supports every transport whose ordinary `submitCommandAsync` supports the
  request, currently gRPC and JSON;
- performs no party-topology lookup or client-side assertion that an `actAs`
  party is hosted locally;
- surfaces the transport or participant rejection if the party cannot be
  authorized by the connected participant.

It supports the same `actAs` cardinality as ordinary participant submission.
There is no artificial single-party restriction.

## High-Level Data Flow

```text
CommandServiceClient.submitParticipantLocalAndWaitAsync
    -> CommandSubmissionPipeline.submitParticipantLocalAsync
        -> ITransport.submitCommandAsync(request, undefined, options)
            -> gRPC: CommandService.SubmitAndWait
            -> JSON: ordinary JSON command submission endpoint
```

The externally signed flow remains:

```text
CommandServiceClient.submitAndWaitAsync
    -> CommandSubmissionPipeline.submitAsync
        -> ITransport.submitCommandAsync(request, configuredSigner, options)
            -> gRPC: PrepareSubmission -> signer -> ExecuteSubmissionAndWait
```

## Internal Boundaries

### Command service and pipeline

`CommandServiceClient.submitParticipantLocalAndWaitAsync` delegates to a new
`CommandSubmissionPipeline.submitParticipantLocalAsync` method.

The pipeline method deliberately passes `undefined` as the signer to the
existing required `ITransport.submitCommandAsync` operation. No transport
interface addition or feature flag is necessary.

The existing `submitAsync` method and its command-signing capability check are
unchanged. The participant-local method does not check
`supportsCommandSigning`, because participant submission does not use command
signing.

### Transports

No production transport implementation changes are required. Existing gRPC
and JSON behavior already interprets an absent signer as ordinary participant
submission.

This reuse is intentional: authorization selection belongs in the high-level
pipeline, while each transport continues to own its established ordinary
submission mapping and response normalization.

## Validation and Errors

The new method adds no speculative hosting validation. In particular it does
not:

- query `PartyToParticipant` before submission;
- infer authorization from party identifier shape;
- fall back to external signing after a participant rejection;
- fall back to another participant;
- retry automatically.

Request validation, authorization, deduplication, and participant errors remain
owned by the existing request DTO, transport, and Canton endpoint.

## Existing API Compatibility

The change is additive:

- `submitAndWaitAsync` without a configured signer remains ordinary
  participant submission;
- `submitAndWaitAsync` with a configured signer remains externally signed
  interactive submission;
- `submitParticipantLocalAndWaitAsync` always chooses ordinary participant
  submission, even when the client has a signer;
- `submitAndWaitForTransactionAsync`, `prepareAsync`, and
  `executeAndWaitAsync` remain unchanged;
- no transaction-returning participant-local counterpart is added in this
  pass;
- no generated protobuf or localnet changes are required.

## Testing Strategy

### Pipeline RED/GREEN test

Construct a real `CommandSubmissionPipeline` with a configured signer and a
specific transport double. Call `submitParticipantLocalAsync` with multiple
ordered commands and `RequestOptions`. Prove through the observable returned
response and captured boundary arguments that:

- the request and options reach ordinary submission unchanged;
- the signer argument is `undefined`;
- the configured signer is not invoked.

The test must fail first because the participant-local pipeline method does not
exist.

### High-level gRPC contract test

Construct a real `CommandServiceClient` and `GrpcTransport` with:

- a configured signer that fails if called;
- a plain submission operation returning a known response;
- interactive prepare and execute operations that fail if called.

Call `submitParticipantLocalAndWaitAsync` and assert the known participant
response. This catches accidental routing back through the configured signer
or interactive operations.

### JSON coverage

Use the real JSON transport submission boundary with a configured signer on
the high-level client. Prove the explicit participant-local method reaches the
ordinary JSON request and does not trigger the existing JSON external-signing
rejection.

### Live compatibility example

Add a standalone TypeScript example that:

1. creates a normal authenticated client with a deliberately unusable signer;
2. resolves or allocates a participant-hosted party;
3. uploads the existing test DAR fixture if needed;
4. submits a create command through
   `submitParticipantLocalAndWaitAsync`;
5. verifies the created contract is active;
6. reports the participant version and common compatibility path.

Run the unchanged example against authenticated Participant 3.5.7 and the
isolated Participant 3.5.8 sidecar. A successful command proves the signer was
not invoked and the participant-local transaction completed.

## Documentation

Update `README.md` and `DOCUMENTATION.md` to distinguish three call patterns:

1. signer-free client plus `submitAndWaitAsync`: ordinary participant
   submission;
2. signer-configured client plus `submitAndWaitAsync`: externally signed
   interactive submission;
3. signer-configured client plus `submitParticipantLocalAndWaitAsync`:
   explicitly bypass the signer for a hosted-party participant transaction.

Document that "participant-local" describes the caller's intended
authorization route. Canton remains authoritative about whether the submitted
`actAs` parties are hosted and authorized.

## Non-Goals

This pass does not add:

- unsigned execution through `InteractiveSubmissionService`;
- automatic party-hosting detection;
- automatic selection between participant and external authorization;
- mixed participant-local and externally signed `actAs` parties in one
  command submission;
- a transaction-returning explicit participant-local method;
- participant-admin key export or command-signing APIs;
- changes to generated protobufs or participant configuration.

## Success Criteria

The work is complete when:

1. a signer-configured client can explicitly submit a hosted-party command
   without invoking or forwarding that signer;
2. the request uses ordinary participant command submission rather than
   interactive prepare/execute;
3. ordinary signer-free and externally signed behavior remains unchanged;
4. ordered multi-command batches and `RequestOptions` are preserved;
5. gRPC and JSON unit/contract tests pass;
6. the same standalone example succeeds on Participant 3.5.7 and 3.5.8;
7. no generated protobuf or localnet change is introduced.
