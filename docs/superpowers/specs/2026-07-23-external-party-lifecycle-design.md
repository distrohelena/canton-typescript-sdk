# External party lifecycle convenience design

## Goal

Make external-party creation straightforward for applications that control their
own signing keys, without requiring the SDK to generate, store, or access a
private key.

## Public API

Add `partyManagementService.createExternalPartyAsync(request, options?)` as a
gRPC-only convenience operation. Its request collects the fields needed by the
existing topology-generation and allocation calls:

- required synchronizer and party hint;
- a caller-supplied `ExternalPartySigningPublicKey`;
- optional topology settings already supported by
  `GenerateExternalPartyTopologyRequest` (observation/confirmation settings);
- optional allocation settings already supported by
  `AllocateExternalPartyRequest` (identity provider, user, wait-for-allocation);
- required async `sign` callback.

The public key retains the existing `format`, `keyData`, and `keySpec` model.
This supports callers providing ED25519 or secp256k1 keys (and does not invent
a second SDK key model). The callback returns the existing signature format,
algorithm, and signature bytes, except that the SDK supplies the generated
public-key fingerprint itself.

```ts
const party = await client.partyManagementService.createExternalPartyAsync(
  new CreateExternalPartyRequest({
    synchronizer,
    partyHint: "alice",
    publicKey,
    sign: async ({ payload, kind, partyId, publicKeyFingerprint }) => ({
      signature: await signer.sign(payload),
      format: ExternalPartySignatureFormat.raw,
      signingAlgorithmSpec: ExternalPartySigningAlgorithmSpec.ed25519,
    }),
  }),
);
```

## Lifecycle orchestration

The service calls the existing `generateExternalPartyTopologyAsync` operation
first. It invokes `sign` once for each returned topology transaction with
`kind: "topology-transaction"`, then once for `multiHash` with
`kind: "multi-hash"`. Every callback invocation includes the raw payload,
generated party ID, and public-key fingerprint.

The service creates one `ExternalPartyOnboardingTransaction` per topology
transaction, attaches the callback signature to it, attaches the multihash
signature, and delegates to the existing `allocateExternalPartyAsync` method.
It returns the unchanged `AllocateExternalPartyResponse`.

The SDK sets `signedByFingerprint` from the generated topology response,
avoiding duplication and preventing a caller from accidentally signing under a
different key fingerprint. The caller is responsible for selecting the correct
signature format and algorithm for its supplied key.

## Error handling and compatibility

- The convenience operation is additive; all existing generate/allocate APIs
  remain public for advanced and offline workflows.
- If topology generation, signing, or allocation fails, the error propagates
  unchanged. Allocation is never attempted after a signing callback failure.
- The operation is gRPC-only because the underlying external-party APIs are
  gRPC-only; existing non-gRPC `NotSupportedError` behavior remains in force.
- The SDK rejects empty synchronizer and party-hint values, empty public-key
  material, and a missing callback before any RPC. Canton remains authoritative
  for topology and cryptographic acceptance.
- The supplied `RequestOptions` are forwarded unchanged to both topology
  generation and allocation calls.

## Testing

Unit tests will use a fake transport to assert generation precedes signing,
the callback receives each exact transaction and multihash payload, generated
context is propagated, signatures are assembled with the generated
fingerprint, and allocation receives the correct low-level request. Separate
tests cover ED25519 and secp256k1 callback selections, signer failure with no
allocation, and transport propagation for non-gRPC clients. Existing
external-party mapper and service tests remain regressions.
