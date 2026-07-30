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
objects with a string label and a value object. Empty `fields` is valid.

Arbitrary JSON payloads, including objects that merely happen to have a
`fields` property, remain JSON unless they satisfy this shape.

## Normalization

Recognized payloads are cloned and frozen as a DAML protobuf `Value` whose
oneof is `record`. Each JSON ts-proto `Value` wire object is retained as its
value; it is already the shape accepted by the existing value conversion path.
Existing generated gRPC records continue to use the protobuf-record path, and
ordinary PQS/JSON payloads continue to use the JSON path.

## Validation

Unit tests cover camel-case and snake-case created payload properties, text
values in record fields, immutability, and rejection/fallback of incomplete
lookalikes. Existing JSON and generated protobuf tests remain unchanged.
