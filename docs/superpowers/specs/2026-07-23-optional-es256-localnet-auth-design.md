# Optional ES256 localnet authentication design

## Goal

Allow the packaged localnet launchers to provision an optional, self-managed
ES256 JWT bearer-token path for every primary and extra participant, without
breaking the existing CN Quickstart authentication and onboarding flows.

## Activation and compatibility

`LOCALNET_ES256_JWT=1` enables ES256 verification. It is disabled by default.
The existing `AUTH_MODE` values (`shared-secret` and `oauth2`) retain their
current meaning and remain active alongside ES256. This additive behavior is
intentional: Quickstart-owned onboarding and PQS services still use their
existing tokens, while SDK users can authenticate to any participant with a
self-managed ES256 bearer token.

`EXTRA_PARTICIPANTS` continues to use the existing supported
`AUTH_MODE=shared-secret` provisioning flow. ES256 is additive to that flow
and works for every extra participant. The pre-existing OAuth2-plus-extras
limitation remains out of scope because Quickstart's extra-PQS onboarding still
depends on its shared-secret token generator.

## Key and certificate sources

The launcher supports two modes:

1. **Generated mode (default when enabled):** create a P-256 private key and
   self-signed X.509 certificate in `START_LOCAL_ES256_RUNTIME_DIR` (default:
   `$REPO_ROOT/.generated/localnet-es256`). The material is reused across
   restarts; `LOCALNET_ES256_ROTATE=1` explicitly replaces it.
2. **Supplied mode:** `LOCALNET_ES256_PRIVATE_KEY_PATH` points to a persistent
   PEM private key and `LOCALNET_ES256_CERTIFICATE_PATH` points to the
   matching certificate. The launcher requires both values together.

Generated credentials are local development material only. They are excluded
from the npm package and are never printed in full. The launcher writes a
token file with restrictive permissions and reports its path. For supplied
mode, startup derives the public JWK from the PEM and verifies that a matching
`kid`, `kty`, `crv`, `x`, and `y` appear in the fetched JWKS before starting
the stack.

## Participant configuration

The generated Compose/configuration overlay adds this exact service to each
ledger API:

```hocon
auth-services = [{
  type = unsafe-jwt-hmac-256
  target-audience = "https://canton.network.global"
  secret = "unsafe"
}, {
  type = jwt-es-256-crt
  certificate = "/app/es256-certificate.pem"
  target-audience = "https://canton.network.global/es256"
}]
```

It targets the three primary Canton participants—`app-provider`, `app-user`,
and `sv`—plus every generated `extra-N` participant. Existing auth service
entries remain first in the list, so Quickstart's current shared-secret or
OAuth2 internal flows continue to work; Canton tries subsequent auth services
when earlier ones reject a presented token.

The launcher's stop path uses the same generated configuration metadata, so
start and stop select the same Compose topology.

## Token surface

A small package-owned Node helper uses built-in Node.js crypto to construct
short-lived ES256 JWTs from the configured private key. Its header is
`{ alg: "ES256", typ: "JWT", kid }`, with `kid` matching the served JWK. Its
payload has `sub` (default `ledger-api-user`, overridable through
`LOCALNET_ES256_SUBJECT`), the fixed audience above, and numeric `iat`, `nbf`,
and `exp` claims. The default TTL is ten minutes and can be shortened through
`LOCALNET_ES256_TOKEN_TTL_SECONDS`; it must be positive and at most ten
minutes. The signer explicitly uses Node crypto's `dsaEncoding: "ieee-p1363"`
so the ES256 signature is JWT/JOSE's required fixed-width `R || S` form rather
than DER.

The default subject is deliberate: all three Quickstart participants and each
generated extra participant configure `ledger-api-user` as their additional
admin user. ES256 tokens use the ordinary Ledger API user-management
authorization model—there are no unverified party or privileged claims. A
custom subject must already exist and hold the required user-management rights
on each target participant. The launcher writes the token to the runtime
directory and prints only its path plus an export command suitable for
`SDK_TEST_LEDGER_BEARER_TOKEN`; no private key, raw token, or arbitrary
environment values are logged.

## Validation and errors

- Reject unsupported `LOCALNET_ES256_JWT` values.
- Reject only-one-of supplied private key/JWKS URL and unreadable private-key
  paths.
- Reject an external JWKS URL that is not explicitly provided together with
  its signing key.
- Reject a supplied private key that is not readable P-256 material, or whose
  derived public JWK does not occur in the supplied JWKS.
- Preserve the current behavior when ES256 is disabled.
- Retain `EXTRA_PARTICIPANTS` support for enabled ES256 mode through the
  existing shared-secret provisioning path; preserve the current OAuth2-plus-
  extras rejection.

## Testing

Start and stop shell tests will cover disabled behavior, generated mode,
supplied mode, generated Compose inclusion, participant and extra-participant
`jwt-jwks` configuration, safe token-file handling, and validation failures.
Unit tests will cover token-helper claim/header generation and invalid input.
The packed-tarball verifier will require the helper as a published runtime
asset. Existing localnet script and package verification suites remain part of
the final check. When Docker is available, the integration check starts the
generated ES256 localnet and proves the emitted bearer token is accepted by a
configured Ledger API health/version call; parsing a token locally is not
enough.
