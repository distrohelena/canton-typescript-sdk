# Three API Surface Split Design

## Summary

The SDK currently models Canton connectivity as two surfaces:

- Ledger
- Admin

That is incorrect. The real public API families are:

- Ledger API: `com.daml.ledger.api.v2.*`
- Ledger Admin API: `com.daml.ledger.api.v2.admin.*`
- Canton Participant Admin API: `com.digitalasset.canton.admin.participant.v30.*`

The SDK must move to a strict three-surface model with no backward-compatibility aliases. This is a deliberate breaking cleanup while the package is still in design-stage evolution.

## Goals

- Represent the three real API families explicitly in client options, routing, docs, and tests.
- Keep the public SDK shape gRPC-service-oriented and top-level, without generic wrapper groupings.
- Ensure each public service belongs to exactly one surface.
- Support independent auth and gRPC channel security configuration per surface.
- Preserve lazy missing-endpoint failure behavior, but name the missing surface precisely.

## Non-Goals

- Do not add backward-compatibility aliases from the old `adminEndpoint` shape.
- Do not introduce grouped wrappers such as `ledgerAdmin.*` or `participantAdmin.*`.
- Do not redesign transport capability semantics beyond the new surface ownership split.
- Do not split request timeout or gRPC connect timeout per surface in this change.

## Public Client Options

`CantonClientOptions` becomes a strict three-surface model.

### Endpoints

- `ledgerEndpoint?: string`
- `ledgerAdminEndpoint?: string`
- `participantAdminEndpoint?: string`

### Auth

- `ledgerAuthProvider?: IAuthProvider`
- `ledgerAdminAuthProvider?: IAuthProvider`
- `participantAdminAuthProvider?: IAuthProvider`

The previous shared `authProvider` is removed.

### gRPC Channel Security

- `grpcChannelSecurity?: GrpcChannelSecurity`
- `ledgerGrpcChannelSecurity?: GrpcChannelSecurity`
- `ledgerAdminGrpcChannelSecurity?: GrpcChannelSecurity`
- `participantAdminGrpcChannelSecurity?: GrpcChannelSecurity`

Security resolution stays layered, but now per real surface:

- ledger services use
  `ledgerGrpcChannelSecurity ?? grpcChannelSecurity ?? GrpcChannelSecurity.tls`
- ledger admin services use
  `ledgerAdminGrpcChannelSecurity ?? grpcChannelSecurity ?? GrpcChannelSecurity.tls`
- participant admin services use
  `participantAdminGrpcChannelSecurity ?? grpcChannelSecurity ?? GrpcChannelSecurity.tls`

### Shared Options That Remain Shared

- `defaultRequestTimeoutMs?: number`
- `grpcConnectTimeoutMs?: number`
- `commandSigner?: ICommandSigner`

`defaultRequestTimeoutMs` and `grpcConnectTimeoutMs` remain shared in this change. If there is a real need later, they can be split separately.

## Public Service Ownership

The SDK keeps top-level service clients named after the real gRPC services rather than introducing umbrella wrappers.

### Ledger API

These services belong to `com.daml.ledger.api.v2.*` and route through `ledgerEndpoint`:

- `versionService`
- `healthService`
- `commandService`
- `commandSubmissionService`
- `commandCompletionService`
- `stateService`
- `updateService`
- `eventQueryService`
- `contractService`

### Ledger Admin API

These services belong to `com.daml.ledger.api.v2.admin.*` and route through `ledgerAdminEndpoint`:

- `partyManagementService`
- `userManagementService`
- `packageManagementService`

### Canton Participant Admin API

These services belong to `com.digitalasset.canton.admin.participant.v30.*` and route through `participantAdminEndpoint`:

- `participantPackageService`
- `participantStatusService`

## Breaking Public API Changes

The following removals and moves are intentional:

- remove `adminEndpoint`
- remove `adminGrpcChannelSecurity`
- remove shared `authProvider`
- add `ledgerAdminEndpoint`
- add `participantAdminEndpoint`
- add `ledgerAdminAuthProvider`
- add `participantAdminAuthProvider`
- add `ledgerAdminGrpcChannelSecurity`
- add `participantAdminGrpcChannelSecurity`
- add `packageManagementService`
- remove `participantPackageService.uploadDarFileAsync(...)`
- add `packageManagementService.uploadDarFileAsync(...)`

## Service and Method Placement

### Package Upload

`uploadDarFileAsync(...)` is currently exposed on `participantPackageService`, but the underlying RPC is Ledger Admin package management. That is the wrong public boundary.

The method moves to:

- `packageManagementService.uploadDarFileAsync(...)`

This is a breaking rename by service ownership, not just by endpoint routing.

### Participant Package Reads

The following remain on `participantPackageService` because they are part of the Canton Participant Admin API:

- `listPackagesAsync(...)`
- `getPackageContentsAsync(...)`
- `getPackageReferencesAsync(...)`

### Participant Status

The following remains on `participantStatusService`:

- `getParticipantStatusAsync(...)`

## Routing Model

The service registry must build up to three transports rather than two.

### Surface Routing

- `ledgerEndpoint` serves only Ledger API services
- `ledgerAdminEndpoint` serves only Ledger Admin API services
- `participantAdminEndpoint` serves only Participant Admin API services

No transport should be shared across two admin families merely because both are “admin”.

## Lazy Missing-Endpoint Failure

Construction remains permissive. A client can still be created with some surfaces missing. Failure happens only when the missing surface is used.

### Expected Behavior

- Ledger services fail only when `ledgerEndpoint` is missing and a Ledger service method is called.
- Ledger Admin services fail only when `ledgerAdminEndpoint` is missing and a Ledger Admin service method is called.
- Participant Admin services fail only when `participantAdminEndpoint` is missing and a Participant Admin service method is called.

### Error Messages

Errors should name the missing surface precisely. Examples:

- `The ledger endpoint is not configured for versionService.`
- `The ledger admin endpoint is not configured for packageManagementService.`
- `The participant admin endpoint is not configured for participantStatusService.`

## Auth Resolution

Each surface uses its own auth provider:

- Ledger services use `ledgerAuthProvider`
- Ledger Admin services use `ledgerAdminAuthProvider`
- Participant Admin services use `participantAdminAuthProvider`

There is no shared auth provider fallback in this redesign. The split is strict and explicit.

## Protocol Support

Endpoint ownership and protocol capability remain separate concerns.

Examples:

- `healthService.checkAsync(...)` remains gRPC-only
- `participantStatusService.getParticipantStatusAsync(...)` remains gRPC-only
- `packageManagementService.uploadDarFileAsync(...)` keeps whatever JSON/gRPC support is already valid for the underlying SDK contract

This change must not blur protocol support just because a service moved surfaces.

## Documentation Changes

All docs must stop using generic `Admin` wording where the real family matters.

### Required Documentation Cleanup

- Replace generic “Admin endpoint” wording with either `Ledger Admin` or `Participant Admin`
- Update client construction examples to use the three endpoint names
- Update auth and security examples to show per-surface settings
- Add `packageManagementService` to the public surface documentation
- Move upload DAR docs from `participantPackageService` to `packageManagementService`
- Update transport support tables to classify functions as `Ledger`, `Ledger Admin`, or `Participant Admin`

## Testing Changes

Tests must be rewritten around the three real surfaces rather than patched minimally.

### Construction Tests

- assert `packageManagementService` exists
- assert `participantPackageService` no longer exposes upload DAR
- assert the three endpoint option names are required by the new surface model

### Service Registry Tests

- verify independent routing for Ledger, Ledger Admin, and Participant Admin
- verify lazy missing-endpoint failure for each surface separately
- verify error messages mention the correct missing surface name

### Transport Factory Tests

- verify three-way auth provider selection
- verify three-way gRPC security resolution
- verify generated gRPC dependencies are selected by the correct service family

### Contract Tests

- move DAR upload coverage to `packageManagementService`
- keep participant package coverage limited to participant package methods
- keep participant status coverage limited to participant admin status methods

### Documentation and Surface Tests

- update smoke/package-shape tests for `packageManagementService`
- update transport support matrix expectations
- remove any assertions that still imply a single generic admin surface

## Implementation Notes

This change is intentionally breaking and should prefer cleanup over compatibility shims.

The implementation should follow these principles:

- no aliases from `adminEndpoint`
- no deprecated wrapper properties
- no temporary dual-service exposure for DAR upload
- no umbrella admin service clients

The SDK should emerge with boundaries that match the real protobuf families directly.

## Recommended Execution Order

1. Redesign `CantonClientOptions` for three surfaces
2. Redesign service registry transport creation and missing-endpoint routing
3. Introduce `packageManagementService`
4. Move DAR upload from `participantPackageService` to `packageManagementService`
5. Update docs, contract tests, and smoke tests
6. Run full verification and commit
