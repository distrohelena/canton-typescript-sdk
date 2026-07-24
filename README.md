# Canton TypeScript SDK

TypeScript SDK for Canton with:

- a shared `CantonClient`
- `grpc` and `json` transports
- `grpc`-only external signing
- gRPC Ledger API service boundaries as the public SDK shape

## Install

```bash
npm install @distrohelena/canton-typescript-sdk
```

## Experimental invariant testing

`@distrohelena/canton-typescript-sdk/testing` is an experimental, opt-in
Foundry-style fuzzing surface for Canton. It provides semantic parity for
campaign runs, exact depth, handlers, permissive or strict protocol reverts,
invariants, shrinking, replay traces, and safe artifacts. It does not attempt
to reproduce Foundry's EVM, ABI, PRNG, or shrink sequence byte-for-byte.

Define the campaign once, keep ledger I/O in explicit runtime hooks, and use
safe isolation. Shared or production ledgers must use an explicit external or
snapshot policy; cleanup policies need contract discovery for ambiguous
submissions.

```ts
import * as fc from "fast-check";
import {
    defineInvariantCampaign,
    runInvariantCampaignCheckAsync,
} from "@distrohelena/canton-typescript-sdk/testing";

const campaign = defineInvariantCampaign<{ total: number }>({
    runtime: {
        actors: {
            issuer: { party: "Issuer", participant: "participant-a" },
        },
        isolation: { kind: "external" },
    },
    config: { runs: 100, depth: 8, failOnRevert: false, seed: 42 },
    targets: [{ key: "Main:Iou:Create", actors: ["issuer"] }],
    invariants: [async ({ model }) => {
        if (model.total < 0) throw new Error("negative total");
    }],
});

await runInvariantCampaignCheckAsync({
    campaign,
    arbitrary: fc.constant([{ actor: "issuer", targetKey: "Main:Iou:Create" }]),
    key: (actions) => JSON.stringify(actions),
    setupAsync: async () => ({ model: { total: 0 }, ghost: {} }),
    executeAsync: async () => ({ kind: "accepted", updateId: "update-1" }),
});
```

Use `createDamlTestingCatalog`, `targetTemplate`, and
`resolveDeclarativeTargets` to discover targets. `targetTemplate(id).create()`
and `.choice(name)` select create and exercise actions; pair the resolved
targets with `createDeclarativeCampaignArbitrary` for an exact-depth action
sequence. In `executeAsync`, pass each action to `executeDeclarativeActionAsync`
with the campaign runtime and an explicit `resolveContractIdAsync` callback for
choices. The callback is intentional: the SDK will not guess an active contract
from stale local state. `handler`, `bound`, and handler assumptions support
custom operations alongside declarative actions. A failed check returns the
shrunk counterexample trace; `InvariantCampaignFailure` and replay artifacts
expose only allowlisted diagnostics.

Automatic Party fields require an explicit `valueParties` list. When writing
commands by hand, use `DamlParty` and `DamlNumeric` for Party and exact decimal
Numeric values; a plain string is DAML `Text` and a plain JavaScript number is
not an exact Numeric value.

## Live Integration Tests

The repository also supports a live SDK validation suite against an already-running CN quickstart localnet.

## Localnet launchers

The published package includes launchers for an existing CN Quickstart checkout.
Docker Compose must be installed and available. Set `CN_QUICKSTART_DIR` to the
checkout (or its `quickstart/` directory) when it is not in a supported relative
location.

After installing the package, run:

```bash
canton-localnet-start
canton-localnet-stop
```

You can also run them without a global install:

```bash
npm exec --package @distrohelena/canton-typescript-sdk canton-localnet-start
npm exec --package @distrohelena/canton-typescript-sdk canton-localnet-stop
```

These commands launch and stop CN Quickstart; they do not provision a
Quickstart checkout.

### Optional ES256 bearer tokens

Set `LOCALNET_ES256_JWT=1` when starting the localnet to add ES256 JWT
verification to the primary participants and any `EXTRA_PARTICIPANTS`. The
existing `AUTH_MODE` stays active for Quickstart's internal services.

By default, the launcher creates reusable P-256 development key material and
a self-signed certificate in `.generated/localnet-es256` at the package root. Set
`LOCALNET_ES256_ROTATE=1` to replace generated material, or set both
`LOCALNET_ES256_PRIVATE_KEY_PATH` and `LOCALNET_ES256_CERTIFICATE_PATH` to
use your own matching PEM private key and certificate.

The launcher writes a short-lived (ten-minute) token for `ledger-api-user` to
`ledger-api-user.token` in that runtime directory and prints its path. Use it
with the live SDK suite:

```bash
SDK_TEST_LEDGER_BEARER_TOKEN="$(cat .generated/localnet-es256/ledger-api-user.token)" \
npm run test:live
```

This is development-only key material. A custom `LOCALNET_ES256_SUBJECT` must
already be a Ledger API user with the appropriate rights on each participant.
Extra participants use the existing shared-secret onboarding flow; the current
OAuth2-plus-extras limitation still applies.

The live suite runs single-worker with an extended timeout because it mutates and reads a shared localnet.

Prerequisites:

- CN quickstart is already running on your machine
- the suite is expected to fail fast if the configured node is unreachable

Default local endpoints:

- gRPC ledger: `http://localhost:3901`
- gRPC ledger admin: `http://localhost:3901`
- gRPC participant admin: `http://localhost:3902`
- JSON ledger and ledger admin: `http://localhost:3975`

Override environment variables:

- `SDK_TEST_LEDGER_ENDPOINT`
- `SDK_TEST_LEDGER_ADMIN_ENDPOINT`
- `SDK_TEST_PARTICIPANT_ADMIN_ENDPOINT`
- `SDK_TEST_SECONDARY_LEDGER_ENDPOINT`
- `SDK_TEST_SECONDARY_LEDGER_ADMIN_ENDPOINT`
- `SDK_TEST_SECONDARY_PARTICIPANT_ADMIN_ENDPOINT`
- `SDK_TEST_TERTIARY_LEDGER_ENDPOINT`
- `SDK_TEST_TERTIARY_LEDGER_ADMIN_ENDPOINT`
- `SDK_TEST_TERTIARY_PARTICIPANT_ADMIN_ENDPOINT`

The live harness also supports bearer-token overrides:

- `SDK_TEST_LEDGER_BEARER_TOKEN`
- `SDK_TEST_LEDGER_ADMIN_BEARER_TOKEN`
- `SDK_TEST_PARTICIPANT_ADMIN_BEARER_TOKEN`

For CN quickstart shared-secret mode, the harness generates a default bearer token automatically using:

- subject `ledger-api-user`
- audience `https://canton.network.global`
- shared secret `unsafe`

Run:

```bash
npm run test:live
```

The opt-in live stateful fuzz campaign uses the two-participant CN quickstart
`Main:Iou` fixture. It is disabled by default and must be enabled explicitly:

```bash
SDK_TEST_ENABLE_LIVE_FUZZING=1 \
FUZZ_NUM_RUNS=20 \
npm run test:live:fuzz
```

The campaign requires both gRPC participants, with node 0 using
`SDK_TEST_LEDGER_ENDPOINT`, `SDK_TEST_LEDGER_ADMIN_ENDPOINT`, and
`SDK_TEST_PARTICIPANT_ADMIN_ENDPOINT`, and node 1 using the corresponding
`SDK_TEST_SECONDARY_*` variables. It allocates an issuer on participant A and
an owner on participant B unless `FUZZ_LIVE_ISSUER_PARTY` and
`FUZZ_LIVE_OWNER_PARTY` are both supplied. For exact replay, keep those party
IDs, `FUZZ_LIVE_RUN_ID`, `FUZZ_SEED`, and `FUZZ_PATH` unchanged.

Campaign controls include:

- `FUZZ_LIVE_DEPTH=N` for exact-depth Foundry-style runs. If it is absent,
  `FUZZ_LIVE_MAX_COMMANDS=N` retains the legacy variable-length behavior;
  equal values are accepted when both are supplied, while conflicting values
  fail fast.
- `FUZZ_LIVE_FAIL_ON_REVERT=true|false` controls protocol reverts. It defaults
  to `false`; transport errors, timeouts, malformed responses, and ambiguous
  commit outcomes remain fatal. `FUZZ_LIVE_REQUIRE_ARCHIVE=true|false` also
  accepts legacy `1|0` and requires strict reverts for archive smoke mode.
- `FUZZ_LIVE_ACTION_WEIGHTS=query=30,fetch=20,events=20,exercise=10,probe=20`
  sets non-negative action weights. Exact-depth campaigns always retain a
  no-contract `probe` fallback and a post-archive read action.
- `FUZZ_LIVE_ACTORS=issuer,owner` selects eligible actors. `issuer` is
  mandatory; omitting `owner` removes owner-targeted generated reads while
  retaining the cross-participant fixture checks.
- `FUZZ_LIVE_POLL_TIMEOUT_MS`, `FUZZ_LIVE_POLL_INTERVAL_MS`,
  `FUZZ_LIVE_TEST_TIMEOUT_MS`, and `FUZZ_LIVE_CLEANUP_TIMEOUT_MS` control
  polling and timeouts.
- `FUZZ_LIVE_FAILURE_DIR` defaults to `tests/live/.artifacts/failures`.
  `FUZZ_LIVE_REPLAY_FAILURES=true|false` enables automatic replay of valid
  artifacts in that directory; stale or corrupt automatic artifacts are
  reported and skipped. `FUZZ_LIVE_REPLAY_FILE=/path/to/failure.json` performs
  explicit replay and validates run ID, party IDs, and fingerprints before
  connecting to participants.

Artifacts contain allowlisted campaign data only: endpoints, credentials,
headers, and arbitrary error objects are never serialized. They are written
with restrictive permissions and no-clobber atomic persistence. For a strict
four-step smoke run, use:

```bash
SDK_TEST_ENABLE_LIVE_FUZZING=1 \
FUZZ_NUM_RUNS=1 \
FUZZ_LIVE_DEPTH=4 \
FUZZ_LIVE_FAIL_ON_REVERT=true \
FUZZ_LIVE_REQUIRE_ARCHIVE=1 \
FUZZ_LIVE_FAILURE_DIR=tests/live/.artifacts/smoke \
npm run test:live:fuzz
```

This fixture assumes the CN quickstart already has the `Main:Iou` package on
both participants. The ledger-only DAML Ops localnet launcher is not a
substitute: open ports are insufficient without the quickstart Ledger API,
package, party, and cross-participant visibility checks.

Experimental multi-host external-party coverage is opt-in:

- set `SDK_TEST_ENABLE_MULTI_HOST_EXTERNAL_PARTY=1` to enable the multi-host live spec
- the default quickstart assumptions cover 2 nodes (`390x` and `490x`)
- configure the tertiary endpoint variables above to enable the 3-host scenario

## Shared Client

```ts
import {
    AllocatePartyRequest,
    BearerTokenAuthProvider,
    CantonClient,
    CantonClientOptions,
    GetActiveContractsPageRequest,
    HealthCheckRequest,
    GetLedgerApiVersionRequest,
    TransportKind,
} from "@distrohelena/canton-typescript-sdk";

const client = new CantonClient(
    new CantonClientOptions({
        transportKind: TransportKind.json,
        ledgerEndpoint: "https://ledger.example.com",
        ledgerAdminEndpoint: "https://ledger-admin.example.com",
        participantAdminEndpoint: "https://participant-admin.example.com",
        ledgerAuthProvider: new BearerTokenAuthProvider("ledger-token"),
        ledgerAdminAuthProvider: new BearerTokenAuthProvider(
            "ledger-admin-token",
        ),
        participantAdminAuthProvider: new BearerTokenAuthProvider(
            "participant-admin-token",
        ),
    }),
);

const version = await client.versionService.getLedgerApiVersionAsync(
    new GetLedgerApiVersionRequest(),
);
const health = await client.healthService.checkAsync(
    new HealthCheckRequest({
        service: "grpc.health.v1.Health",
    }),
);
const party = await client.partyManagementService.allocatePartyAsync(
    new AllocatePartyRequest({
        partyIdHint: "Alice",
        displayName: "Alice",
    }),
);
const contracts = await client.stateService.getActiveContractsPageAsync(
    new GetActiveContractsPageRequest({
        party: "Alice",
        templateId: "Main:Iou",
    }),
);
```

`stateService.getActiveContractsPageAsync(...)` keeps `templateId` as the simple helper path, and on gRPC also supports interface-based ACS reads with `interfaceId`, `includeInterfaceView`, `includeCreatedEventBlob`, `activeAtOffset`, `maxPageSize`, and `pageToken`. JSON remains template-query only.

For interface views, do not use `contractService.getContractAsync(...)`. That contract lookup surface cannot return interface views; use `stateService` or `updateService` instead.

`CantonClient` now splits its public surface across the real API boundaries:

- ledger services use `ledgerEndpoint`
- ledger admin services use `ledgerAdminEndpoint`
- participant admin services use `participantAdminEndpoint`

For gRPC, channel security resolves per surface:

- ledger services use `ledgerGrpcChannelSecurity ?? grpcChannelSecurity ?? GrpcChannelSecurity.tls`
- ledger admin services use `ledgerAdminGrpcChannelSecurity ?? grpcChannelSecurity ?? GrpcChannelSecurity.tls`
- participant admin services use `participantAdminGrpcChannelSecurity ?? grpcChannelSecurity ?? GrpcChannelSecurity.tls`

### gRPC error handling

gRPC failures reject with `GrpcTransportError`, a `TransportError` subclass
with the gRPC status code, service/method, copied metadata, and decoded
`google.rpc.Status` trailer when Canton provides one. Use `onGrpcError` for
centralized logging or telemetry; it observes the error but cannot replace the
rejection if the callback itself fails.

```ts
import { GrpcTransportError } from "@distrohelena/canton-typescript-sdk";

const client = new CantonClient(new CantonClientOptions({
    // existing gRPC connection options,
    onGrpcError: (error) => {
        logger.error({ code: error.grpcCode, status: error.status });
    },
}));

try {
    await client.userManagementService.listUsersAsync(/* request */);
} catch (error) {
    if (error instanceof GrpcTransportError) {
        console.error(error.grpcCode, error.serviceName, error.methodName);
    }
}
```

Application-specific `google.protobuf.Any` values in `error.status.details`
remain opaque (`typeUrl` and bytes) unless the application knows that type.

### External party lifecycle

For an externally controlled party, provide the public key and a callback that
delegates signing to your HSM, KMS, wallet, or other key service. The SDK
generates the Canton topology, requests signatures for each topology
transaction and its multihash, then allocates the party. It never receives a
private key.

```ts
import {
    CreateExternalPartyRequest,
    ExternalPartyCryptoKeyFormat,
    ExternalPartySignatureFormat,
    ExternalPartySigningAlgorithmSpec,
    ExternalPartySigningKeySpec,
    ExternalPartySigningPublicKey,
} from "@distrohelena/canton-typescript-sdk";

const party = await client.partyManagementService.createExternalPartyAsync(
    new CreateExternalPartyRequest({
        synchronizer: "sync::sandbox",
        partyHint: "alice",
        publicKey: new ExternalPartySigningPublicKey({
            format: ExternalPartyCryptoKeyFormat.raw,
            keyData: ed25519PublicKeyBytes,
            keySpec: ExternalPartySigningKeySpec.ecCurve25519,
        }),
        sign: async ({ payload }) => ({
            signature: await keyService.sign(payload),
            format: ExternalPartySignatureFormat.raw,
            signingAlgorithmSpec: ExternalPartySigningAlgorithmSpec.ed25519,
        }),
    }),
);
```

Use the same flow for secp256k1 by supplying
`ExternalPartySigningKeySpec.ecSecp256k1` and the signer’s compatible Canton
signature format and algorithm. This convenience operation is gRPC-only.

## Service Map

- Ledger endpoint:
- `versionService.getLedgerApiVersionAsync(...)`: `json`, `grpc`
- `healthService.checkAsync(...)`: `grpc` only
- `packageService.listPackagesAsync(...)`: `grpc` only
- `packageService.getPackageAsync(...)`: `grpc` only
- `packageService.getPackageStatusAsync(...)`: `grpc` only
- `packageService.listVettedPackagesAsync(...)`: `grpc` only
- `commandService.submitAndWaitAsync(...)`: `json`, `grpc`
- `commandSubmissionService.submitAsync(...)`: reserved, currently unsupported
- `stateService.getActiveContractsPageAsync(...)`: `json`, `grpc`
- `stateService.getActiveContractsAsync(...)`: `json` only
- `updateService.getUpdatesAsync(...)`: `grpc` only
- `commandCompletionService`: placeholder, no methods yet
- `eventQueryService`: placeholder, no methods yet
- `contractService`: placeholder, no methods yet

- Ledger Admin endpoint:
- `partyManagementService.allocatePartyAsync(...)`: `json`, `grpc`
- `partyManagementService.listKnownPartiesAsync(...)`: `json`, `grpc`
- `partyManagementService.getParticipantIdAsync(...)`: `grpc` only
- `partyManagementService.getPartiesAsync(...)`: `grpc` only
- `partyManagementService.generateExternalPartyTopologyAsync(...)`: `grpc` only
- `partyManagementService.allocateExternalPartyAsync(...)`: `grpc` only
- `partyManagementService.createExternalPartyAsync(...)`: `grpc` only
- `userManagementService.grantUserRightsAsync(...)`: `json`, `grpc`
- `packageManagementService.uploadDarFileAsync(...)`: `json`, `grpc`

- Participant Admin endpoint:
- `participantPackageService.listPackagesAsync(...)`: `grpc` only
- `participantPackageService.getPackageContentsAsync(...)`: `grpc` only
- `participantPackageService.getPackageReferencesAsync(...)`: `grpc` only
- `participantStatusService.getParticipantStatusAsync(...)`: `grpc` only
- `topologyManagerReadService.*`: `grpc` only
- `topologyAggregationService.*`: `grpc` only
- `topologyManagerWriteService.authorizeAsync(...)`: `grpc` only
- `topologyManagerWriteService.addTransactionsAsync(...)`: `grpc` only
- `topologyManagerWriteService.importTopologySnapshotAsync(...)`: `grpc` only
- `topologyManagerWriteService.importTopologySnapshotV2Async(...)`: `grpc` only
- `topologyManagerWriteService.signTransactionsAsync(...)`: `grpc` only
- `topologyManagerWriteService.generateTransactionsAsync(...)`: `grpc` only
- `topologyManagerWriteService.createTemporaryTopologyStoreAsync(...)`: `grpc` only
- `topologyManagerWriteService.dropTemporaryTopologyStoreAsync(...)`: `grpc` only
- `topologyManagerWriteService.assembleSignedTransactions(...)`: SDK-local on any client

Raw topology-write mapping support currently starts with `PartyToParticipant`. The detached-signature assembler is transport-independent, but the actual participant-admin write RPCs are `grpc` only and JSON rejects them with `NotSupportedError`.

## Protocol-Specific Clients

Subpath exports are available when you want to construct directly over a transport adapter:

- `@distrohelena/canton-typescript-sdk/grpc`
- `@distrohelena/canton-typescript-sdk/json`
- `@distrohelena/canton-typescript-sdk/daml-lf`
- `@distrohelena/canton-typescript-sdk/debugger`
- `@distrohelena/canton-typescript-sdk/daml-interface`

`GrpcLedgerClient` and `JsonLedgerClient` expose the same service properties as `CantonClient`.

JSON does not provide a `grpc.health.v1.Health.Check` equivalent. The shared SDK still exposes `healthService`, but JSON rejects calls with `NotSupportedError`.
JSON also does not provide a participant-admin status equivalent, so `participantStatusService` is currently `grpc` only.
JSON also does not expose the ledger-admin external-party RPCs, so `partyManagementService.generateExternalPartyTopologyAsync(...)` and `partyManagementService.allocateExternalPartyAsync(...)` are `grpc` only.

## DAML-LF Parser

The package also exposes a separate DAML-LF front-end at `@distrohelena/canton-typescript-sdk/daml-lf`.

Current scope:

- artifact-centric `DAR` and `DALF` loading
- LF `2.x` decoding
- immutable package/module/definition model
- workspace, compilation, and symbol resolution
- semantic queries over the compiled model
- evaluator core and trace-sink contracts
- replay-effect tracing for debugger-owned sessions

Example:

```ts
import {
    DarArchiveLoader,
    DamlLfCompilation,
    DamlLfPackageLoader,
    DamlLfWorkspace,
} from "@distrohelena/canton-typescript-sdk/daml-lf";

const archive = await new DarArchiveLoader().loadDarOrThrowAsync(darBytes);
const packageLoader = new DamlLfPackageLoader();
const packageModel = packageLoader.loadPackageOrThrow(
    archive.mainPackageEntry.bytes,
);
const workspace = new DamlLfWorkspace([packageModel]);
const compilation = DamlLfCompilation.createOrThrow(workspace);
const semanticModel = compilation.createSemanticModel();
```

## Replay Debugger

The package also exposes an experimental replay debugger at `@distrohelena/canton-typescript-sdk/debugger`.

Current scope:

- load a replay session from a committed update offset
- hydrate referenced contracts through the gRPC contract and event-query services
- precompute a stepwise LF trace and expose stepping/session APIs
- replay LF update bodies for the supported evaluator subset, including nested exercise-driven effects
- validate replay determinism against the observed update payload

Current limits:

- replay depends on gRPC-visible create/exercise payloads
- source-aware replay expects DAR provenance with debugger source-map metadata
- unsupported LF constructs still fail fast with `ReplayUnsupportedLfConstructException`
- source locations currently map to executable definition spans from the DAR source map

Example:

```ts
import {
    LedgerReplayDebuggerClient,
    ReplaySessionRequest,
} from "@distrohelena/canton-typescript-sdk/debugger";

const debuggerClient = new LedgerReplayDebuggerClient({
    sessionLoader,
});

const session = await debuggerClient.loadSessionAsync(
    new ReplaySessionRequest({ offset: "42" }),
);
```

## DAML Interface Generator

The `@distrohelena/canton-typescript-sdk/daml-interface` subpath exposes a generator that turns compiled `DAR` or `DALF` artifacts into an in-memory TypeScript binding project.

Current generated output shape:

- one file per template
- shared support files
- a registry file
- an index file

Example:

```ts
import { DamlInterfaceGenerator } from "@distrohelena/canton-typescript-sdk/daml-interface";

const project = await new DamlInterfaceGenerator().generateFromDalfOrThrowAsync(
    dalfBytes,
);

console.log(project.templateFiles[0].path);
console.log(project.registryFile?.path);
console.log(project.indexFile?.path);
```

You can also write the generated project to disk:

```ts
import {
    DamlInterfaceGenerator,
    DamlInterfaceWriter,
} from "@distrohelena/canton-typescript-sdk/daml-interface";

const generator = new DamlInterfaceGenerator();
const writer = new DamlInterfaceWriter();
const project = await generator.generateFromDarOrThrowAsync(darBytes);

await writer.writeProjectAsync(project, "./artifacts");
```

CLI:

```bash
npm run generate:daml-interface -- --input ./sample.dalf --output ./artifacts
```

Current limits:

- generation is strict and throws when a template shape is not supported yet
- milestone 1 supports the current `daml-lf` text-based analyzer surface only
- the generator works from compiled artifacts, not `.daml` source files

## External Signing

External signing is supported on `grpc` only through `ICommandSigner`.

```ts
import {
    ICommandSigner,
    SignCommandRequest,
    SignCommandResult,
} from "@distrohelena/canton-typescript-sdk";

class ExampleSigner implements ICommandSigner {
    public async signAsync(
        request: SignCommandRequest,
    ): Promise<SignCommandResult> {
        return new SignCommandResult({
            algorithm: "ed25519",
            signature: request.payload,
        });
    }
}
```

See [DOCUMENTATION.md](./DOCUMENTATION.md) for the full function-by-function reference.
