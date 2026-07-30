# Created Event Record-Wire Normalization Design

## Goal

Allow `DamlEventSourceNormalizer.normalizeCreated()` to consume JSON-transported
ts-proto `Record` wire objects without requiring a binary protobuf message.

## Recognition

Only a created payload that has the explicit record-wire shape is recognized:

```ts
{ fields: [{ label: "owner", value: { text: "Alice" } }] }
```

The payload may be supplied through `createArguments`, `create_arguments`, or
`payload`. Recognition requires a `fields` array whose entries are record-field
objects with a string label and a valid, single-variant ts-proto `Value` JSON
object. Empty `fields` is valid. Empty, non-object, or multi-variant values do
not match.

Arbitrary JSON payloads, including objects that merely happen to have a
`fields` property, remain JSON unless they satisfy this shape.

## Normalization

Recognized payloads are parsed with protobuf-ts JSON conversion (equivalent to
`Value.fromJson({ record: payload })`) and then cloned/frozen as a DAML
protobuf `Value` whose oneof is `record`. This also converts nested JSON value
variants such as `{ text: "Alice" }` into the protobuf-ts `sum.oneofKind`
representation consumed by the existing materializer.
Existing generated gRPC records continue to use the protobuf-record path, and
ordinary PQS/JSON payloads continue to use the JSON path.

## Validation

Unit tests cover camel-case, snake-case, and `payload` created properties; text
values in record fields; canonical nested value conversion; successful
materialization; immutability; and rejection/fallback of incomplete lookalikes.
Existing JSON and generated protobuf tests remain unchanged.
