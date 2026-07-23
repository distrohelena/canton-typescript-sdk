# Parsed gRPC error surface design

## Goal

Turn gRPC transport failures into a stable SDK error that applications can
inspect in `try`/`catch`, while offering an optional best-effort observer for
centralised logging and telemetry.

## Public API

Add and export `GrpcTransportError`, a `TransportError` subclass. For a
recognised `RpcError` from `@protobuf-ts/runtime-rpc`, it exposes:

- `grpcCode`: the gRPC status string, for example `UNAUTHENTICATED`;
- `serviceName` and `methodName`, when the transport reports them;
- `metadata`: an immutable SDK-friendly view of the RPC metadata;
- `status`: the decoded `google.rpc.Status` from the
  `grpc-status-details-bin` trailer when it is present and valid;
- `cause`: the original `RpcError`.

The error message uses the gRPC status and server message, plus the service
and method when available. Raw/non-gRPC failures retain their current error
identity and are not sent to the observer.

`CantonClientOptions` gains an optional callback:

```ts
onGrpcError?: (error: GrpcTransportError) => void;
```

The callback is the logging/telemetry integration point; consumers can attach
their own logger and structured context. It runs synchronously immediately
before the SDK rejects the RPC call. Any callback exception is swallowed so it
cannot hide, replace, or change the original `GrpcTransportError`.

## Parsing

The gRPC wrapper detects `RpcError` structurally rather than by `instanceof`,
so duplicated package installations do not prevent normalisation. It copies
only documented scalar/string metadata values, making the public object safe
to inspect and serialize.

`grpc-status-details-bin` may arrive as a `Uint8Array`, a Node `Buffer`, or
an array of binary values. The parser uses the first valid binary value and
decodes it with the generated `google.rpc.Status` message type. Invalid,
missing, or non-binary trailers leave `status` undefined and never interfere
with delivery of the base error.

`Status.details` remains a list of generated `google.protobuf.Any` values.
The SDK will not guess at application-specific `Any` type URLs; users retain
the type URL and bytes for types they understand. This avoids falsely claiming
that arbitrary Canton detail payloads were decoded.

## Transport integration

All operation invocation paths are normalised at the gRPC channel boundary,
not individually in every service method. The channel factory wraps generated
service clients/proxy method invocations so unary calls, async streams, and
stream completion/status failures all use the same normalisation function.
The existing topology protobuf-compatibility wrapper continues to receive the
normalised error, preserving its specialised diagnostic behavior.

The callback belongs to `CantonClientOptions` and is threaded through the
client to every gRPC channel created for ledger, ledger-admin, and
participant-admin endpoints. Non-gRPC transports ignore it.

## Compatibility and validation

- This is additive: existing calls still reject, but gRPC rejections become a
  stable SDK `GrpcTransportError` instead of exposing a third-party class.
- `GrpcTransportError` remains a `TransportError`, so callers already catching
  `TransportError` continue to work.
- Callback invocation is optional and has no effect when omitted.
- Parsing must preserve all available gRPC code, server message, service,
  method, and metadata even when status-detail decoding fails.

## Testing

Unit tests will construct representative `RpcError` values and assert public
fields, causal chaining, binary status decoding, malformed-trailer resilience,
metadata copying, and ignored callback failures. Channel tests will prove a
generated unary service method rejects with `GrpcTransportError` and invokes
the callback once. Existing transport and topology compatibility tests remain
regressions.
