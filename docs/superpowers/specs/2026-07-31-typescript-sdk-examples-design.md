# TypeScript SDK Examples Design

## Goal

Create a repository-local `examples/` suite that gives developers executable,
TypeScript-first introductions to the Canton TypeScript SDK. The suite assumes
that a CN Quickstart localnet is already running; it never starts, stops, or
cleans up that localnet.

The primary focus is party creation. One example will cover each distinct
party lifecycle currently exposed by the SDK:

1. Participant-hosted party.
2. Externally controlled party.
3. Decentralized party.

The suite will also provide small, independently runnable examples for basic
SDK initialization, TLS, and JWT authentication.

## Non-goals

- Publish examples in the npm package. The package currently publishes `dist`,
  `node`, `README.md`, and `LICENSE`; examples remain repository documentation
  and validation artifacts.
- Provision localnet services or modify a running node.
- Teach production key custody. Ephemeral keys make the party examples
  runnable; comments identify the signer callback as the HSM/KMS replacement
  point.
- Add a separate secp256k1 example. secp256k1 is an alternative external or
  decentralized key/signature configuration, not a distinct party lifecycle.
  ED25519 is the example suite's portable end-to-end localnet choice.

## Layout

```text
examples/
  README.md
  01-client-initialization.ts
  02-tls-connection.ts
  03-jwt-authentication.ts
  10-hosted-party.ts
  20-external-party-ed25519.ts
  30-decentralized-party-ed25519.ts
  shared/
    localnet.ts
    party-keys.ts
    run.ts
tsconfig.examples.json
```

Each numbered top-level file is an independently executable program, rather
than a test fixture or a snippet requiring a wrapper. `shared/` only removes
repetition: it does not hide the SDK calls that the example is meant to teach.

## Execution and TypeScript integration

Examples use `.ts` files and the existing `ts-node` development dependency in
ESM mode. `package.json` receives an `examples:check` type-check command and
one `example:*` command per top-level example. The README will instruct users
to run `npm run build` once before executing examples.

Every example imports `@distrohelena/canton-typescript-sdk`, the package's own
public self-reference, rather than `src` or generated transport internals.
This both demonstrates consumer usage and ensures the examples exercise the
built public API. `tsconfig.examples.json` extends the repository's compiler
settings, uses `noEmit`, and includes only `examples/**/*.ts`; it keeps example
code out of the SDK's publishable `dist` build while type-checking it.

## Localnet configuration

`shared/localnet.ts` constructs `CantonClientOptions` from documented
environment variables, applies safe local defaults, and reports missing or
incompatible configuration before making a party-allocation request.

- Default examples use gRPC endpoints `localhost:3901` (Ledger and
  Ledger-admin) and `localhost:3902` (Participant-admin), with explicit
  insecure channel security because the ordinary Quickstart localnet is
  non-TLS.
- Endpoint overrides use `SDK_EXAMPLE_LEDGER_ENDPOINT`,
  `SDK_EXAMPLE_LEDGER_ADMIN_ENDPOINT`, and
  `SDK_EXAMPLE_PARTICIPANT_ADMIN_ENDPOINT`.
- TLS requires `SDK_EXAMPLE_TLS_ROOT_CERTIFICATE`; it defaults to
  `.generated/localnet-tls/ca.crt` when that file exists and configures all
  gRPC surfaces for TLS. The TLS example explains the matching
  `LOCALNET_TLS=1` launcher configuration.
- JWT uses `SDK_EXAMPLE_BEARER_TOKEN` as a shared fallback and accepts
  `SDK_EXAMPLE_LEDGER_BEARER_TOKEN`,
  `SDK_EXAMPLE_LEDGER_ADMIN_BEARER_TOKEN`, and
  `SDK_EXAMPLE_PARTICIPANT_ADMIN_BEARER_TOKEN` for per-surface credentials.
  The JWT example documents the token emitted by an ES256-enabled localnet.
- The party examples discover a single healthy synchronizer using the SDK's
  public synchronizer-connectivity service and generated public protobuf
  barrel. `SDK_EXAMPLE_SYNCHRONIZER` can override discovery for multi-domain
  nodes.

All examples use a unique party hint generated from the current timestamp and
random bytes, prefixed by `SDK_EXAMPLE_PARTY_PREFIX` when supplied. This avoids
collisions while making the stateful allocation visible in the localnet.

## Individual examples

### `01-client-initialization.ts`

Construct a minimal insecure gRPC `CantonClient`, call the public Ledger API
version service, print the negotiated version, and dispose the client. This is
the baseline for the remaining examples.

### `02-tls-connection.ts`

Read the localnet CA, create a TLS-only gRPC client, perform the same harmless
version request, and dispose it. It explicitly errors when the CA file is
missing, explaining that TLS must be enabled on the already-running localnet.

### `03-jwt-authentication.ts`

Create a gRPC client with `BearerTokenAuthProvider` credentials, make the
version request, and dispose it. It requires a token environment variable and
does not log that secret.

### `10-hosted-party.ts`

Allocate a normal participant-hosted party with `AllocatePartyRequest`, print
the party ID and display name, and dispose the client. This is the only party
lifecycle that also supports the JSON transport, but it deliberately uses the
common gRPC localnet configuration so it is directly comparable to later
examples.

### `20-external-party-ed25519.ts`

Generate an ephemeral ED25519 key pair with `node:crypto`; translate its
public key into `ExternalPartySigningPublicKey`; then call
`createExternalPartyAsync` with a signer callback. The callback signs exactly
the opaque SDK-provided payload and returns `concat`/`ed25519` metadata. The
example prints the allocated external party ID and public-key fingerprint.
Private key bytes never leave process memory and are discarded on exit.

### `30-decentralized-party-ed25519.ts`

Generate two distinct ephemeral ED25519 owner keys and one distinct party
signing key. Build `CreateDecentralizedPartyRequest` with explicit `2-of-2`
owner and `1-of-1` party-signing thresholds, then call
`createDecentralizedPartyAsync`. Per-key signer callbacks demonstrate which
topology payload each owner and party key authorizes. The script prints the
allocated party ID; it does not attempt to submit a Daml command as that is a
separate command-signing concern.

## Error handling and cleanup

`shared/run.ts` wraps every program's `main` function. It emits a short,
actionable error, preserves the original cause for developers, assigns a
non-zero exit status, and ensures `CantonClient.disposeAsync()` runs after a
client has been created. Helpers never print bearer tokens, certificate
contents, or private keys.

Each party example visibly warns that topology allocation is durable and is
not cleaned up. Users can choose a stable prefix to make example-created
parties easy to identify in their localnet.

## Verification

Automated verification will include:

1. `npm run build` to produce the self-referenced package and declarations.
2. `npm run examples:check` to type-check every example under strict TypeScript
   settings.
3. `npm run lint` to enforce repository style.
4. With a configured running localnet, each `npm run example:*` command. TLS
   and JWT commands are run only against their respective enabled localnet
   modes; party scripts are run against a gRPC-enabled localnet that supports
   their required APIs.

The README will distinguish these conditional integration runs from the
repository-only checks.
