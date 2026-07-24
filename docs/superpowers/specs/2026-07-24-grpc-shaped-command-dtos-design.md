# gRPC-Shaped Command DTOs Design

## Goal

Make the public ledger-command DTOs mirror the Ledger API v2 command protobufs: use structured identifiers and explicit DAML records, then serialize that one model through both gRPC and JSON transports.

## Public Model

The SDK will expose its own `TemplateId` value shape:

```ts
interface TemplateId {
    readonly packageId: string;
    readonly moduleName: string;
    readonly entityName: string;
}
```

`CreateCommand`, `ExerciseCommand`, `ExerciseByKeyCommand`, and `CreateAndExerciseCommand` will accept `templateId: TemplateId`. Colon-delimited template-ID strings are removed; there is no compatibility parser.

Create-bearing commands use the protobuf field name and type:

```ts
new CreateCommand({
    templateId,
    createArguments: new DamlRecord({ fields }),
});
```

`DamlRecord` is already the SDK representation of a protobuf `Record`; it preserves record identifiers and explicitly expresses that these arguments are a Daml record. `payload: Record<string, unknown>` is removed.

Exercise commands remain structurally aligned to protobuf:

```ts
new ExerciseCommand({
    templateId,
    contractId,
    choice,
    choiceArgument,
});
```

`contractId` remains the SDK's string representation (the protobuf field is a string). `choiceArgument` and `contractKey` remain `unknown`, because protobuf represents each as the complete Daml `Value` union, already handled by the SDK's value wrappers.

`SdkCommand` will use the same structured identifier and `DamlRecord` create-argument shape so command-facing APIs do not retain an alternative representation.

## Mapping

The gRPC command mapper becomes the canonical serialization boundary. It copies `TemplateId` fields directly into protobuf `Identifier`, maps `DamlRecord` directly to protobuf `Record`, and maps choice arguments / contract keys through the existing `mapValue` function.

The JSON mapper consumes the exact same DTOs. It receives the structured identifier and uses the JSON Ledger API's expected string template identifier only at the HTTP serialization boundary. It serializes `DamlRecord.fields` as the create-argument object and applies the same DAML-value normalization used for choice arguments and keys.

## Validation and Errors

Command constructors validate non-empty `moduleName` and `entityName`, required `contractId`/`choice`, and that create arguments are a `DamlRecord`. `packageId` may be empty, matching protobuf `Identifier` semantics. Invalid inputs continue to throw `ValidationError` at construction time.

## Scope

This is a breaking API cleanup. All internal call sites, tests, generated binding output, examples, and test runtime helpers move to the new shapes. No colon-string or `payload` compatibility aliases remain.

## Tests

Unit tests will first demonstrate that every command maps to the expected gRPC `Command` oneof, preserving all `Identifier` fields and `DamlRecord` fields. JSON tests will demonstrate that the identical command DTO serializes to the JSON command wire shape. Constructor validation tests will cover malformed structured identifiers and non-record create arguments. The TypeScript build then serves as the migration check for the full public/internal surface.
