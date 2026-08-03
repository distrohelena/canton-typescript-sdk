# Submit Commands Request Design

## Goal

Replace the SDK's singular command-submission request with a breaking, plural API that exposes Canton's non-empty ordered `Commands.commands` batch without a compatibility alias.

## Problem

The generated Ledger API models a submission as one `Commands` envelope containing a required, non-empty repeated `commands` field. The SDK currently exposes `SubmitCommandRequest.command: LedgerCommand`, and the gRPC, JSON, and interactive-submission mappers wrap that value in a singleton array. As a result, callers cannot submit two independent commands atomically even though every underlying API supports it. The singular public name also hides the batch semantics.

`CreateAndExerciseCommand` is one composite Ledger API command. It does not substitute for an ordered batch of independent commands.

## Chosen API

The old class and source file are removed. The replacement is:

```ts
export type NonEmptyLedgerCommands = readonly [
    LedgerCommand,
    ...LedgerCommand[],
];

export class SubmitCommandsRequest {
    public readonly commands: NonEmptyLedgerCommands;

    public constructor(init: {
        applicationId: string;
        userId?: string;
        actAs: readonly string[];
        readAs?: readonly string[];
        commands: NonEmptyLedgerCommands;
        commandId?: string;
        deduplicationPeriod?: CommandDeduplicationPeriod;
        disclosedContracts?: readonly DisclosedContract[];
        synchronizerId?: string;
    });
}
```

The remaining envelope fields and their validation retain their current behavior. The constructor also performs a runtime array and non-empty check because JavaScript callers and unsafe TypeScript casts can bypass the tuple type. It stores an immutable shallow copy of the commands so later caller mutation cannot alter the submitted batch.

There is no `SubmitCommandRequest` export, alias, deprecated wrapper, `command` property, or singular/plural constructor union. This is an intentional breaking correction.

## Alternatives Rejected

1. Keep `SubmitCommandRequest` and only rename `command` to `commands`. This exposes batches but preserves a misleading public type name.
2. Accept both `command` and `commands`. This reduces migration friction but creates ambiguous validation and permanent compatibility baggage.
3. Add a second plural request alongside the singular request. This duplicates every service and mapper path and leaves callers unsure which API is canonical.

## Data Flow

All command-submission entry points accept `SubmitCommandsRequest`:

- `CommandServiceClient.submitAndWaitAsync`
- `CommandServiceClient.submitAndWaitForTransactionAsync`
- `CommandServiceClient.prepareAsync`
- command-submission pipeline and transport interfaces
- gRPC and JSON transports
- prepared-command state used by interactive execution

The gRPC mapper converts `request.commands` in order with `request.commands.map(mapGrpcLedgerCommand)` and writes the complete result to generated `Commands.commands`. The JSON mapper performs the equivalent ordered mapping. Interactive preparation writes the complete batch to `PrepareSubmissionRequest.commands`; detached signing and execution continue to operate on the single prepared transaction produced for that atomic batch.

The batch order is preserved exactly. No mapper filters, sorts, deduplicates, or splits commands. A mapper failure for any member rejects the whole request before transport dispatch.

## Atomicity and Responses

One `SubmitCommandsRequest` remains one ledger submission and one change ID. All commands in the batch are interpreted atomically by Canton. Existing response types remain singular because the participant returns one completion or transaction for the submission:

- `SubmitCommandResponse`
- `SubmitCommandTransactionResponse`
- `PreparedCommandSubmission`

Only `PreparedCommandSubmission.request` changes type to `SubmitCommandsRequest`.

## Repository Migration

Every SDK, testing, example, integration, contract, and live-fuzz caller migrates from:

```ts
new SubmitCommandRequest({ command })
```

to:

```ts
new SubmitCommandsRequest({ commands: [command] })
```

Callers that already model an atomic sequence use the full ordered tuple. The old request filename, imports, root export, references, and singular mapper access must be absent after migration.

Example 90 is extended or supplemented to prove a genuine two-command atomic submission. Its two independent commands must succeed together, and an invalid second command must demonstrate atomic rejection without leaving the first command active. The live proof runs on the existing localnet without a participant-version branch.

## Validation and Errors

The request constructor rejects:

- a non-array `commands` value;
- an empty commands array;
- the existing invalid `actAs`, command ID, or deduplication inputs.

Individual unsupported command objects continue to fail in the transport mapper with the existing `ValidationError`. The request does not add command-specific validation that belongs to the individual command classes.

## Testing

TDD coverage includes:

1. Public request construction with one and multiple commands, order preservation, immutable storage, and runtime empty/non-array rejection.
2. gRPC mapping of two heterogeneous commands in exact order.
3. JSON mapping of the same ordered batch.
4. Interactive preparation of the complete batch and unchanged prepared execution behavior.
5. Client, pipeline, transport, contract, integration, testing-runtime, live-fuzz, and example compilation after removal of the singular type.
6. A repository source assertion proving `SubmitCommandRequest`, `submit-command-request`, and `request.command` no longer exist in handwritten source, examples, or tests.
7. A localnet atomicity proof with two independent commands, including an invalid-batch case that proves no partial commit.
8. Full build, tests, live tests, changed-file lint, package verification, and packed public-export checks.

## Documentation

README and command examples use plural terminology and explain that one request contains a non-empty atomic ordered batch. Migration guidance shows the mechanical singleton conversion and the multi-command form, without documenting a compatibility path.

## Non-goals

- Changing generated protobuf files.
- Changing Canton transaction or completion semantics.
- Adding parallel, best-effort, or partially successful submission behavior.
- Renaming response types whose singular result semantics remain accurate.
- Preserving source or runtime compatibility with `SubmitCommandRequest`.
