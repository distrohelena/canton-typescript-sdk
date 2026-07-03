# gRPC Ledger API Alignment Design

## Goal

Redesign the public TypeScript SDK so its naming, service boundaries, and capability model are derived from the gRPC Ledger API instead of invented SDK abstractions.

This is a breaking cleanup. The SDK should stop creating shared names that blur protocol semantics. The canonical source of truth for public API shape is the gRPC Ledger API service and method structure. JSON support should adapt to that shape only where the semantics are defensible.

## Decisions

### 1. gRPC Ledger API Is The Naming Foundation

The SDK must not invent function names or service groupings when a gRPC Ledger API service or method already provides the correct conceptual boundary.

Rules:

- public service names come from gRPC service names
- public method names come from gRPC method names
- request and response types should also trend toward gRPC-derived naming
- shared abstractions are allowed only when JSON and gRPC are semantically close enough to justify one surface

Examples of what this invalidates:

- `getHealthAsync` for a `VersionService.GetLedgerApiVersion`-based call
- domain buckets like `system`, `parties`, `users`, `packages`, `contracts`, `events`, and `commands` when the real boundary is a specific gRPC service

### 2. Public Client Shape Mirrors gRPC Service Boundaries

The shared root SDK client should expose service clients named after the Ledger API services, not after custom SDK groupings.

Target shape includes services such as:

- `versionService`
- `stateService`
- `updateService`
- `commandService`
- `commandSubmissionService`
- `commandCompletionService`
- `eventQueryService`
- `contractService`
- `packageService`
- `partyManagementService`
- `userManagementService`
- `packageManagementService`

The design should reserve these names now even if some are not fully implemented yet.

Existing groupings should be removed:

- `system`
- `parties`
- `users`
- `packages`
- `contracts`
- `events`
- `commands`

### 3. Method Naming Must Follow gRPC Methods

Method names should be selected by mapping to the canonical gRPC Ledger API operation.

Examples:

- version-related behavior should align to `VersionService.GetLedgerApiVersion`
- party allocation should align to `PartyManagementService.AllocateParty`
- party listing should align to `PartyManagementService.ListKnownParties`
- rights management should align to `UserManagementService.GrantUserRights`
- package upload should align to `PackageManagementService.UploadDarFile`

Current names like `createAsync`, `listAsync`, `grantRightsAsync`, `uploadAsync`, `queryAsync`, `submitAsync`, and `getHealthAsync` are too abstract and should be replaced by method names tied to the gRPC contract they represent.

### 4. JSON Placement Is Decided Per Function In gRPC Terms

JSON does not define the public API shape. Instead, each JSON-backed capability should be evaluated by asking:

> If this were exposed first in gRPC Ledger API terms, which service and method would it belong to?

Outcomes:

- if JSON can honestly back that gRPC-shaped method, include it there
- if JSON cannot support it meaningfully, reject it with `NotSupportedError`
- if JSON has an adjacent but semantically different capability, do not silently map it unless the mapping is defensible in gRPC terms

This rule keeps JSON as an adapter to the gRPC-shaped SDK rather than the driver of the SDK shape.

### 5. Clean Breaking Cleanup, No Compatibility Layer

This redesign should be a hard break.

Rules:

- remove invented aliases
- remove old service groupings
- remove old method names
- rewrite docs, tests, exports, and examples to teach only the new surface

There should be no deprecated compatibility shim layer.

### 6. Unimplemented Future Services Still Shape The API

The SDK should be organized around the complete service map from the gRPC protobufs, not just the services already implemented.

For services or methods that are present in the API shape but not implemented yet:

- keep the public name reserved
- expose the service boundary
- throw `NotSupportedError` or `TransportError` with precise messages until implemented

This ensures the public API grows by filling in an already-correct structure instead of being repeatedly redesigned.

## Proposed Public Surface Direction

The public root client should evolve toward a shape like:

```ts
const client = new CantonClient(options);

client.versionService;
client.stateService;
client.updateService;
client.commandService;
client.commandSubmissionService;
client.commandCompletionService;
client.eventQueryService;
client.contractService;
client.packageService;
client.partyManagementService;
client.userManagementService;
client.packageManagementService;
```

The exact method names under those services should follow the corresponding protobuf service methods.

## Current Surface Problems

The current SDK has several design problems this change is intended to fix:

- names reflect SDK interpretation instead of protocol foundations
- one shared function name can conceal different protocol semantics
- domain buckets blur actual gRPC service boundaries
- version calls are currently misframed as “health”
- JSON-specific behavior has influenced shared naming too heavily

## Compatibility Model

Compatibility should be strict and explicit:

- gRPC is the canonical semantic model
- JSON support is added only where it cleanly fits that model
- unsupported transport/method combinations should fail loudly

Examples:

- a JSON-backed method that genuinely fits a gRPC-shaped service is allowed
- a JSON capability that does not fit a gRPC-shaped method should not redefine the SDK
- a gRPC-only method should remain visible in the public shape and reject on JSON

## Documentation Requirements

All public documentation should be rewritten around the gRPC-derived service map.

Affected artifacts:

- `README.md`
- `DOCUMENTATION.md`
- examples
- tests that document expected usage
- root exports and protocol-specific entrypoints

Documentation rules:

- teach only the new service names
- teach only the new method names
- document JSON support as an adapter to the gRPC-shaped API
- include a transport support matrix per method where behavior differs

## Verification Requirements

Verification should focus on public API correctness, not just implementation behavior.

Required coverage:

- export-surface tests for new public names
- absence checks for removed names
- service client tests using only gRPC-aligned naming
- transport contract tests that verify JSON vs gRPC support decisions
- documentation review against the public export surface

## Implementation Order

Recommended execution order:

1. Define the target public service and method map from the gRPC protobuf service set.
2. Rename public service clients, methods, request types, response types, and exports to match that map.
3. Add placeholder service boundaries for future protobuf-backed services that are not implemented yet.
4. Rewire existing gRPC and JSON implementations into the new surface method by method.
5. Rewrite tests, examples, and documentation to only use the new API.
6. Remove the old names entirely.

## Out Of Scope

This design does not yet decide the final full method inventory for every protobuf service. That inventory should be established in the implementation plan from the generated gRPC service set.

This design also does not introduce true health/status APIs yet. If those are added later, they should be modeled from the real health/status foundations such as `grpc.health.v1.Health.Check` or Canton admin status services, not inferred from version endpoints.
