# Interactive gRPC Command Signing Design

## Goal

Fix the SDK command submission path so:

- gRPC command submission can carry `userId` when required by authenticated Canton setups
- external command signing on gRPC is implemented on the correct Ledger API surface
- the public SDK keeps a single `commandService.submitAndWaitAsync(...)` entrypoint

This design replaces the current incorrect model where the SDK computes a detached signature and then calls plain `CommandService.SubmitAndWait`, even though that RPC has no signature field.

## Problem Statement

Current SDK `0.1.4` has two defects in the gRPC command path:

1. `Commands.userId` is hardcoded to `""` in the gRPC mapper, which breaks environments that require a non-empty user id unless auth metadata already supplies one.
2. The SDK advertises gRPC external command signing support, but the generated signature is ignored because plain `CommandService.SubmitAndWait` does not accept party signatures.

This means:

- authenticated non-external command submissions can fail because `userId` cannot be supplied
- externally signed command submissions are not actually implemented, even though the SDK surface implies that they are

## API Reality

The generated Ledger API types show two distinct paths:

### Plain command submission

`com.daml.ledger.api.v2.CommandService.SubmitAndWait`

- request carries `Commands`
- `Commands` includes `userId`
- request does not contain party signatures

This path is correct for ordinary submissions.

### Interactive external signing

`com.daml.ledger.api.v2.interactive.InteractiveSubmissionService`

- `PrepareSubmission` creates a prepared transaction and prepared transaction hash
- client signs the prepared transaction hash
- `ExecuteSubmissionAndWait` submits the prepared transaction plus `partySignatures`

This path is the correct transport for external command signing.

## Public Surface

The public SDK surface remains:

- `commandService.submitAndWaitAsync(request, options?)`

The public request type is extended:

- `SubmitCommandRequest`
  - `applicationId: string`
  - `actAs: readonly string[]`
  - `readAs?: readonly string[]`
  - `command: LedgerCommand`
  - `userId?: string`

No separate public interactive service is introduced in this pass.

## Signing Model

The current signer contract is too weak for real Canton interactive submission because raw signature bytes are not enough. The SDK needs the signer to return a Canton-usable signature envelope.

### Signer input

`SignCommandRequest` becomes:

- `payload: Uint8Array`
- `keyId?: string`
- `party?: string`
- `algorithmHint?: string`

For interactive signing, `payload` is the prepared transaction hash returned by `PrepareSubmission`.

### Signer output

`SignCommandResult` becomes:

- `algorithm: string`
- `signature: Uint8Array`
- `signedBy: string`
- `keyId?: string`

`signedBy` is the Canton key fingerprint or equivalent signer identifier required for Ledger API `Signature.signedBy`.

## Runtime Behavior

### Unsigned gRPC submissions

If no signer is configured:

1. Build `Commands` from the SDK request
2. Include `userId` when supplied
3. Submit through `CommandService.SubmitAndWait`

This is the existing non-interactive path, corrected to support `userId`.

### Signed gRPC submissions

If a signer is configured:

1. Validate this is currently a single-party submission
   - require exactly one `actAs` party
2. Build `PrepareSubmissionRequest` from the same SDK command DTO
3. Call `InteractiveSubmissionService.PrepareSubmission`
4. Send the returned prepared transaction hash to the signer
5. Build `PartySignatures` with the returned signature and signer identity
6. Call `InteractiveSubmissionService.ExecuteSubmissionAndWait`
7. Map the response back to `SubmitCommandResponse`

### JSON submissions

JSON keeps its current behavior:

- unsigned JSON submission supported
- command signing rejected with `NotSupportedError`

## Single-Party Scope

This pass supports single-party external command signing only.

Reason:

- interactive submission types can carry multiple party signatures
- the current signer abstraction only supports a single signing result per request
- multi-party coordination requires a different public workflow and should be implemented explicitly later

Signed submissions therefore reject:

- `actAs.length !== 1`

with a precise SDK error explaining that multi-party interactive signing is not implemented yet.

## Internal Architecture

Keep one shared SDK command model and split only at transport execution time.

### Existing components that stay shared

- `LedgerCommand` union
- `SubmitCommandRequest`
- command DTO validation
- JSON command mapper
- common command-service client surface

### New or changed gRPC internals

- `mapGrpcSubmitCommandRequest(...)`
  - still used for unsigned submissions
  - must map `userId`
- `mapGrpcPrepareSubmissionRequest(...)`
  - builds interactive prepare request from SDK command DTOs
- `mapGrpcExecuteSubmissionAndWaitRequest(...)`
  - builds interactive execute request from prepared transaction + signer output
- `mapGrpcSignature(...)`
  - maps SDK signer output to Ledger API `Signature`
- `GrpcTransport.submitCommandAsync(...)`
  - dispatches between plain submit and interactive submit based on whether `signed` is provided

## Transport Feature Semantics

`supportsCommandSigning` on gRPC remains `true`, but its meaning changes from:

- "gRPC accepts a signer"

to:

- "gRPC implements external signing through interactive submission"

This is the behavior the public surface should always have advertised.

## Error Handling

The SDK should fail early with clear errors for:

- signer configured on JSON transport
- signed gRPC submission with zero or more than one `actAs` party
- interactive prepare response missing required fields
- signer returning an empty signature
- signer returning empty `signedBy`

The SDK should not silently fall back from interactive to plain submission when a signer is present.

## Testing Strategy

Add regression coverage before implementation for:

1. unsigned gRPC submit includes `userId` when set
2. signed gRPC submit does not call plain `SubmitAndWait`
3. signed gRPC submit calls:
   - prepare
   - signer
   - execute-and-wait
4. signer input payload is the prepared transaction hash, not the canonical command JSON payload
5. signed gRPC submit rejects multiple `actAs`
6. JSON still rejects command signing
7. docs and service-runtime tests reflect the corrected meaning of gRPC signing support

Prefer focused unit and contract coverage over live-network work in this pass.

## Documentation Changes

Update public docs to state:

- `SubmitCommandRequest` supports optional `userId`
- unsigned gRPC uses `CommandService.SubmitAndWait`
- signed gRPC uses interactive submission under the hood
- JSON does not support external command signing
- single-party signing is the current limitation

Also remove or correct any docs that imply plain gRPC submit carries detached signatures directly.

## Non-Goals

This pass does not add:

- multi-party interactive signing
- a separate public interactive submission service
- prepared-transaction inspection APIs
- JSON external signing
- new command submission flows beyond `submitAndWaitAsync`

## Recommended Implementation Order

1. Extend request and signer DTOs
2. Add failing tests for `userId` and interactive signed gRPC behavior
3. Add interactive gRPC operation wiring
4. Implement interactive mappers
5. Switch transport dispatch logic
6. Update docs

