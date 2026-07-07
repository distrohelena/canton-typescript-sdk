import { AllocateExternalPartyRequest as SdkAllocateExternalPartyRequest } from "../../../core/types/requests/allocate-external-party-request.js";
import { GenerateExternalPartyTopologyRequest as SdkGenerateExternalPartyTopologyRequest } from "../../../core/types/requests/generate-external-party-topology-request.js";
import { ExternalPartyCryptoKeyFormat } from "../../../core/types/external-party/external-party-crypto-key-format.js";
import { ExternalPartySignatureFormat } from "../../../core/types/external-party/external-party-signature-format.js";
import { ExternalPartySigningAlgorithmSpec } from "../../../core/types/external-party/external-party-signing-algorithm-spec.js";
import { ExternalPartySigningKeySpec } from "../../../core/types/external-party/external-party-signing-key-spec.js";
import { AllocateExternalPartyResponse as SdkAllocateExternalPartyResponse } from "../../../core/types/responses/allocate-external-party-response.js";
import { GenerateExternalPartyTopologyResponse as SdkGenerateExternalPartyTopologyResponse } from "../../../core/types/responses/generate-external-party-topology-response.js";
import {
    AllocateExternalPartyRequest,
    AllocateExternalPartyRequest_SignedTransaction,
    AllocateExternalPartyResponse,
    GenerateExternalPartyTopologyRequest,
    GenerateExternalPartyTopologyResponse,
} from "../generated/canton/com/daml/ledger/api/v2/admin/party_management_service.js";
import {
    CryptoKeyFormat,
    Signature,
    SignatureFormat,
    SigningAlgorithmSpec,
    SigningKeySpec,
    SigningPublicKey,
} from "../generated/canton/com/daml/ledger/api/v2/crypto.js";

export function mapGrpcGenerateExternalPartyTopologyRequest(
    request: SdkGenerateExternalPartyTopologyRequest,
): GenerateExternalPartyTopologyRequest {
    return {
        synchronizer: request.synchronizer,
        partyHint: request.partyHint,
        publicKey:
            request.publicKey === undefined
                ? undefined
                : mapGrpcExternalPartySigningPublicKey(request.publicKey),
        localParticipantObservationOnly:
            request.localParticipantObservationOnly,
        otherConfirmingParticipantUids: [
            ...request.otherConfirmingParticipantUids,
        ],
        confirmationThreshold: request.confirmationThreshold,
        observingParticipantUids: [...request.observingParticipantUids],
    };
}

export function mapGrpcGenerateExternalPartyTopologyResponse(
    response: GenerateExternalPartyTopologyResponse,
): SdkGenerateExternalPartyTopologyResponse {
    return new SdkGenerateExternalPartyTopologyResponse({
        partyId: response.partyId,
        publicKeyFingerprint: response.publicKeyFingerprint,
        topologyTransactions: response.topologyTransactions,
        multiHash: response.multiHash,
    });
}

export function mapGrpcAllocateExternalPartyRequest(
    request: SdkAllocateExternalPartyRequest,
): AllocateExternalPartyRequest {
    return {
        synchronizer: request.synchronizer,
        onboardingTransactions: request.onboardingTransactions.map(
            item => mapGrpcExternalPartyOnboardingTransaction(item),
        ),
        multiHashSignatures: request.multiHashSignatures.map(
            item => mapGrpcExternalPartySignature(item),
        ),
        identityProviderId: request.identityProviderId ?? "",
        waitForAllocation: request.waitForAllocation,
        userId: request.userId ?? "",
    };
}

export function mapGrpcAllocateExternalPartyResponse(
    response: AllocateExternalPartyResponse,
): SdkAllocateExternalPartyResponse {
    return new SdkAllocateExternalPartyResponse({
        partyId: response.partyId,
    });
}

function mapGrpcExternalPartyOnboardingTransaction(
    transaction: SdkAllocateExternalPartyRequest["onboardingTransactions"][number],
): AllocateExternalPartyRequest_SignedTransaction {
    return {
        transaction: transaction.transaction,
        signatures: transaction.signatures.map(
            item => mapGrpcExternalPartySignature(item),
        ),
    };
}

function mapGrpcExternalPartySigningPublicKey(
    publicKey: NonNullable<SdkGenerateExternalPartyTopologyRequest["publicKey"]>,
): SigningPublicKey {
    return {
        format: mapGrpcExternalPartyCryptoKeyFormat(publicKey.format),
        keyData: publicKey.keyData,
        keySpec: mapGrpcExternalPartySigningKeySpec(publicKey.keySpec),
    };
}

function mapGrpcExternalPartySignature(
    signature: SdkAllocateExternalPartyRequest["multiHashSignatures"][number],
): Signature {
    return {
        format: mapGrpcExternalPartySignatureFormat(signature.format),
        signature: signature.signature,
        signedBy: signature.signedByFingerprint,
        signingAlgorithmSpec: mapGrpcExternalPartySigningAlgorithmSpec(
            signature.signingAlgorithmSpec,
        ),
    };
}

function mapGrpcExternalPartyCryptoKeyFormat(
    value: ExternalPartyCryptoKeyFormat,
): CryptoKeyFormat {
    switch (value) {
        case ExternalPartyCryptoKeyFormat.der:
            return CryptoKeyFormat.DER;
        case ExternalPartyCryptoKeyFormat.raw:
            return CryptoKeyFormat.RAW;
        case ExternalPartyCryptoKeyFormat.derX509SubjectPublicKeyInfo:
            return CryptoKeyFormat.DER_X509_SUBJECT_PUBLIC_KEY_INFO;
        case ExternalPartyCryptoKeyFormat.unspecified:
        default:
            return CryptoKeyFormat.UNSPECIFIED;
    }
}

function mapGrpcExternalPartySigningKeySpec(
    value: ExternalPartySigningKeySpec,
): SigningKeySpec {
    switch (value) {
        case ExternalPartySigningKeySpec.ecCurve25519:
            return SigningKeySpec.EC_CURVE25519;
        case ExternalPartySigningKeySpec.ecP256:
            return SigningKeySpec.EC_P256;
        case ExternalPartySigningKeySpec.ecP384:
            return SigningKeySpec.EC_P384;
        case ExternalPartySigningKeySpec.ecSecp256k1:
            return SigningKeySpec.EC_SECP256K1;
        case ExternalPartySigningKeySpec.mlDsa65:
            return SigningKeySpec.ML_DSA_65;
        case ExternalPartySigningKeySpec.unspecified:
        default:
            return SigningKeySpec.UNSPECIFIED;
    }
}

function mapGrpcExternalPartySignatureFormat(
    value: ExternalPartySignatureFormat,
): SignatureFormat {
    switch (value) {
        case ExternalPartySignatureFormat.raw:
            return SignatureFormat.RAW;
        case ExternalPartySignatureFormat.der:
            return SignatureFormat.DER;
        case ExternalPartySignatureFormat.concat:
            return SignatureFormat.CONCAT;
        case ExternalPartySignatureFormat.symbolic:
            return SignatureFormat.SYMBOLIC;
        case ExternalPartySignatureFormat.unspecified:
        default:
            return SignatureFormat.UNSPECIFIED;
    }
}

function mapGrpcExternalPartySigningAlgorithmSpec(
    value: ExternalPartySigningAlgorithmSpec,
): SigningAlgorithmSpec {
    switch (value) {
        case ExternalPartySigningAlgorithmSpec.ed25519:
            return SigningAlgorithmSpec.ED25519;
        case ExternalPartySigningAlgorithmSpec.ecDsaSha256:
            return SigningAlgorithmSpec.EC_DSA_SHA_256;
        case ExternalPartySigningAlgorithmSpec.ecDsaSha384:
            return SigningAlgorithmSpec.EC_DSA_SHA_384;
        case ExternalPartySigningAlgorithmSpec.mlDsa65:
            return SigningAlgorithmSpec.ML_DSA_65;
        case ExternalPartySigningAlgorithmSpec.unspecified:
        default:
            return SigningAlgorithmSpec.UNSPECIFIED;
    }
}
