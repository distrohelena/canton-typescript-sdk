# Package Read Public SDK Design

## Goal

Expose typed public SDK APIs for package reads so explorer and package tooling can use the Canton TypeScript SDK directly instead of reaching into generated gRPC clients.

This change should:

- add ledger package read APIs to the public SDK
- add participant-admin package read APIs to the public SDK
- remove the current mixed `packageManagementService` name from the public surface
- preserve the rule that public SDK APIs use SDK DTOs, not generated protobuf classes

## Decision Summary

- split package APIs into two public services that mirror the real gRPC boundaries
- add a new public `packageService` for ledger package reads
- rename the current public `packageManagementService` to `participantPackageService`
- keep upload and participant-admin package reads on `participantPackageService`
- include `listVettedPackagesAsync` on the ledger-facing service now
- expose a consistent public SDK surface across transports
- implement gRPC support for all selected methods
- let JSON throw `NotSupportedError` for shared public methods that are not actually supported there

## Public Service Boundaries

### `packageService`

This service represents ledger API package reads from `com.daml.ledger.api.v2.PackageService`.

Public methods:

- `listPackagesAsync`
- `getPackageAsync`
- `getPackageStatusAsync`
- `listVettedPackagesAsync`

Purpose:

- discover visible ledger packages
- fetch package archives
- inspect package execution status
- inspect vetted package topology state

### `participantPackageService`

This service represents participant-admin package operations.

Public methods:

- `uploadDarFileAsync`
- `listPackagesAsync`
- `getPackageContentsAsync`
- `getPackageReferencesAsync`

Purpose:

- upload DARs to a participant
- inspect participant-local package inventory
- inspect participant-local package contents
- inspect DAR/package references on a participant

### Removed Public Name

Remove:

- `packageManagementService`

Reason:

- it mixes ledger reads and admin operations conceptually
- it does not mirror the actual gRPC service split
- keeping it would preserve an already-wrong public boundary

## Public DTO Strategy

The public SDK must continue to avoid forwarding generated protobuf classes.

That means adding SDK DTOs for all selected request and response shapes.

### Ledger Package DTOs

Requests:

- `ListPackagesRequest`
- `GetPackageRequest`
- `GetPackageStatusRequest`
- `ListVettedPackagesRequest`
- `PackageMetadataFilter`
- `TopologyStateFilter`

Responses and value models:

- `ListPackagesResponse`
- `GetPackageResponse`
- `GetPackageStatusResponse`
- `ListVettedPackagesResponse`
- `PackageReference`
- `VettedPackage`
- `VettedPackages`
- `PackageStatus`
- `HashFunction`

Notes:

- `GetPackageResponse` should expose the package archive bytes, package hash, and hash function as SDK types
- `ListVettedPackagesResponse` should preserve page token behavior
- topology and metadata filter models should stay close to the gRPC request semantics while remaining SDK-owned

### Participant Package DTOs

Requests:

- `ParticipantListPackagesRequest`
- `GetPackageContentsRequest`
- `GetPackageReferencesRequest`

Responses and value models:

- `ParticipantListPackagesResponse`
- `ParticipantPackageDescription`
- `GetPackageContentsResponse`
- `ParticipantModuleDescription`
- `GetPackageReferencesResponse`
- `ParticipantDarDescription`

Notes:

- participant-admin `listPackages` has a different shape from ledger `listPackages`
- the SDK should keep those shapes distinct rather than collapsing them into one ambiguous DTO
- participant package descriptions should preserve package id, name, version, upload time, and size

## Naming Rules

Because there are two different `listPackages` operations with different semantics, the SDK should separate them by service boundary rather than by awkward method naming.

Result:

- `packageService.listPackagesAsync(...)`
- `participantPackageService.listPackagesAsync(...)`

This keeps the surface close to gRPC and avoids inventing overloaded names like `listLedgerPackagesAsync`.

## Transport Surface

The internal transport contract should expand to include the new package read methods.

### Ledger Package Transport Methods

Add transport methods for:

- `listPackagesAsync`
- `getPackageAsync`
- `getPackageStatusAsync`
- `listVettedPackagesAsync`

### Participant Package Transport Methods

Add transport methods for:

- `listParticipantPackagesAsync`
- `getParticipantPackageContentsAsync`
- `getParticipantPackageReferencesAsync`

The internal transport names can stay explicit where needed to avoid collisions between ledger and participant-admin package APIs.

## gRPC Behavior

gRPC should implement the full selected surface.

### Ledger Reads

Map SDK calls to:

- `com.daml.ledger.api.v2.PackageService.ListPackages`
- `com.daml.ledger.api.v2.PackageService.GetPackage`
- `com.daml.ledger.api.v2.PackageService.GetPackageStatus`
- `com.daml.ledger.api.v2.PackageService.ListVettedPackages`

### Participant-Admin Reads

Map SDK calls to:

- `com.digitalasset.canton.admin.participant.v30.PackageService.ListPackages`
- `com.digitalasset.canton.admin.participant.v30.PackageService.GetPackageContents`
- `com.digitalasset.canton.admin.participant.v30.PackageService.GetPackageReferences`

The gRPC mappers should convert generated request/response payloads into SDK-owned DTOs only.

## JSON Behavior

The public SDK surface should remain present even where JSON does not support the operation.

Behavior:

- methods that JSON genuinely supports should map normally
- methods without JSON support should throw `NotSupportedError`

Reason:

- explorer and package tooling can code against one stable SDK surface
- transport capability differences remain runtime concerns rather than type-surface fragmentation

This design does not assume JSON support exists for the new package reads unless confirmed during implementation.

## Service Registry And Client Surface

Add:

- `packageService` to `CantonClient`
- `participantPackageService` to `CantonClient`

Remove:

- `packageManagementService` from `CantonClient`

Also update the service registry, gRPC client wrappers, JSON client wrappers, root exports, and documentation so the new service names become canonical everywhere.

## Backward Compatibility

This is intentionally a breaking cleanup.

Breaking changes:

- `packageManagementService` is removed
- consumers must switch to:
  - `packageService`
  - `participantPackageService`

Why accept the break now:

- the SDK is still early
- the current name is structurally wrong
- preserving it would force adapters or aliases that dilute the desired gRPC-aligned design

## Error Handling

Behavior should follow current SDK conventions:

- transport capability mismatches throw `NotSupportedError`
- transport failures continue through the normal SDK error hierarchy
- disposal semantics introduced earlier continue to apply to both new services

No generated gRPC exceptions or protobuf classes should leak into the public API.

## Testing Strategy

Add focused tests for:

- root package exports for new DTOs and service clients
- `CantonClient` exposing `packageService` and `participantPackageService`
- removal of `packageManagementService` from the public SDK shape
- service-client forwarding for all newly added package methods
- gRPC mapper coverage for ledger package reads
- gRPC mapper coverage for participant-admin package reads
- JSON `NotSupportedError` behavior on unsupported package read methods
- package service contract tests across the shared SDK surface

Regression goals:

- explorer/tooling can use typed public SDK APIs for package reads
- no generated internal clients are required by SDK consumers
- package boundaries mirror the actual gRPC service split

## Non-Goals

- no participant-admin package mutation APIs beyond the existing upload surface
- no attempt to unify ledger and participant package DTOs into one model where semantics differ
- no preservation alias for `packageManagementService`
- no exposure of generated protobuf-ts request or response classes
