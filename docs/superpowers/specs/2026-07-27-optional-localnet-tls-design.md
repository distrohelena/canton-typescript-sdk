# Optional localnet TLS design

## Goal

Add an opt-in TLS mode to the published CN Quickstart localnet launcher so
participant Ledger API and participant Admin API connections are encrypted,
while retaining the existing plaintext Quickstart behavior when TLS is not
requested. The mode must support both generated development certificates and
user-supplied certificate material, including SDK trust configuration for
generated self-signed roots.

## Activation and compatibility

`LOCALNET_TLS=1` enables TLS. The default is `LOCALNET_TLS=0`, preserving the
current launcher behavior. Values other than `0` or `1` fail before Compose is
invoked.

TLS is additive to the existing `AUTH_MODE`, ES256 bearer-token mode, and
extra-participant provisioning. It changes transport encryption only; it does
not replace Ledger API authentication or Quickstart's internal shared-secret
and OAuth2 flows.

When TLS is enabled, the launcher uses direct Compose invocation instead of
`make start-local-ledger` because the generated Compose overlay must be passed
to Canton. The stop launcher uses the corresponding overlay and retains the
existing Make-target path when TLS is disabled.

## Certificate sources

The launcher has two mutually exclusive modes.

### Generated mode

When TLS is enabled and no certificate paths are supplied, the launcher creates
and reuses development-only material in:

```text
${START_LOCAL_TLS_RUNTIME_DIR:-$REPO_ROOT/.generated/localnet-tls}
```

The runtime contains a local CA certificate, a server certificate with SANs
for the local host and the Canton Compose service name, and its private key.
`LOCALNET_TLS_ROTATE=1` replaces generated material. Files containing private
keys are mode `0600`; public certificate files are not printed to logs.

### Supplied mode

Supplying any TLS material selects supplied mode and requires all of:

- `LOCALNET_TLS_CERT_CHAIN_PATH` — PEM server certificate chain;
- `LOCALNET_TLS_PRIVATE_KEY_PATH` — matching PEM private key;
- `LOCALNET_TLS_CA_CERT_PATH` — PEM root/intermediate certificate bundle used
  by SDK clients to trust the server.

The launcher validates readability, certificate/key matching, and CA material
before any Compose command. Supplied files are mounted read-only and are never
copied into the repository runtime directory.

## Canton configuration

The launcher writes a generated HOCON overlay for every participant exposed by
the localnet: `app-provider`, `app-user`, `sv`, and each `extra-N`. Each
participant receives TLS blocks under both exact listener paths:

```hocon
ledger-api.tls {
  cert-chain-file = "/app/localnet-tls/server.crt"
  private-key-file = "/app/localnet-tls/server.key"
  trust-collection-file = "/app/localnet-tls/ca.crt"
}

admin-api.tls {
  cert-chain-file = "/app/localnet-tls/server.crt"
  private-key-file = "/app/localnet-tls/server.key"
  trust-collection-file = "/app/localnet-tls/ca.crt"
}
```

Client authentication remains disabled (`client-auth` is not set), so existing
Quickstart services do not need client certificates. The generated Compose
overlay mounts the certificate files read-only into the Canton container and
mounts a composite `app.conf` that includes the original Quickstart
configuration before the TLS overlay. TLS and the existing ES256 overlay are
assembled through one deterministic Canton override so neither feature can
overwrite the other.

The overlay is included in initial startup, dependent-service startup, and
shutdown. Extra participant configuration receives the same `ledger-api.tls`
and `admin-api.tls` blocks.

## SDK trust configuration

The SDK currently defaults gRPC channel security to TLS but only uses the
system trust roots. To make generated localnet certificates usable, extend
`CantonClientOptions` with an optional `grpcTlsRootCertificates?: Uint8Array`.
The gRPC credential factory passes these bytes to `credentials.createSsl` for
all three gRPC surfaces. Insecure channels ignore the value.

Example:

```ts
import { readFileSync } from "node:fs";

const client = new CantonClient(new CantonClientOptions({
  transportKind: TransportKind.grpc,
  ledgerEndpoint: "localhost:3901",
  ledgerAdminEndpoint: "localhost:3902",
  participantAdminEndpoint: "localhost:3902",
  grpcTlsRootCertificates: readFileSync(
    ".generated/localnet-tls/ca.crt",
  ),
}));
```

The public option is a byte array rather than a filesystem path so browser or
bundled callers can provide trust material without making the SDK responsible
for filesystem access.

## Validation and error handling

- Reject invalid `LOCALNET_TLS` and `LOCALNET_TLS_ROTATE` values.
- Reject partial supplied certificate configuration.
- Reject missing, unreadable, malformed, or mismatched certificate material.
- Reject generated certificates that cannot be created or reused.
- Do not log private keys, bearer tokens, or full certificate contents.
- Preserve the disabled-mode Make and Compose behavior byte-for-byte where TLS
  is not enabled.

## Testing

Shell launcher tests will cover disabled compatibility, generated TLS,
supplied TLS, validation failures, all primary and extra participants, both
Ledger/Admin TLS blocks, read-only mounts, direct Compose startup/shutdown, and
absence of plaintext-only configuration in enabled mode. Existing ES256 cases
will continue to pass with TLS enabled or disabled.

SDK unit tests will cover option storage and passing custom roots into TLS
credentials while preserving insecure credentials and system-root defaults.

Final verification will include Bash syntax checks, focused shell and unit
tests, TypeScript build, package verification, and a live TLS health/version
call when Docker and the CN Quickstart checkout are available.
