# Decentralized party lifecycle design

## Goal

Add a safe, convenient SDK lifecycle for true Canton decentralized-namespace
parties. Applications retain all private-key custody while choosing either an
online signer-callback flow or an offline prepare/sign/finalize flow.

## Public API

`PartyManagementServiceClient` gains three gRPC-only methods:

- `createDecentralizedPartyAsync(request, options?)` — online convenience
  flow; internally prepares topology, invokes caller signers, and finalizes.
- `prepareDecentralizedPartyAsync(request, options?)` — creates the canonical
  decentralized namespace, its owner delegations, and its party-hosting
  onboarding transactions, then returns immutable signing requests.
- `finalizeDecentralizedPartyAsync(prepared, signatures, options?)` — validates
  detached signatures against the prepared request and submits the fully
  authorized transaction bundle through `AllocateExternalParty`.

The shared creation request contains synchronizer, party hint, party signing
keys, a required `partySigningThreshold`, confirming/observing participant
settings, confirmation threshold, decentralized namespace owners, and a
required `ownerThreshold`. Each owner and party signing key has an existing
`ExternalPartySigningPublicKey`; online requests additionally provide a
separate signer callback per key. The SDK derives the owner namespace
fingerprints from those keys, derives the canonical decentralized namespace,
and returns the resulting `partyHint::namespace` party ID. Callers never
supply either identifier. Keys support the existing ED25519 and secp256k1 DTO
values.

## Shared lifecycle

Preparation uses the topology manager’s generic topology-generation surface,
not `GenerateExternalPartyTopology`, because Canton documents that the latter
only creates normal single-owner namespaces. It creates these onboarding
mappings: a serial-1 `DecentralizedNamespaceDefinition` with the supplied
`ownerThreshold`; root `NamespaceDelegation` mappings for the owner keys in
that derived namespace; and one `PartyToParticipant` mapping with the
supplied hosting settings and `partySigningKeys`/`partySigningThreshold`.
`PartyToParticipant` carries the keys directly, so the deprecated
`PartyToKeyMapping` is not emitted. The write mapper must therefore support
decentralized namespace and namespace-delegation variants in addition to its
current party-to-participant support.

The namespace derivation is implemented in the SDK using Canton’s deterministic
encoding. It first derives each public-key fingerprint as Canton hash purpose
`12`, through the existing canonical `computeCantonPublicKeyFingerprint`
helper: it normalizes DER X.509 SubjectPublicKeyInfo ED25519 input to the raw
32-byte key when applicable, then SHA-256s the four-byte big-endian purpose
value followed by that canonical key encoding, prefixes the SHA-256 multihash
bytes `0x12 0x20`, and lowercase-hex encodes it. It then lexicographically sorts the owner fingerprints;
SHA-256s the four-byte big-endian `DecentralizedNamespace` purpose value (`37`)
followed by each fingerprint encoded as a four-byte big-endian byte length and
UTF-8 bytes; and applies the same multihash prefix and hex encoding. This makes
the party ID deterministic before any network call.

The prepared result contains opaque canonical transaction bytes and hashes,
the expected signer fingerprints for every transaction, and signing requests
with payload, purpose, owner/party role, party ID, and decentralized namespace.
Applications must not rebuild or alter these bytes. The serial-1 namespace
definition requires every founding owner’s authorization, irrespective of
`ownerThreshold`. Once that definition exists, its root delegations and the
party-hosting mapping require `ownerThreshold` owner signatures. Adding the
initial party signing keys to `PartyToParticipant` also requires a
proof-of-possession signature from every new party signing key. The
`partySigningThreshold` is embedded in that mapping and controls future Daml
transaction signing, not topology authorization. Neither threshold has an SDK
default.

The online method invokes each signer only for signing requests assigned to
that key: every founder signs the initial namespace definition and every
namespace-controlled mapping; every new party-signing key signs the initial
party-hosting mapping. Supplying all owner signatures keeps the callback API
simple while Canton accepts the required threshold on subsequent mappings. It passes
the returned detached signatures to the same finalization path as offline
users. The SDK populates `signedByFingerprint` from preparation metadata; a
caller cannot substitute a fingerprint.

Finalization rejects missing, duplicate, unexpected, or malformed detached
signatures before it calls Canton. It verifies the full-founder requirement for
the initial namespace definition, owner threshold for subsequent
namespace-controlled mappings, and proof of possession from every new party
signing key. Detached signing results identify their signature wire format:
ED25519 uses `concat`/`ed25519`; secp256k1 ECDSA uses `der`/`ecDsaSha256`.
The shared topology-signature DTO and assembler will be extended accordingly.
The generated v30 protobuf’s deprecated `scheme` enum has no secp256k1 value,
but its authoritative `keySpec` does; the generic topology mapper will retain
`keySpec: ecSecp256k1` and emit an unspecified deprecated scheme, matching the
protocol model. The lifecycle will reject secp256k1 only if the target
synchronizer rejects that configured key specification.
It groups valid signatures with their exact canonical transaction and calls the current
`allocateExternalPartyAsync` surface using per-transaction signatures only;
the optional external-party multihash signature is deliberately omitted. The
method returns the existing `AllocateExternalPartyResponse`.

## Validation and compatibility

- Require a non-empty synchronizer, party hint, at least two unique owner
  keys, at least one party signing key, and explicit owner/party thresholds.
- Require `ownerThreshold` to be in `1..owners.length` and
  `partySigningThreshold` to be in `1..partySigningKeys.length`.
- Require canonical, unique derived fingerprints across the owner and party
  key sets; reject unsupported key-spec/format combinations before topology
  generation.
- Require a positive confirmation threshold no greater than the number of
  confirming hosts (including the current participant where Canton’s request
  model treats it as implicit); reject contradictory observation-only settings.
- Preserve existing `createExternalPartyAsync` and low-level topology methods.
- Propagate signer, topology, and allocation errors unchanged; never submit if
  preparation/signing validation fails.
- JSON transports retain their current `NotSupportedError` before any signer
  callback runs.

## Testing

Unit tests will cover prepared topology proposals, owner-specific signing
requests, ED25519 and secp256k1 inputs, online delegation to prepare/finalize,
offline detached-signature validation, no allocation after signer/validation
errors, and JSON rejection. Mapper tests will cover new decentralized
topology mapping variants and DER/concat signature mapping. A live test, when
a multi-owner Canton environment is available, must prove that the initial
namespace is not accepted until every founder has authorized it, and that the
party-hosting mapping requires its configured owner threshold plus all new
party-key proofs of possession.
