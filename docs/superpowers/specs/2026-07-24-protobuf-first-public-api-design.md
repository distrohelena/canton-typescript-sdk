# Protobuf-First Public API Design

## Goal

Make generated Ledger API v2 and Canton protobuf-es messages the SDK's public protocol contract. Eliminate SDK-owned request/response DTOs and mapper layers that merely mirror, rename, or truncate those messages.

This is intentionally breaking. There are no compatibility aliases, overloads, conversion helpers, or legacy exports.

## Public API Rule

For every gRPC-backed operation, the public method signature accepts the generated protobuf request type and returns the generated protobuf response type (or streams generated response messages). The message modules are exported from the package root under stable SDK-owned export paths.

For example:

```ts
const response: GetUpdateResponse = await client.updateService.getUpdateByIdAsync(
    request,
);

switch (response.update.oneofKind) {
    case "transaction":
        // full generated Transaction
        break;
}
```

`GetUpdateByIdAsync`, offset/hash retrieval, update pages, and update streams return their generated outer responses. They no longer discard the response oneof or return an `unknown` inner payload.

## Transport Model

`GrpcTransport` sends and returns generated messages without an SDK intermediate model. Channel operations are typed to those messages rather than `unknown`.

The JSON transport is an adapter, not a separate domain model. It accepts the same protobuf-shaped public request data and serializes/deserializes it at the HTTP boundary. Where the JSON Ledger API cannot implement a gRPC operation, it reports the existing explicit unsupported capability; it must not invent a DTO substitute.

SDK-owned types remain only for infrastructure and deliberate value-add:

- client construction, authentication, and transport selection;
- request options and error types;
- lifecycle/disposal and streaming helpers;
- explicit high-level utilities that are not direct RPC mirrors.

## Migration Scope

Remove the direct-RPC request/response classes in `src/core/types/requests` and `src/core/types/responses`, their root exports, and mapper functions that exist solely to translate them. Replace service/transport signatures, tests, documentation, and callers with generated message types.

Migrate in coherent vertical slices, each compiling before the next:

1. Update service: get-by-ID/offset/hash, pages, and streams.
2. Command and completion services.
3. Event, transaction, and contract read services.
4. Party, user, package, identity, and participant services.
5. Topology, synchronizer, repair, and remaining administrative services.
6. JSON adapters, package-root exports, documentation, and removal audit.

Generated protobuf source remains generated and unedited. The SDK may re-export it, but does not duplicate its message definitions.

## Error Handling

Transport and protocol errors remain SDK error classes so callers retain consistent error behavior. Message-level validation follows protobuf semantics; SDK constructors no longer revalidate mirrored fields.

## Testing

Each slice first adds a public-surface test importing its generated request/response types from the package root and exercising the service method with those messages. gRPC tests assert the exact generated response identity/oneof is forwarded without lossy mapping. JSON tests assert serialization against the same generated shape. A final compiler-guided audit proves the removed DTOs and mapper shims have no remaining imports.
