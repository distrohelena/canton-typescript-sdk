## Vendored Canton Protos

This directory vendors upstream Protobuf source files from the official `digital-asset/canton` repository.

- Upstream repository: `https://github.com/digital-asset/canton`
- Vendored commit: `d9b8185160709d75e99914d659ed77bfc7fcfedb`
- Vendored on: `2026-07-03`

The copied source roots currently mirror these Canton-owned protobuf modules:

- `community/admin-api`
- `community/base`
- `community/synchronizer`
- `community/ledger-api-proto`
- `community/ledger/ledger-api-core`
- `community/participant`
- `community/daml-lf/archive`
- `community/daml-lf/transaction`
- `community/daml-lf/ledger-api-value-proto`

Additionally, the repo vendors this direct upstream dependency from the official `googleapis/googleapis` repository:

- `google/rpc/status.proto`

Notes:

- This is vendored source only. No TypeScript codegen is wired yet.
- The upstream `buf.work.yaml` also references generated third-party protobuf output under `community/lib/google-common-protos-scala/target/protobuf_external`. That build output is not vendored here.
- Standard `google/protobuf/*` well-known types are still expected to come from the protobuf toolchain used for codegen.
- Future gRPC codegen should treat each `src/main/protobuf` directory above as an include root, instead of flattening imports by hand.
