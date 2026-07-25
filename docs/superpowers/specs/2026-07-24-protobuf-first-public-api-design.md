# Protobuf-First Public API Design

## Goal

Make generated Ledger API v2 and Canton protobuf-ts messages the SDK's public protocol contract. Eliminate SDK-owned request/response DTOs and mapper layers that merely mirror, rename, or truncate those messages.

This is intentionally breaking. There are no compatibility aliases, overloads, conversion helpers, or legacy exports.

## Public API Rule

For every direct gRPC RPC, the public method signature accepts the generated protobuf-ts request type and returns the generated protobuf-ts response type (or streams generated response messages). Forwarding means returning the same generated message POJO reference from the channel, not constructing an SDK projection. Callers construct and codec-convert messages using the corresponding generated `MessageType` (`create`, `toJson`, and `fromJson`).

Generated bindings are exposed through one explicit non-colliding namespace: `@canton-network/ts-sdk/protobuf`. A generated barrel exports namespaces that mirror the source roots, such as `ledgerApiV2`, `cantonAdmin`, and `participantAdmin`; the package `exports` map exposes that subpath. It must not flatten generated types into the package root.

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

The JSON transport is an adapter, not a separate domain model. It accepts the same generated request data and reconstructs the same generated response data at the HTTP boundary. This does not mean protobuf JSON encoding: each supported RPC gets an explicit adapter contract recording its HTTP endpoint, request projection, response reconstruction, and handling for oneofs, bytes, int64s, enums, and Daml values/records. The inventory identifies unsupported RPCs; they retain explicit unsupported capability errors rather than gaining DTO substitutes.

SDK-owned types remain only for infrastructure and deliberate value-add:

- client construction, authentication, and transport selection;
- request options and error types;
- lifecycle/disposal and streaming helpers;
- explicit high-level utilities that are not direct RPC mirrors.

Every existing public method is classified in the inventory as one of:

- **direct RPC** — migrated to generated request/response or generated stream element types;
- **high-level utility** — retained with an SDK-specific contract because it composes RPCs (for example interactive command signing/preparation); or
- **removed** — deleted when neither category is justified.

Direct streaming RPCs become `AsyncIterable<GeneratedResponse>`; existing observer-only wrappers are removed. Command submission, preparation, signature coordination, and similar composed workflows are high-level utilities until separately redesigned, and their inputs/outputs must embed generated command messages rather than mirrored command DTOs.

## Migration Scope

First create and maintain a complete RPC inventory. For each public method and `GrpcOperations` member it records: service/RPC, generated request type, generated unary or streaming response type, public disposition, gRPC operation type, JSON endpoint/adapter status, and test coverage. The inventory is the deletion checklist for direct-RPC SDK classes/mappers and makes all intentional unsupported/high-level cases explicit.

Remove the direct-RPC request/response classes in `src/core/types/requests` and `src/core/types/responses`, their root exports, and mapper functions that exist solely to translate them. Replace service/transport signatures, tests, documentation, and callers with generated message types.

Migrate in coherent vertical slices, each compiling before the next:

1. Generated-public-export barrel and complete RPC inventory.
2. Update service: get-by-ID/offset/hash, pages, and streams.
3. Command and completion services, classifying interactive signing as high-level.
4. Event, transaction, and contract read services.
5. Party, user, package, identity, and participant services.
6. Topology, synchronizer, repair, and remaining administrative services.
7. JSON adapter inventory completion, documentation, and removal audit.

Generated protobuf source remains generated and unedited. The SDK may re-export it, but does not duplicate its message definitions.

## Error Handling

Transport and protocol errors remain SDK error classes so callers retain consistent error behavior. Message-level validation follows protobuf semantics; SDK constructors no longer revalidate mirrored fields.

## Testing

Each slice first adds a public-surface test importing its generated request/response types from `@canton-network/ts-sdk/protobuf` and exercising the service method with those messages. gRPC tests assert the exact generated response reference/oneof is forwarded without lossy mapping. JSON tests assert the documented per-RPC projection and reconstruction into the same generated shape. A final compiler-guided audit proves the removed DTOs and mapper shims have no remaining imports.
