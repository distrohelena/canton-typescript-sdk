# Localnet Readiness Waiting Design

## Goal

Make localnet startup wait for Canton and dependent services to become ready,
regardless of host speed, instead of failing after a fixed elapsed time.

## Scope

This changes the startup wait functions in `node/start-local.sh` and their
shell-based regression coverage in `node/test-start-local.sh`. It does not
change Compose health checks, service configuration, or the readiness condition
itself.

## Readiness contract

- Canton is ready only when Docker reports its health as `healthy` and, when
  requested, all generated extra participant health endpoints respond.
- Generated extra participants are participant instances hosted by the same
  `canton` Docker container, not separate containers. Their readiness failures
  therefore use the Canton container's lifecycle state and logs.
- Splice and `splice-onboarding` are ready only when Docker reports each as
  `healthy`.
- A container that remains running but reports `starting` or `unhealthy` is not
  a terminal startup failure. The launcher keeps waiting so it works on slow
  hardware.
- A missing, exited, dead, or otherwise non-running target container is a
  terminal failure. The launcher reports the container state and recent Docker
  logs before returning failure.
- Users can interrupt an ongoing wait with Ctrl-C.

## Diagnostics

The launcher polls Docker health every two seconds. It emits a status line when
the observed state changes and progress diagnostics every 30 seconds while a
container remains unready. Progress diagnostics include the current Docker
state/health and the latest 40 log lines. The polling interval is for
observation only; it is not a startup deadline.

## Implementation shape

Create one shared helper that observes a container's lifecycle and health
state, handles terminal lifecycle failures, and emits diagnostics. Canton’s
existing wrapper adds the extra-participant readiness predicate; the generic
wrapper serves Splice and onboarding. Remove attempt counters and all fixed
startup deadlines.

## Tests

Extend the existing fake-Docker launcher test so that:

1. Canton remains `starting` for more than the previous 30 polls and then
   becomes `healthy`; startup succeeds.
2. An exited target container causes the launcher to fail and includes useful
   diagnostics.
3. With extra participants enabled, `splice` or `splice-onboarding` remains
   `starting` for more than the former 60-poll allowance and then becomes
   `healthy`; startup continues. This proves the dependent-service path uses
   the same unbounded lifecycle-aware helper.
4. Existing healthy-path tests remain unchanged in behavior.
