# Full Ledger Command Surface Design

## Goal

Expand the public SDK command submission surface from create-only submission to the full Ledger API v2 command set while preserving the SDK's instance-oriented, C#-style public boundary.

This design must unblock application flows that require exercises such as `MintUnderlying`, `CreateVault`, `deposit`, and `redeem`, while keeping the command model reusable for later interactive or externally signed command submission.

## Scope

This design covers the shared public command submission surface exposed through:

- `SubmitCommandRequest`
- `commandService.submitAndWaitAsync(request)`
- canonical command payload construction used by external signing
- gRPC and JSON transport mapping for command submission
- public DTOs and docs for all supported command kinds

This design includes the full Ledger API command set already present in the generated API:

- `CreateCommand`
- `ExerciseCommand`
- `ExerciseByKeyCommand`
- `CreateAndExerciseCommand`

This design does not yet cover:

- a new interactive submission public API
- externally signed command execution over a separate Ledger API path
- staged multi-user or multi-participant approval workflows
- batching multiple SDK commands into a single `SubmitCommandRequest`
- reassignment commands

## Problem Statement

The current public SDK surface exposes only a create command:

- `SubmitCommandRequest.command` is typed as `CreateCommand`
- gRPC command mapping always emits protobuf `Command.oneofKind = "create"`
- the canonical command payload builder used for external signing serializes only the create shape
- documentation teaches only create submission

This is narrower than the real Ledger API and blocks standard business flows that require exercising existing contracts or exercising by key.

The generated Ledger API already exposes the complete command surface in:

- `src/transports/grpc/generated/canton/com/daml/ledger/api/v2/commands.ts`

So this is an SDK-owned modeling gap, not a protocol limitation.

## Public API Design

### Command DTO Set

The SDK should expose one DTO class per Ledger API command type:

- `CreateCommand`
- `ExerciseCommand`
- `ExerciseByKeyCommand`
- `CreateAndExerciseCommand`

Each remains an SDK-owned public DTO. Generated protobuf classes stay internal to transports.

### Submit Request Shape

`SubmitCommandRequest` should keep a single `command` property, but widen it from `CreateCommand` to an SDK command union.

Recommended public typing:

- `command: LedgerCommand`

Where `LedgerCommand` is a public SDK union type covering:

- `CreateCommand`
- `ExerciseCommand`
- `ExerciseByKeyCommand`
- `CreateAndExerciseCommand`

This keeps the public surface close to the Ledger API without splitting one conceptual API into multiple request types.

### DTO Field Shapes

#### `CreateCommand`

- `templateId: string`
- `payload: Record<string, unknown>`

#### `ExerciseCommand`

- `templateId: string`
- `contractId: string`
- `choice: string`
- `argument: unknown`

Notes:

- `templateId` may refer to either a template or an interface identifier, matching Ledger API semantics

#### `ExerciseByKeyCommand`

- `templateId: string`
- `contractKey: unknown`
- `choice: string`
- `argument: unknown`

#### `CreateAndExerciseCommand`

- `templateId: string`
- `payload: Record<string, unknown>`
- `choice: string`
- `argument: unknown`

### Why One Request Type

The SDK should not introduce parallel submit request types such as:

- `SubmitExerciseCommandRequest`
- `SubmitCreateAndExerciseCommandRequest`

That would fragment one Ledger API concept into several SDK entry points and drift away from the gRPC shape.

## Naming And Boundary Rules

This design follows the repo's gRPC-first public API philosophy:

- public command names mirror Ledger API names
- public method name stays `submitAndWaitAsync` because it already mirrors `CommandService.SubmitAndWait`
- command DTOs remain SDK-owned types rather than generated protobuf passthroughs
- JSON support adapts to the gRPC-shaped public API rather than redefining it

## Transport Mapping

### gRPC

The gRPC mapper should switch on the SDK command instance and emit the matching protobuf `Command` oneof:

- `CreateCommand` -> `command.oneofKind = "create"`
- `ExerciseCommand` -> `command.oneofKind = "exercise"`
- `ExerciseByKeyCommand` -> `command.oneofKind = "exerciseByKey"`
- `CreateAndExerciseCommand` -> `command.oneofKind = "createAndExercise"`

Shared value conversion should continue to use the existing SDK-to-protobuf value mapping rules for:

- create payload records
- exercise choice arguments
- exercise-by-key contract keys
- create-and-exercise create payload and choice argument

### JSON

The JSON submission path should accept the same SDK command union.

The JSON mapper should serialize the corresponding command shape according to the JSON ledger API submission format instead of assuming create-only submission.

If the current JSON endpoint cannot support a specific command kind cleanly, that limitation should be documented explicitly and surfaced as a transport error or `NotSupportedError` for that shape rather than silently coercing behavior.

However, the design target is one shared command model across both transports.

## Canonical Payload And External Signing

The canonical command payload builder is part of the real public submission contract because it drives gRPC external signing today.

The current builder serializes only:

- `templateId`
- `payload`

This is insufficient once non-create commands are supported.

The canonical payload must be redesigned to encode the full SDK command union deterministically. It should include the command kind plus the fields required for that specific kind.

Recommended canonical shape:

```json
{
  "applicationId": "...",
  "actAs": ["..."],
  "readAs": ["..."],
  "command": {
    "kind": "exercise",
    "templateId": "Main:Vault",
    "contractId": "00...",
    "choice": "Deposit",
    "argument": {
      "amount": "100.0"
    }
  }
}
```

Rules:

- include an explicit command kind discriminator
- include only the fields relevant to that command kind
- preserve deterministic JSON property ordering as implemented today
- keep the payload builder transport-neutral

This is important because phase 1 still uses standard participant submission, but the same command DTOs must remain valid input for future interactive or externally signed submission flows.

## Validation Rules

`SubmitCommandRequest` should keep current request-level validation:

- `actAs` must contain at least one party

Each command DTO should validate its required fields:

### `CreateCommand`

- `templateId` must be non-empty
- `payload` must be present

### `ExerciseCommand`

- `templateId` must be non-empty
- `contractId` must be non-empty
- `choice` must be non-empty

### `ExerciseByKeyCommand`

- `templateId` must be non-empty
- `choice` must be non-empty
- `contractKey` must be present

### `CreateAndExerciseCommand`

- `templateId` must be non-empty
- `payload` must be present
- `choice` must be non-empty

Choice arguments and contract keys should remain `unknown` at the public boundary. They should flow through the existing SDK value-mapping logic instead of forcing a prematurely rigid TypeScript type system over Daml values.

## Architecture Changes

The implementation should extend the existing command submission path instead of creating a parallel subsystem.

Expected file areas:

- `src/core/types/commands/`
- `src/core/types/requests/submit-command-request.ts`
- `src/services/commands/command-payload-builder.ts`
- `src/transports/grpc/mappers/commands-mapper.ts`
- JSON command submission mapping code
- public exports in `src/index.ts`
- docs and tests

Recommended structural additions:

- add SDK DTO files for the new command classes
- add a small shared public command union type
- keep command-kind branching centralized in mapper and canonical payload code

Avoid:

- vault-specific helpers at this layer
- transport-specific public command DTOs
- separate submit request types per command kind

## Future-Safe Boundaries

This design intentionally keeps the command DTO model independent from the eventual submission workflow.

Phase 1 target:

- one participant
- standard ledger command submission through the existing command pipeline

Future extensions that should reuse the same DTO set:

- interactive submission preparation/execution
- externally signed command flows
- richer multi-party or staged approval workflows

The command DTOs describe *what* is being submitted. Future submission APIs can add distinct workflow types for *how* it is authorized or executed without redefining the command model.

## Documentation Requirements

Update `DOCUMENTATION.md` to cover:

- widened `SubmitCommandRequest.command`
- each command DTO and its fields
- transport support notes for command submission
- external-signing note that canonical payloads now include all command kinds

Examples should include at least:

- create
- exercise
- exercise by key
- create-and-exercise

## Testing Strategy

Required coverage:

### DTO Tests

- constructor validation for each new command DTO
- widened `SubmitCommandRequest` acceptance of all command kinds

### gRPC Mapper Tests

- `CreateCommand` maps to protobuf create command
- `ExerciseCommand` maps to protobuf exercise command
- `ExerciseByKeyCommand` maps to protobuf exercise-by-key command
- `CreateAndExerciseCommand` maps to protobuf create-and-exercise command

### Canonical Payload Tests

- canonical payload includes command kind discriminator
- canonical payload encodes each command kind correctly
- create-only signing behavior remains backward-stable where intended

### Transport And Service Tests

- `commandService.submitAndWaitAsync(...)` works with each command kind
- JSON transport behavior is verified per command kind
- gRPC command-signing path still works with the widened command model

### Integration Or Contract Tests

Add live or contract coverage for:

- create
- exercise
- exercise by key
- create-and-exercise

This is important because vault-oriented application flows depend on real exercise support, not just DTO or mapper correctness.

## Out Of Scope

This design does not yet add:

- a public interactive submission service
- multi-command submission arrays
- a staged external approval orchestration API
- participant-admin topology signing for ledger commands
- vault-specific convenience wrappers

Those can be added later on top of this command model once the base Ledger API command surface is complete.
