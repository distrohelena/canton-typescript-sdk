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

## Key and JWKS sources

The launcher supports two modes:

1. **Generated mode (default when enabled):** create a P-256 private key and
   corresponding public JWK in a launcher-owned runtime directory. Generate a
   Compose sidecar that serves the JWKS at an internal URL reachable by all
   Canton containers.
2. **Supplied mode:** `LOCALNET_ES256_PRIVATE_KEY_PATH` points to a persistent
   PEM private key and `LOCALNET_ES256_JWKS_URL` points to the corresponding
   reachable JWKS endpoint. The launcher validates that both are supplied
   together and does not create or serve replacement key material.

Generated credentials are local development material only. They are excluded
from the npm package and are never printed in full. The launcher writes a
token file with restrictive permissions and reports its path.

## Participant configuration

The generated Compose/configuration overlay adds a `jwt-jwks` auth service to
each ledger API, configured with the shared audience and JWKS URL. Existing
auth service entries remain in place. The dynamic extra-participant
configuration receives the same additional service, so `EXTRA_PARTICIPANTS`
works when ES256 is enabled.

The launcher's stop path includes the generated JWKS sidecar and uses the
same generated configuration metadata, so start and stop select the same
Compose topology.

## Token surface

A small package-owned Node helper uses built-in Node.js crypto to construct
short-lived ES256 JWTs from the configured private key. The launcher invokes
it for a configurable subject and audience, writes the result to the runtime
directory, and prints an export command suitable for
`SDK_TEST_LEDGER_BEARER_TOKEN`. No private key, raw token, or arbitrary
environment values are logged.

## Validation and errors

- Reject unsupported `LOCALNET_ES256_JWT` values.
- Reject only-one-of supplied private key/JWKS URL and unreadable private-key
  paths.
- Reject an external JWKS URL that is not explicitly provided together with
  its signing key.
- Preserve the current behavior when ES256 is disabled.
- Retain `EXTRA_PARTICIPANTS` support for enabled ES256 mode; do not use the
  current shared-secret-only guard for this additive option.

## Testing

Start and stop shell tests will cover disabled behavior, generated mode,
supplied mode, generated Compose inclusion, participant and extra-participant
`jwt-jwks` configuration, safe token-file handling, and validation failures.
Unit tests will cover token-helper claim/header generation and invalid input.
The packed-tarball verifier will require the helper as a published runtime
asset. Existing localnet script and package verification suites remain part of
the final check.
