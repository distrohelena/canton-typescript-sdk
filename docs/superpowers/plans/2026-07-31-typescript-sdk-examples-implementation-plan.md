# TypeScript SDK Examples Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a type-checked, standalone TypeScript examples suite that demonstrates SDK setup, TLS, JWT authentication, and each supported party-creation lifecycle against an already-running localnet.

**Architecture:** Keep each user-facing example as an independently executable `.ts` program, while sharing only localnet option parsing, lifecycle-safe process handling, and ephemeral ED25519 key creation. Examples import the built package through the public package self-reference; the shared localnet helper discovers one healthy synchronizer with the public protobuf barrel for creation flows that require it.

**Tech Stack:** TypeScript 5.9, Node.js ESM and `node:crypto`, existing `ts-node` ESM loader, Vitest, Canton TypeScript SDK public package and protobuf exports.

---

## File structure

| File | Responsibility |
| --- | --- |
| `tsconfig.examples.json` | Strict, no-emit TypeScript project that includes only example source. |
| `package.json` | Per-example runners and an aggregate type-check command. |
| `examples/shared/localnet.ts` | Environment parsing, client-option construction, bearer credentials, TLS CA loading, unique party hints, and synchronizer discovery. |
| `examples/shared/party-keys.ts` | Ephemeral ED25519 public-key conversion and signer callbacks. |
| `examples/shared/run.ts` | Concise top-level error reporting and client disposal. |
| `examples/01-client-initialization.ts` | Minimal insecure gRPC client and version request. |
| `examples/02-tls-connection.ts` | TLS client and version request. |
| `examples/03-jwt-authentication.ts` | Authenticated client and version request. |
| `examples/10-hosted-party.ts` | Participant-hosted party allocation. |
| `examples/20-external-party-ed25519.ts` | Externally controlled party allocation with an ephemeral ED25519 signer. |
| `examples/30-decentralized-party-ed25519.ts` | Two-owner decentralized party allocation with ephemeral ED25519 signers. |
| `examples/README.md` | Prerequisites, commands, configuration, behavior, and lifecycle guidance. |
| `tests/unit/examples/localnet.test.ts` | Tests for environment-derived connection and party-hint behavior. |
| `tests/unit/examples/party-keys.test.ts` | Tests that generated ED25519 signers expose compatible public-key metadata and signatures. |

### Task 1: Establish the example TypeScript project and shared localnet configuration

**Files:**
- Create: `tsconfig.examples.json`
- Modify: `package.json`
- Create: `tests/unit/examples/localnet.test.ts`
- Create: `examples/shared/localnet.ts`

- [x] **Step 1: Add the no-emit example project and package runners**

Create `tsconfig.examples.json`:

```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "noEmit": true,
    "rootDir": "."
  },
  "include": ["examples/**/*.ts"]
}
```

Add package scripts using the existing ESM loader:

```json
"examples:check": "npm run build && tsc -p tsconfig.examples.json --noEmit",
"example:init": "npm run build && node --loader ts-node/esm examples/01-client-initialization.ts",
"example:tls": "npm run build && node --loader ts-node/esm examples/02-tls-connection.ts",
"example:jwt": "npm run build && node --loader ts-node/esm examples/03-jwt-authentication.ts",
"example:party:hosted": "npm run build && node --loader ts-node/esm examples/10-hosted-party.ts",
"example:party:external": "npm run build && node --loader ts-node/esm examples/20-external-party-ed25519.ts",
"example:party:decentralized": "npm run build && node --loader ts-node/esm examples/30-decentralized-party-ed25519.ts"
```

Keep all existing scripts unchanged and preserve their trailing-comma style.

- [x] **Step 2: Write the failing configuration tests**

Cover these observable rules using injected environment values and a temporary CA file:

```ts
it("uses insecure local gRPC defaults for ordinary examples", () => {
    const options = createExampleClientOptions({ environment: {} });
    expect(options.ledgerEndpoint).toBe("localhost:3901");
    expect(options.ledgerAdminEndpoint).toBe("localhost:3901");
    expect(options.participantAdminEndpoint).toBe("localhost:3902");
    expect(options.grpcChannelSecurity).toBe(GrpcChannelSecurity.insecure);
});

it("uses the supplied CA file and TLS on every gRPC surface", () => {
    const options = createExampleClientOptions({
        environment: { SDK_EXAMPLE_TLS_ROOT_CERTIFICATE: certificatePath },
        tls: true,
    });
    expect(options.grpcChannelSecurity).toBe(GrpcChannelSecurity.tls);
    expect(options.grpcTlsRootCertificates).toEqual(certificateBytes);
});

it("explains how to enable localnet TLS when the CA file is missing", () => {
    expect(() => createExampleClientOptions({
        environment: { SDK_EXAMPLE_TLS_ROOT_CERTIFICATE: missingPath },
        tls: true,
    })).toThrow("LOCALNET_TLS=1");
});

it("requires a bearer token when the JWT example requests one", () => {
    expect(() => createExampleClientOptions({
        environment: {}, requireBearerToken: true,
    })).toThrow("SDK_EXAMPLE_BEARER_TOKEN");
});

it("uses the shared token for all surfaces and lets a per-surface token override it", () => {
    // Assert each resulting auth provider returns the intended Authorization header.
});

it("creates valid unique party hints with an optional prefix", () => {
    expect(createPartyHint({ prefix: "tutorial" })).toMatch(/^tutorial-/);
    expect(createPartyHint({ prefix: "tutorial" })).not.toBe(createPartyHint({ prefix: "tutorial" }));
});

it("uses the explicit synchronizer override without querying the node", async () => {
    await expect(discoverSynchronizerIdAsync(client, "sync::override"))
        .resolves.toBe("sync::override");
});

it("requires exactly one healthy discovered synchronizer", async () => {
    // Exercise zero, one, and multiple healthy result sets with a minimal
    // service stub; zero and multiple report SDK_EXAMPLE_SYNCHRONIZER.
});
```

- [x] **Step 3: Run the focused tests and verify they fail**

Run: `rtk npm run build && rtk npm test -- tests/unit/examples/localnet.test.ts`

Expected: FAIL because `examples/shared/localnet.ts` does not exist.

- [x] **Step 4: Implement `examples/shared/localnet.ts`**

Export these focused functions:

```ts
export function createExampleClientOptions(init?: {
    environment?: NodeJS.ProcessEnv;
    tls?: boolean;
    requireBearerToken?: boolean;
}): CantonClientOptions;

export function createExampleClient(init?: Parameters<typeof createExampleClientOptions>[0]): CantonClient;

export function createPartyHint(init?: { prefix?: string }): string;

export async function discoverSynchronizerIdAsync(
    client: CantonClient,
    synchronizerOverride?: string,
): Promise<string>;
```

Use `TransportKind.grpc`. Default every endpoint to the localnet values listed
in the design. With `tls: true`, load the configured CA path (or the existing
`.generated/localnet-tls/ca.crt` default) using `readFileSync`, pass its bytes
as `grpcTlsRootCertificates`, and set `GrpcChannelSecurity.tls`; otherwise set
`GrpcChannelSecurity.insecure` explicitly.

For credentials, accept `SDK_EXAMPLE_BEARER_TOKEN` as a fallback and the three
per-surface variables as overrides. When `requireBearerToken` is true, reject
only when no shared or relevant per-surface value is available; never include a
token value in an error. Build each configured provider with
`new BearerTokenAuthProvider(token)`.

For synchronizer discovery, return a non-empty `synchronizerOverride`
immediately. The top-level party examples pass
`process.env.SDK_EXAMPLE_SYNCHRONIZER`; this explicit argument keeps the helper
deterministic in focused tests. Otherwise call:

```ts
client.synchronizerConnectivityService.listConnectedSynchronizersAsync(
    comDigitalasset.canton.admin.participant.v30.ListConnectedSynchronizersRequest.create(),
)
```

Import `comDigitalasset` from the public `@distrohelena/canton-typescript-sdk/protobuf`
entry point. Require exactly one healthy entry and throw a message that tells
the user to set `SDK_EXAMPLE_SYNCHRONIZER` when zero or multiple are found.

Wrap CA-file loading so a missing/unreadable certificate reports the configured
path and tells the reader to start the localnet with `LOCALNET_TLS=1` (or set
`SDK_EXAMPLE_TLS_ROOT_CERTIFICATE` to the correct CA), instead of leaking a raw
`ENOENT` error.

Generate hints from an optional `SDK_EXAMPLE_PARTY_PREFIX` or a fixed `example`
default plus a timestamp and `randomBytes(4).toString("hex")`; validate the
prefix is non-empty after trimming.

- [x] **Step 5: Run the focused tests**

Run: `rtk npm run build && rtk npm test -- tests/unit/examples/localnet.test.ts`

Expected: PASS.

- [x] **Step 6: Commit the project wiring and localnet helper**

```bash
rtk git add package.json tsconfig.examples.json examples/shared/localnet.ts tests/unit/examples/localnet.test.ts
rtk git commit -m "feat: add TypeScript example localnet helpers"
```

### Task 2: Test and implement ephemeral ED25519 keys and safe example execution

**Files:**
- Create: `tests/unit/examples/party-keys.test.ts`
- Create: `examples/shared/party-keys.ts`
- Create: `examples/shared/run.ts`

- [x] **Step 1: Write failing ED25519 helper tests**

```ts
it("creates a DER SPKI ED25519 public key and signs supplied payloads", async () => {
    const key = createExampleEd25519Key();
    expect(key.publicKey.format).toBe(
        ExternalPartyCryptoKeyFormat.derX509SubjectPublicKeyInfo,
    );
    expect(key.publicKey.keySpec).toBe(ExternalPartySigningKeySpec.ecCurve25519);
    const result = await key.sign({ payload: new Uint8Array([1, 2, 3]) });
    expect(result.format).toBe(ExternalPartySignatureFormat.concat);
    expect(result.signingAlgorithmSpec).toBe(ExternalPartySigningAlgorithmSpec.ed25519);
    expect(result.signature).not.toHaveLength(0);
});
```

- [x] **Step 2: Run the focused test and verify it fails**

Run: `rtk npm run build && rtk npm test -- tests/unit/examples/party-keys.test.ts`

Expected: FAIL because the key helper does not exist.

- [x] **Step 3: Implement `party-keys.ts` and `run.ts`**

`party-keys.ts` uses `generateKeyPairSync("ed25519")`, exports the public key
as `der`/`spki`, and signs opaque payloads with `sign(null, payload,
privateKey)`. It returns SDK DTOs using
`derX509SubjectPublicKeyInfo`, `ecCurve25519`, `concat`, and `ed25519`.
Expose one type narrow enough for both `CreateExternalPartyRequest` and
`CreateDecentralizedPartyRequest`:

```ts
export interface ExampleEd25519Key {
    readonly publicKey: ExternalPartySigningPublicKey;
    readonly sign: (request: { readonly payload: Uint8Array }) => Promise<ExternalPartySigningResult>;
}

export function createExampleEd25519Key(): ExampleEd25519Key;
```

`run.ts` exports `runExampleAsync(name, main)`. It executes `main`, prints a
short `Example <name> failed: ...` error without serializing secrets, sets
`process.exitCode = 1`, and preserves an `Error` cause for Node's output.
Each top-level program, rather than the shared wrapper, owns its client and
disposes it in `finally` so resource lifetime remains visible to readers.

- [x] **Step 4: Run focused tests and the SDK build**

Run: `rtk npm run build && rtk npm test -- tests/unit/examples/party-keys.test.ts`

Expected: PASS.

- [x] **Step 5: Commit the crypto and runtime helpers**

```bash
rtk git add examples/shared/party-keys.ts examples/shared/run.ts tests/unit/examples/party-keys.test.ts
rtk git commit -m "feat: add example signing helpers"
```

### Task 3: Add the initialization, TLS, and JWT examples

**Files:**
- Create: `examples/01-client-initialization.ts`
- Create: `examples/02-tls-connection.ts`
- Create: `examples/03-jwt-authentication.ts`

- [ ] **Step 1: Add the three deliberately small programs**

All programs use the public import below, request a version with
`new GetLedgerApiVersionRequest()`, print `Ledger API version: <version>`, and
dispose the client in a `finally` block:

```ts
import {
    CantonClient,
    GetLedgerApiVersionRequest,
} from "@distrohelena/canton-typescript-sdk";
import { createExampleClient } from "./shared/localnet.js";
import { runExampleAsync } from "./shared/run.js";
```

Initialization calls `createExampleClient()`; TLS calls
`createExampleClient({ tls: true })`; JWT calls
`createExampleClient({ requireBearerToken: true })`. Do not make the JWT
example implicitly enable TLS—the two configuration concepts must remain
separately understandable, while users can provide both settings together.

- [ ] **Step 2: Type-check the completed connection examples**

Run: `rtk npm run build && rtk npx tsc --noEmit --strict --target ES2022 --module NodeNext --moduleResolution NodeNext examples/01-client-initialization.ts examples/02-tls-connection.ts examples/03-jwt-authentication.ts`

Expected: PASS.

- [ ] **Step 3: Build and run the ordinary initialization example against the running localnet**

Run: `rtk npm run example:init`

Expected: The script prints a Ledger API version and exits 0. If the localnet
is unavailable, stop and report the connection failure rather than changing
endpoints or starting services.

- [ ] **Step 4: Commit the connection examples**

```bash
rtk git add examples/01-client-initialization.ts examples/02-tls-connection.ts examples/03-jwt-authentication.ts
rtk git commit -m "feat: add SDK connection examples"
```

### Task 4: Add the participant-hosted and external-party examples

**Files:**
- Create: `examples/10-hosted-party.ts`
- Create: `examples/20-external-party-ed25519.ts`

- [ ] **Step 1: Implement participant-hosted allocation**

In `10-hosted-party.ts`, use `createExampleClient()` and allocate with:

```ts
const partyHint = createPartyHint();
const party = await client.partyManagementService.allocatePartyAsync(
    new AllocatePartyRequest({ partyIdHint: partyHint, displayName: partyHint }),
);
console.log(`Hosted party: ${party.partyId}`);
```

Wrap with `runExampleAsync`, dispose in `finally`, and print a one-line warning
before allocation that the action creates durable localnet topology state.

- [ ] **Step 2: Implement external ED25519 allocation**

In `20-external-party-ed25519.ts`, create a client, discover the synchronizer,
generate one `ExampleEd25519Key`, and call the SDK convenience lifecycle:

```ts
const result = await client.partyManagementService.createExternalPartyAsync(
    new CreateExternalPartyRequest({
        synchronizer: await discoverSynchronizerIdAsync(client),
        partyHint: createPartyHint(),
        publicKey: key.publicKey,
        sign: key.sign,
        waitForAllocation: true,
    }),
);
console.log(`External party: ${result.partyId}`);
```

Always print the public-key fingerprint using the public SDK hashing surface,
not a transport response or private import:

```ts
console.log(
    `Public-key fingerprint: ${client.hashing.computePublicKeyFingerprint(
        key.publicKey.keyData,
        key.publicKey.format,
    )}`,
);
```

Keep the comment immediately above `key.sign` explaining that its Node key is
ephemeral and a production caller replaces only that signer callback.

- [ ] **Step 3: Type-check and run both party examples against the running localnet**

Run: `rtk npm run build && rtk npx tsc --noEmit --strict --target ES2022 --module NodeNext --moduleResolution NodeNext examples/10-hosted-party.ts examples/20-external-party-ed25519.ts && rtk npm run example:party:hosted && rtk npm run example:party:external`

Expected: Each command prints a distinct allocated party ID and exits 0. If
the node does not permit external-party allocation, report the received Canton
error and do not fall back to another lifecycle.

- [ ] **Step 4: Commit the hosted and external examples**

```bash
rtk git add examples/10-hosted-party.ts examples/20-external-party-ed25519.ts
rtk git commit -m "feat: add party lifecycle examples"
```

### Task 5: Add the decentralized-party example

**Files:**
- Create: `examples/30-decentralized-party-ed25519.ts`

- [ ] **Step 1: Implement the online decentralized lifecycle**

Create two separate owner keys and a third party-signing key. Use
`CreateDecentralizedPartyRequest` with no implicit threshold:

```ts
const result = await client.partyManagementService.createDecentralizedPartyAsync(
    new CreateDecentralizedPartyRequest({
        synchronizer: await discoverSynchronizerIdAsync(client),
        partyHint: createPartyHint(),
        owners: [ownerOne, ownerTwo],
        ownerThreshold: 2,
        partySigningKeys: [partySigningKey],
        partySigningThreshold: 1,
        waitForAllocation: true,
    }),
);
console.log(`Decentralized party: ${result.partyId}`);
```

Pass the `ExampleEd25519Key` objects directly because they have the required
`publicKey` and `sign` members. Explain in comments that all founding owners
are intentionally supplied and that the party key's proof of possession is
separate from owner authorization. Dispose in `finally` and show the same
durable-state warning as the other allocation examples.

- [ ] **Step 2: Type-check all examples and run the decentralized example against the running localnet**

Run: `rtk npm run examples:check && rtk npm run example:party:decentralized`

Expected: The command prints the decentralized party ID and exits 0. If the
connected Canton version rejects the lifecycle, preserve and report its error;
do not weaken thresholds or replace it with a hosted party.

- [ ] **Step 3: Commit the decentralized example**

```bash
rtk git add examples/30-decentralized-party-ed25519.ts
rtk git commit -m "feat: add decentralized party example"
```

### Task 6: Document the suite and perform final verification

**Files:**
- Create: `examples/README.md`
- Modify: `README.md`

- [ ] **Step 1: Write the examples README**

Document these items concisely:

- `npm install`, `npm run build`, and the `npm run example:*` commands.
- The suite assumes the localnet is running and never starts/stops it.
- Default non-TLS endpoint values and all three endpoint overrides.
- TLS launcher prerequisite, CA path override, and TLS command.
- ES256/localnet JWT prerequisite, common and per-surface token variables,
  and the JWT command; never include a token literal.
- `SDK_EXAMPLE_SYNCHRONIZER` behavior and automatic discovery requirements.
- `SDK_EXAMPLE_PARTY_PREFIX`, generated unique hints, durable allocation, and
  the three lifecycle distinctions.
- The ED25519 ephemeral-key limitation and the exact signer-callback location
  to replace for an HSM/KMS.

Add a short `Examples` link in the root `README.md` near the installation or
shared-client introduction.

- [ ] **Step 2: Run repository-only verification**

Run: `rtk npm run examples:check && rtk npm run lint && rtk npm run build && rtk git diff --check`

Expected: Every command exits 0.

- [ ] **Step 3: Run available localnet integration examples**

Run: `rtk npm run example:init && rtk npm run example:party:hosted && rtk npm run example:party:external && rtk npm run example:party:decentralized`

Expected: Each prints its result and exits 0 when the running localnet exposes
the required APIs. Run `example:tls` only with TLS-enabled localnet material
and `example:jwt` only with a valid configured token; report either unavailable
mode explicitly as conditional verification rather than a test failure.

- [ ] **Step 4: Commit documentation and final verification changes**

```bash
rtk git add examples/README.md README.md
rtk git commit -m "docs: add SDK examples guide"
```
