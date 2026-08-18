import { ParticipantPermission } from "../../../core/types/topology/participant-permission.js";
import { PartyToKeyMapping } from "../../../core/types/topology/party-to-key-mapping.js";
import { PartyToParticipant } from "../../../core/types/topology/party-to-participant.js";
import { TopologyBaseResult } from "../../../core/types/topology/topology-base-result.js";
import {
    TopologySigningKeysWithThreshold,
    TopologySigningPublicKey,
} from "../../../core/types/topology/topology-public-key.js";
import { ListPartyToKeyMappingResponse } from "../../../core/types/responses/list-party-to-key-mapping-response.js";
import { ListPartyToParticipantResponse } from "../../../core/types/responses/list-party-to-participant-response.js";
import {
    CryptoKeyFormat,
    SigningKeyScheme,
    SigningKeySpec,
    SigningKeyUsage,
    SigningKeysWithThreshold as GrpcSigningKeysWithThreshold,
    SigningPublicKey as GrpcSigningPublicKey,
} from "../generated/canton/com/digitalasset/canton/crypto/v30/crypto.js";
import {
    Enums_ParticipantPermission,
    PartyToKeyMapping as GrpcPartyToKeyMapping,
    PartyToParticipant as GrpcPartyToParticipant,
    PartyToParticipant_HostingParticipant,
} from "../generated/canton/com/digitalasset/canton/protocol/v30/topology.js";
import {
    BaseResult,
    ListPartyToKeyMappingResponse as GrpcListPartyToKeyMappingResponse,
    ListPartyToParticipantResponse as GrpcListPartyToParticipantResponse,
} from "../generated/canton/com/digitalasset/canton/topology/admin/v30/topology_manager_read_service.js";
import {
    mapGrpcTimestamp,
    mapGrpcTopologyChangeOp,
    mapGrpcTopologyStoreId,
} from "./topology-common-mapper.js";
import {
    mapGrpcListPartyToKeyMappingResponse,
    mapGrpcListPartyToParticipantResponse,
} from "./topology-manager-read-mapper.js";

/** Converts ListPartyToKeyMappingResponse between raw topology-read protobuf and the normalized SDK shape. */
export class ListPartyToKeyMappingResponseCodec {
    private constructor() {}

    public static fromProto(
        payload: Partial<GrpcListPartyToKeyMappingResponse>,
    ): ListPartyToKeyMappingResponse {
        return mapGrpcListPartyToKeyMappingResponse(payload);
    }

    public static toProto(
        response: ListPartyToKeyMappingResponse,
    ): GrpcListPartyToKeyMappingResponse {
        return {
            results: response.results.map((result) => ({
                context: baseResultToProto(result.context),
                item: partyToKeyMappingToProto(result.item),
            })),
        };
    }

    public static fromBinary(bytes: Uint8Array): ListPartyToKeyMappingResponse {
        return ListPartyToKeyMappingResponseCodec.fromProto(
            GrpcListPartyToKeyMappingResponse.fromBinary(bytes),
        );
    }

    public static toBinary(response: ListPartyToKeyMappingResponse): Uint8Array {
        return GrpcListPartyToKeyMappingResponse.toBinary(
            ListPartyToKeyMappingResponseCodec.toProto(response),
        );
    }
}

/** Converts ListPartyToParticipantResponse between raw topology-read protobuf and the normalized SDK shape. */
export class ListPartyToParticipantResponseCodec {
    private constructor() {}

    public static fromProto(
        payload: Partial<GrpcListPartyToParticipantResponse>,
    ): ListPartyToParticipantResponse {
        return mapGrpcListPartyToParticipantResponse(payload);
    }

    public static toProto(
        response: ListPartyToParticipantResponse,
    ): GrpcListPartyToParticipantResponse {
        return {
            results: response.results.map((result) => ({
                context: baseResultToProto(result.context),
                item: partyToParticipantToProto(result.item),
            })),
        };
    }

    public static fromBinary(bytes: Uint8Array): ListPartyToParticipantResponse {
        return ListPartyToParticipantResponseCodec.fromProto(
            GrpcListPartyToParticipantResponse.fromBinary(bytes),
        );
    }

    public static toBinary(response: ListPartyToParticipantResponse): Uint8Array {
        return GrpcListPartyToParticipantResponse.toBinary(
            ListPartyToParticipantResponseCodec.toProto(response),
        );
    }
}

function baseResultToProto(value?: TopologyBaseResult): BaseResult | undefined {
    if (value === undefined) {
        return undefined;
    }

    return {
        store: mapGrpcTopologyStoreId(value.storeId),
        sequenced: mapGrpcTimestamp(value.sequencedAt),
        validFrom: mapGrpcTimestamp(value.validFrom),
        validUntil: mapGrpcTimestamp(value.validUntil),
        operation: mapGrpcTopologyChangeOp(value.operation),
        transactionHash: new Uint8Array(value.transactionHash),
        serial: value.serial,
        signedByFingerprints: [...value.signedByFingerprints],
    };
}

function partyToKeyMappingToProto(value: PartyToKeyMapping): GrpcPartyToKeyMapping {
    return {
        party: value.party,
        threshold: value.threshold,
        signingKeys: value.signingKeys.map(signingPublicKeyToProto),
    };
}

function partyToParticipantToProto(value: PartyToParticipant): GrpcPartyToParticipant {
    return {
        party: value.party,
        threshold: value.threshold,
        participants: value.participants.map(hostingParticipantToProto),
        partySigningKeys: signingKeysWithThresholdToProto(value.partySigningKeys),
    };
}

function hostingParticipantToProto(
    value: PartyToParticipant["participants"][number],
): PartyToParticipant_HostingParticipant {
    return {
        participantUid: value.participantUid,
        permission: participantPermissionToProto(value.permission),
        onboarding: value.onboarding === undefined ? undefined : {},
    };
}

function signingKeysWithThresholdToProto(
    value?: TopologySigningKeysWithThreshold,
): GrpcSigningKeysWithThreshold | undefined {
    if (value === undefined) {
        return undefined;
    }

    return {
        threshold: value.threshold,
        keys: value.keys.map(signingPublicKeyToProto),
    };
}

// The wire format carries no fingerprint (reads recompute it) and the deprecated scheme is never emitted.
function signingPublicKeyToProto(value: TopologySigningPublicKey): GrpcSigningPublicKey {
    return {
        format: cryptoKeyFormatToProto(value.format),
        publicKey: new Uint8Array(value.publicKey),
        scheme: SigningKeyScheme.UNSPECIFIED,
        usage: value.usage.map(signingKeyUsageToProto),
        keySpec: signingKeySpecToProto(value.keySpec),
    };
}

function participantPermissionToProto(
    value?: ParticipantPermission,
): Enums_ParticipantPermission {
    switch (value) {
        case ParticipantPermission.submission:
            return Enums_ParticipantPermission.SUBMISSION;
        case ParticipantPermission.confirmation:
            return Enums_ParticipantPermission.CONFIRMATION;
        case ParticipantPermission.observation:
            return Enums_ParticipantPermission.OBSERVATION;
        case ParticipantPermission.unspecified:
        default:
            return Enums_ParticipantPermission.UNSPECIFIED;
    }
}

function cryptoKeyFormatToProto(value?: string): CryptoKeyFormat {
    switch (value) {
        case "der":
            return CryptoKeyFormat.DER;
        case "raw":
            return CryptoKeyFormat.RAW;
        case "derX509SubjectPublicKeyInfo":
            return CryptoKeyFormat.DER_X509_SUBJECT_PUBLIC_KEY_INFO;
        case "derPkcs8PrivateKeyInfo":
            return CryptoKeyFormat.DER_PKCS8_PRIVATE_KEY_INFO;
        case "symbolic":
            return CryptoKeyFormat.SYMBOLIC;
        default:
            return CryptoKeyFormat.UNSPECIFIED;
    }
}

function signingKeyUsageToProto(value: string): SigningKeyUsage {
    switch (value) {
        case "namespace":
            return SigningKeyUsage.NAMESPACE;
        case "identityDelegation":
            return SigningKeyUsage.IDENTITY_DELEGATION;
        case "sequencerAuthentication":
            return SigningKeyUsage.SEQUENCER_AUTHENTICATION;
        case "protocol":
            return SigningKeyUsage.PROTOCOL;
        case "proofOfOwnership":
            return SigningKeyUsage.PROOF_OF_OWNERSHIP;
        default:
            return SigningKeyUsage.UNSPECIFIED;
    }
}

function signingKeySpecToProto(value?: string): SigningKeySpec {
    switch (value) {
        case "ecCurve25519":
            return SigningKeySpec.EC_CURVE25519;
        case "ecP256":
            return SigningKeySpec.EC_P256;
        case "ecP384":
            return SigningKeySpec.EC_P384;
        case "ecSecp256k1":
            return SigningKeySpec.EC_SECP256K1;
        case "mlDsa65":
            return SigningKeySpec.ML_DSA_65;
        default:
            return SigningKeySpec.UNSPECIFIED;
    }
}
