# DAML Template Class Generator Design

**Date:** 2026-07-29

## Goal

Replace the current static, cast-based DAML-interface bindings with generated
TypeScript contract classes. A generated template must materialize correctly
from the normal SDK result object a caller already has, whether it originated
from gRPC, PQS, or JSON-shaped data.

## Generated surface

The generated project contains a small support runtime plus one module per
DAML template.

`DamlTemplate` owns only a private contract ID. Its constructor receives the
ID and `get(): string` returns it.

For every DAML template, the generator emits:

- a fields-only interface, such as `IouFields`;
- a template class, such as `Iou`, that extends `DamlTemplate` and implements
  that interface; and
- one typed exercised-event class per choice, such as
  `IouTransferExercisedEvent`.

The template-class constructor accepts `contractId` first, then the template
fields in their DAML declaration order. The generated static API is:

```ts
Iou.fromCreatedEvent(source): Iou
Iou.fromExercisedEvent(source): IouTransferExercisedEvent | IouArchiveExercisedEvent
```

Every generated choice-event class has the following uniform public contract:

```ts
class IouTransferExercisedEvent {
  public static readonly choiceName: "Transfer";
  public readonly contractId: string;
  public readonly argument: IouTransferChoiceArgument;
  public readonly result: IouTransferChoiceResult;
  public readonly consuming: boolean;
  public readonly metadata: DamlExercisedEventMetadata;
}
```

`metadata` carries the normalized source event details where available:
template ID, offset, node ID, acting parties, witness parties, and last
descendant node ID. The class retains these fields exactly as supplied by the
normalizer; it does not attempt to reconstruct the template payload, because
an exercised event does not necessarily contain that payload. The static
`fromExercisedEvent` method validates the selected choice and constructs this
specific class from its decoded argument and result.

The old static command helpers (`create` and `exerciseX`) and unsafe
`decodeCreatedEvent` / `decodeExercisedEvent` helpers are removed rather than
kept as a competing API.

## Source normalization and value conversion

A generated shared runtime owns all transport-shape handling. Its source
normalizer accepts and recognizes:

- raw gRPC `CreatedEvent` and `ExercisedEvent` values;
- gRPC response wrappers, including the result of `getContractAsync`;
- PQS `ContractResult` and `ExerciseResult` values; and
- JSON-equivalent event and contract payloads.

It extracts a canonical internal created or exercised event before the
template-specific converter performs identifier checks and DAML value decoding.
Generated template files do not contain source-specific branching.

The value converter is descriptor-driven: it converts the Ledger API `Value`
representation to the corresponding generated TypeScript value, not to an
unverified `unknown` or a collection of strings. The intended mappings include
`bigint` for `Int64`, `DamlNumeric` for exact numeric values, `DamlParty` for
parties, and typed representations of records, optionals, lists, maps,
variants, enums, dates, timestamps, and contract IDs. An unsupported DAML-LF
shape must fail generation or conversion explicitly; it must never silently
produce a falsely typed cast.

The current DAML-LF analysis model only supports a narrow primitive subset and
the current generator accepts only `Text`. This delivery expands the type
metadata and generator descriptors through the complete Ledger API value
surface: unit, bool, int64, date, timestamp, numeric, party, text, contract
ID, optional, list, text map, generic map, record, variant, and enum,
including nested values and type-constructor resolution. This is the bounded
first-delivery support set. Any DAML-LF form outside that set, or a form whose
descriptor cannot be resolved, remains an explicit generation error.

## Naming and collision policy

Collision prevention is a correctness requirement.

- A template identity is always the full
  `packageId:moduleName:entityName`, never the short `Module:Template` form.
- Generated paths include package ID and module. Normalization collisions add
  a deterministic short hash derived from the full identity.
- The generated root barrel uses stable package/module namespaces instead of
  flat `export *` re-exports, so two `Iou` templates can coexist.
- DAML field and choice labels remain the ledger-decoding keys. Their generated
  TypeScript property names are escaped or deterministically suffixed when
  they conflict with a keyword, `DamlTemplate` member (`get` or `contractId`),
  or a previously normalized sibling name.
- Before emitting files, the generator validates every generated path,
  namespace, class name, interface name, choice event class, constructor
  parameter, and property name across the full analysis set. Any unresolved
  collision fails with the conflicting DAML identities in the error.

## Validation

Materialization fails with a specific error when:

- no supported created/exercised source payload is present;
- a supplied full template ID does not match the generated template;
- an exercise choice is unknown for the template;
- a required field is absent; or
- a ledger value does not match the declared DAML type.

Errors name the template, field or choice, and input-source shape wherever
available.

## Tests

Tests cover:

- generated declarations, constructors, and removal of the legacy static API;
- collision-safe paths, barrels, fields, choices, and imports;
- materializing identical contracts from raw gRPC events, `getContractAsync`
  responses, PQS rows, and JSON payloads;
- each supported DAML value kind and nested values;
- each exercised choice returning its own event class; and
- all validation failures plus compiling a generated fixture project.

## Delivery order

1. Add the generated runtime base class, source normalizer, error types, and
   descriptor-driven value converter.
2. Expand DAML-LF type analysis and TypeScript name resolution to retain the
   metadata required by the converter and collision validator.
3. Replace template and registry emission with instance and choice-event
   classes, namespaced exports, and materialization methods.
4. Add focused unit, integration, collision, and generated-project type tests.
