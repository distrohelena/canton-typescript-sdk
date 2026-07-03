# Canton TypeScript SDK Design

## Goal

Build a new Canton TypeScript SDK that:

- supports both `grpc` and `json` transports
- exposes a developer-facing, typed API for both ledger and operational workflows
- supports external signing for submission flows
- feels structurally similar to a C# SDK while remaining idiomatic TypeScript in casing and module usage

## Scope

Version 1 should cover both of these usage categories:

- ledger application workflows such as command submission, exercising choices, querying contracts, and streaming events
- operational workflows such as party management, user management, package upload, and health/status checks

Version 1 should not attempt to hide every protocol difference. Shared workflows should use common service interfaces, but protocol-specific modules should remain available where Canton `grpc` and `json` differ materially.

## Design Principles

- Use a root client object with service properties rather than free-function exports.
- Keep public member names in `camelCase`, because this is TypeScript.
- Make the object model feel C#-like through instance-based services, option classes, DTOs, explicit interfaces, and enums for closed sets.
- Treat SDK-defined TypeScript models as the public source of truth.
- Keep wire protocol shapes internal to transport adapters.
- Fail explicitly when a feature is not supported by the selected transport.

## Public API Shape

The main entrypoint should be an instantiated `CantonClient`.

```ts
const client = new CantonClient(
  new CantonClientOptions({
    transportKind: TransportKind.grpc,
    endpoint: "https://participant.example.com",
    authProvider: new BearerTokenAuthProvider(token),
    commandSigner: new ExternalCommandSigner(signCallback),
  }),
);

await client.commands.submitAsync(request);
await client.contracts.queryAsync(request);
await client.events.streamTransactionsAsync(request, observer);

await client.parties.createAsync(request);
await client.users.grantRightsAsync(request);
await client.packages.uploadAsync(request);
await client.system.getHealthAsync();
```

### Root Types

- `CantonClient`
- `CantonClientOptions`
- `TransportKind`
- `IAuthProvider`
- `ICommandSigner`
- `ITransport`

### Service Properties

- `commands`
- `contracts`
- `events`
- `parties`
- `users`
- `packages`
- `system`

### Service Conventions

- Methods use `camelCase`.
- Async methods use `*Async` suffix to preserve the intended C# feel.
- Request and response objects use explicit DTO names such as `SubmitCommandRequest` and `QueryContractsResponse`.
- Enums are used when the value set is closed and transport-neutral enough to remain stable.

## Layered Architecture

The SDK should be organized into three major layers.

### Core

Shared domain contracts and infrastructure:

- public DTOs and enums
- validation
- error model
- authentication abstractions
- command signing abstractions
- shared service interfaces

### Client

High-level, user-facing services:

- `commands`
- `contracts`
- `events`
- `parties`
- `users`
- `packages`
- `system`

These services operate on SDK-defined models and delegate protocol details to transport adapters.

### Transports

Internal transport implementations:

- `grpc` adapter set
- `json` adapter set

These adapters map SDK models to protocol-specific requests and translate responses back into SDK models.

## Transport Strategy

The SDK should use a hybrid public model:

- shared high-level services for workflows that cleanly overlap across transports
- explicit transport-specific modules for capabilities that do not map cleanly

That means the package should provide:

- a general `CantonClient` for overlapping workflows
- optional transport-specific clients or modules for advanced features, while keeping the same instance-oriented style

Examples:

- `GrpcLedgerClient`
- `GrpcAdminClient`
- `JsonLedgerClient`

These transport-specific clients should only exist where they add real value and should not duplicate the entire shared surface without need.

## Data Flow

Shared operations should follow one internal pipeline:

`request object -> validation -> transport mapping -> auth application -> optional command signing -> transport call -> response mapping -> typed result`

This keeps the public API stable while isolating protocol differences.

### Submission Flow

Submission should be a dedicated path:

1. Accept SDK-owned request DTOs.
2. Validate the request.
3. Build a canonical SDK-defined submission payload.
4. Call the configured `ICommandSigner` when signing is enabled and supported.
5. Pass the signed result into the selected transport adapter.
6. Submit and map the result back into SDK response types.

The signer should work against stable SDK contracts, not raw `grpc` or `json` wire shapes.

## External Signing Design

The signing abstraction should be explicit and instance-based.

```ts
export interface ICommandSigner {
  signAsync(request: SignCommandRequest): Promise<SignCommandResult>;
}
```

`SignCommandRequest` should contain:

- canonical bytes or digest to sign
- submission metadata
- algorithm and signing context metadata when relevant

`SignCommandResult` should contain:

- signature bytes or encoded signature value
- algorithm metadata
- key metadata if required by the selected backend

### Transport Support Rule

External signing should be treated as `grpc`-only in version 1.

Rationale:

- The Daml JSON API is documented as a simpler proxy over the Ledger API and explicitly excludes more complex submission workflows in favor of the Ledger API.
- JSON API documentation describes authenticated command submission in terms of bearer tokens and `actAs`/`readAs` rights.
- No verified JSON API flow was found for external signing or external-account-style submission.

Design consequence:

- `commandSigner` is supported only with `TransportKind.grpc`.
- If a caller configures `commandSigner` with `TransportKind.json`, client construction or first use should fail with a clear `NotSupportedError`.

## Authentication Design

Authentication should remain transport-agnostic at the shared API layer and be applied by transport adapters.

Recommended abstractions:

- `IAuthProvider`
- `BearerTokenAuthProvider`
- transport-owned auth applicators

External signing is not a replacement for auth in version 1. It augments submission flows only.

Operational and admin workflows should use normal auth providers without any signing step.

## Error Model

The SDK should expose a small exception hierarchy rooted at `CantonError`.

Expected subclasses:

- `ValidationError`
- `AuthenticationError`
- `AuthorizationError`
- `TransportError`
- `SigningError`
- `TimeoutError`
- `ConflictError`
- `NotSupportedError`

Shared services should normalize common failures into this hierarchy so consumers do not need transport-specific error handling for typical cases.

Transport-specific modules may expose richer protocol details where needed, but the shared API should remain stable and predictable.

## Enums And Type Style

Enums should be used selectively, not pervasively.

Good enum candidates:

- `TransportKind`
- `SubmissionMode`
- `EventStreamKind`
- `UserRightKind`
- `PackageFormat`

Enums should use TypeScript-friendly member casing while preserving the closed-set semantics expected from a C#-style SDK.

## Testing Strategy

Testing should mirror the architecture.

### Unit Tests

Cover:

- DTO validation
- domain-to-transport mapping
- transport-to-domain mapping
- signer integration
- auth application
- error mapping

### Contract Tests

Verify that both transport adapters satisfy the same shared service contracts for overlapping workflows.

### Integration Tests

Run transport-specific integration suites against Canton-compatible endpoints for:

- `grpc` ledger workflows
- `grpc` admin workflows
- `json` ledger/admin workflows where supported
- external signing submission paths on `grpc`

## Packaging Direction

The SDK should be packaged as a library-first project with:

- a main package entrypoint for the shared client
- transport-specific subpath exports where needed
- no static/global configuration

The module layout should reinforce the object model rather than present the SDK as a bag of utility functions.

## Initial File Structure

An initial implementation should likely separate files by responsibility, for example:

- `src/client/cantonClient.ts`
- `src/client/cantonClientOptions.ts`
- `src/core/auth/iAuthProvider.ts`
- `src/core/signing/iCommandSigner.ts`
- `src/core/errors/*`
- `src/core/types/*`
- `src/services/commands/*`
- `src/services/contracts/*`
- `src/services/events/*`
- `src/services/parties/*`
- `src/services/users/*`
- `src/services/packages/*`
- `src/services/system/*`
- `src/transports/grpc/*`
- `src/transports/json/*`

This is a decomposition target, not a frozen file list. Exact files should be refined in the implementation plan.

## Open Constraints

- The current workspace is effectively greenfield and does not contain an existing SDK implementation to extend.
- The current workspace also does not expose a usable Git repository, so the normal spec-commit step cannot be completed here without repository setup.
- Review-subagent tooling exists in principle, but delegation was not explicitly requested by the user, so the spec review loop is not being delegated in this session.

## Recommendation

Proceed with a shared domain API plus transport adapters, with explicit `grpc`-only external signing support in version 1, and keep the public SDK instance-based and C#-influenced while preserving TypeScript `camelCase`.
