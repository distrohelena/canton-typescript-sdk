# List Parties Design

## Goal

Add a transport-neutral `listParties` capability to the SDK that works over both gRPC and JSON while preserving the instance-oriented, C#-style SDK boundary.

## Scope

This design covers the first party-listing endpoint in the shared SDK surface:

- public request and response DTOs
- `PartiesClient.listAsync(...)`
- gRPC mapping to Ledger API `ListKnownParties`
- JSON mapping to JSON Ledger API `GET /v2/parties`
- placeholder and test coverage updates needed to support the new operation

This design does not cover:

- party-details update APIs
- external party allocation
- topology-admin `ListParties`
- auto-pagination helpers

## Naming And Boundary

The SDK should use SDK-owned public types:

- `ListPartiesRequest`
- `ListPartiesResponse`
- `PartyDetails`

This is intentional even though the ledger protobuf and JSON schema use `ListKnownPartiesRequest` and `ListKnownPartiesResponse`.

The repo already contains a generated `ListPartiesResponse`, but that type belongs to Canton topology admin and is not the ledger party-listing API we want to expose here. Reusing it would couple the SDK to the wrong protocol surface.

Recommendation:

- use SDK-owned DTOs at the public boundary
- keep generated protobuf DTOs internal to gRPC transport code
- keep JSON wire shapes internal to JSON transport code

## Public API

`PartiesClient` should expose:

```ts
await client.parties.listAsync(
    new ListPartiesRequest({
        identityProviderId: "default",
        filterParty: "Alice",
        pageSize: 100,
        pageToken: "",
    }),
);
```

### Request DTO

`ListPartiesRequest` should expose the shared filter set supported by both transports:

- `identityProviderId?: string`
- `filterParty?: string`
- `pageSize?: number`
- `pageToken?: string`

This matches the overlap between:

- gRPC `ListKnownPartiesRequest`
- JSON `GET /v2/parties` query parameters

The SDK should not rename `filterParty` to something more opinionated such as `partyIdStartsWith`, because the official API wording already uses `filter-party` on JSON and `filter_party` on protobuf. Keeping the same semantic name reduces surprise.

### Response DTO

`ListPartiesResponse` should expose:

- `partyDetails: PartyDetails[]`
- `nextPageToken?: string`

`PartyDetails` should be an SDK-owned type capturing the shared fields returned by both transports:

- `party: string`
- `isLocal: boolean`
- `localMetadata?: Record<string, string>`
- `identityProviderId?: string`

The field names should remain close to the upstream payloads, because these values are already stable domain concepts rather than transport artifacts.

## Transport Mapping

### gRPC

The gRPC transport should call:

- service: `com.daml.ledger.api.v2.admin.PartyManagementService`
- method: `ListKnownParties`

Mapping rules:

- SDK `identityProviderId` -> protobuf `identityProviderId`
- SDK `filterParty` -> protobuf `filterParty`
- SDK `pageSize` -> protobuf `pageSize`
- SDK `pageToken` -> protobuf `pageToken`

The response mapper should convert generated `ListKnownPartiesResponse` into SDK `ListPartiesResponse`.

### JSON

The JSON transport should call:

- `GET /v2/parties`

Query mapping rules:

- SDK `identityProviderId` -> `identity-provider-id`
- SDK `filterParty` -> `filter-party`
- SDK `pageSize` -> `pageSize`
- SDK `pageToken` -> `pageToken`

The response mapper should convert the JSON `ListKnownPartiesResponse` payload into SDK `ListPartiesResponse`.

## Architecture Changes

The change should extend the existing shared surface instead of creating a separate party-listing module.

Required updates:

- add SDK DTO files under `src/core/types`
- extend `ITransport` with `listPartiesAsync`
- extend `PartiesClient`
- extend the placeholder transport in `src/client/service-registry.ts`
- extend JSON transport and JSON mapper
- extend gRPC transport and gRPC mapper
- extend the gRPC operations boundary in `grpc-channel-factory.ts`

This keeps `listParties` aligned with the current service-oriented SDK structure.

## Error Handling

Error handling should follow the existing transport strategy:

- transport-specific failures stay inside transport adapters
- shared services continue to surface normalized SDK errors

No special fallback behavior is needed for `listParties`. If a transport call fails, the SDK should surface the mapped error rather than silently retrying or auto-paging.

## Testing Strategy

Add focused unit coverage for the new operation:

- request-to-gRPC mapping
- gRPC response-to-SDK mapping
- request-to-JSON query mapping
- JSON response-to-SDK mapping
- `PartiesClient.listAsync(...)` delegation to transport
- placeholder transport failure message

There is no need for transport contract tests beyond this yet, because the SDK still has only a small number of shared cross-transport operations.

## References

- Ledger protobuf: `proto/canton/community/ledger-api-proto/src/main/protobuf/com/daml/ledger/api/v2/admin/party_management_service.proto`
- Generated gRPC types: `src/transports/grpc/generated/canton/com/daml/ledger/api/v2/admin/party_management_service.ts`
- JSON OpenAPI: `https://docs.digitalasset.com/build/3.4/reference/json-api/openapi.html`
