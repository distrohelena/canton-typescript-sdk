# Changelog

All notable changes to this package are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.0.4] - 2026-08-17

### Added

- `ListPartyToKeyMappingResponseCodec` and `ListPartyToParticipantResponseCodec` on the `/grpc` subpath: static classes converting the topology-read responses between the raw protobuf wire format and the SDK's normalized types, in both directions (`fromProto`/`toProto`, `fromBinary`/`toBinary`). The wire format carries no key fingerprints (`fromProto` recomputes them) and the deprecated `scheme` field is never emitted by `toProto`.
- Live parity coverage for payload timestamp filters and projections: the fixture Iou template gained an `issuedAt : Time` field, seeded with 0-, 3-, and 6-digit sub-second values so gRPC/PQS parity is proven for each rendering Scribe stores.

## [1.0.3] - 2026-08-17

### Fixed

- The gRPC query transport now renders Daml `Timestamp` values as ISO-8601 strings and `Date` values as `YYYY-MM-DD` strings — the Daml-LF JSON encoding PQS/Scribe stores — instead of epoch-micros strings and epoch-day numbers. Payload time filters written against one query source now behave identically on the other, and `as: "timestamp"` JSON projections work on the gRPC source.
- Contract-cache snapshots are versioned to v3 so payloads cached in the old epoch-micros convention are discarded instead of being served alongside the new encoding.

## [1.0.2] - 2026-08-17

### Fixed

- `listPartyToKeyMappingAsync` on the gRPC transport passed raw protobuf through despite declaring the normalized request/response contract; both directions are now mapped like its `listPartyToParticipantAsync` sibling.

## [1.0.1] - 2026-08-17

### Fixed

- Non-serializable DAML types are ignored by the DAML-LF semantic model and interface generation.
- PQS schema validation retries instead of pinning the first failure, closing a startup race against Scribe.
- The localnet launcher honors the PQS flag for extra participants.
- npm audit vulnerabilities remediated.

Changes prior to 1.0.1 (the 0.1.x line and 1.0.0) predate this changelog; see the git history.
