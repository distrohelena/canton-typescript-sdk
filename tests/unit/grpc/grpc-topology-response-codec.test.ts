import { describe, expect, it } from "vitest";
import {
    ListPartyToKeyMappingResponseCodec,
    ListPartyToParticipantResponseCodec,
} from "../../../src/grpc/index.js";
import {
    CryptoKeyFormat,
    SigningKeyScheme,
    SigningKeySpec,
    SigningKeyUsage,
} from "../../../src/transports/grpc/generated/canton/com/digitalasset/canton/crypto/v30/crypto.js";
import { Enums_ParticipantPermission, Enums_TopologyChangeOp } from "../../../src/transports/grpc/generated/canton/com/digitalasset/canton/protocol/v30/topology.js";
import {
    ListPartyToKeyMappingResponse as GrpcListPartyToKeyMappingResponse,
    ListPartyToParticipantResponse as GrpcListPartyToParticipantResponse,
} from "../../../src/transports/grpc/generated/canton/com/digitalasset/canton/topology/admin/v30/topology_manager_read_service.js";

const context = {
    store: { store: { oneofKind: "synchronizer" as const, synchronizer: { kind: { oneofKind: "id" as const, id: "sync::1220" } } } },
    sequenced: { seconds: "1700000000", nanos: 250_000_000 },
    validFrom: { seconds: "1700000001", nanos: 0 },
    validUntil: undefined,
    operation: Enums_TopologyChangeOp.ADD_REPLACE,
    transactionHash: new Uint8Array([1, 2, 3]),
    serial: 7,
    signedByFingerprints: ["fp-1", "fp-2"],
};

const signingKey = {
    format: CryptoKeyFormat.DER,
    publicKey: new Uint8Array([4, 5, 6]),
    scheme: SigningKeyScheme.UNSPECIFIED,
    usage: [SigningKeyUsage.NAMESPACE, SigningKeyUsage.PROTOCOL],
    keySpec: SigningKeySpec.EC_CURVE25519,
};

describe("gRPC topology response codecs", () => {
    it("round-trips a party-to-key-mapping response through proto and binary without loss", () => {
        const proto: GrpcListPartyToKeyMappingResponse = {
            results: [{
                context,
                item: { party: "Alice::1220", threshold: 2, signingKeys: [signingKey] },
            }],
        };

        const normalized = ListPartyToKeyMappingResponseCodec.fromProto(proto);

        expect(normalized.results[0]!.item.party).toBe("Alice::1220");
        expect(normalized.results[0]!.item.signingKeys[0]!.fingerprint).toMatch(/^1220/);
        expect(ListPartyToKeyMappingResponseCodec.toProto(normalized)).toEqual(proto);
        expect(ListPartyToKeyMappingResponseCodec.fromBinary(
            ListPartyToKeyMappingResponseCodec.toBinary(normalized),
        )).toEqual(normalized);
    });

    it("round-trips a party-to-participant response through proto and binary without loss", () => {
        const proto: GrpcListPartyToParticipantResponse = {
            results: [{
                context,
                item: {
                    party: "Alice::1220",
                    threshold: 1,
                    participants: [
                        { participantUid: "participant::1220a", permission: Enums_ParticipantPermission.SUBMISSION, onboarding: undefined },
                        { participantUid: "participant::1220b", permission: Enums_ParticipantPermission.OBSERVATION, onboarding: {} },
                    ],
                    partySigningKeys: { threshold: 1, keys: [signingKey] },
                },
            }],
        };

        const normalized = ListPartyToParticipantResponseCodec.fromProto(proto);

        expect(normalized.results[0]!.item.participants).toHaveLength(2);
        expect(normalized.results[0]!.item.participants[1]!.onboarding).toBeDefined();
        expect(ListPartyToParticipantResponseCodec.toProto(normalized)).toEqual(proto);
        expect(ListPartyToParticipantResponseCodec.fromBinary(
            ListPartyToParticipantResponseCodec.toBinary(normalized),
        )).toEqual(normalized);
    });
});
