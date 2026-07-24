import { ValidationError } from "../../../core/errors/validation-error.js";
import { AddTopologyTransactionsRequest } from "../../../core/types/requests/add-topology-transactions-request.js";
import {
    AuthorizeTopologyTransactionsProposal,
    AuthorizeTopologyTransactionsRequest,
} from "../../../core/types/requests/authorize-topology-transactions-request.js";
import { CreateTemporaryTopologyStoreRequest } from "../../../core/types/requests/create-temporary-topology-store-request.js";
import { DropTemporaryTopologyStoreRequest } from "../../../core/types/requests/drop-temporary-topology-store-request.js";
import {
    GenerateTopologyTransactionsProposal,
    GenerateTopologyTransactionsRequest,
} from "../../../core/types/requests/generate-topology-transactions-request.js";
import { ImportTopologySnapshotRequest } from "../../../core/types/requests/import-topology-snapshot-request.js";
import { ImportTopologySnapshotV2Request } from "../../../core/types/requests/import-topology-snapshot-v2-request.js";
import { SignTopologyTransactionsRequest } from "../../../core/types/requests/sign-topology-transactions-request.js";
import { AddTopologyTransactionsResponse } from "../../../core/types/responses/add-topology-transactions-response.js";
import { AuthorizeTopologyTransactionsResponse } from "../../../core/types/responses/authorize-topology-transactions-response.js";
import { CreateTemporaryTopologyStoreResponse } from "../../../core/types/responses/create-temporary-topology-store-response.js";
import { DropTemporaryTopologyStoreResponse } from "../../../core/types/responses/drop-temporary-topology-store-response.js";
import { GenerateTopologyTransactionsResponse } from "../../../core/types/responses/generate-topology-transactions-response.js";
import { ImportTopologySnapshotResponse } from "../../../core/types/responses/import-topology-snapshot-response.js";
import { ImportTopologySnapshotV2Response } from "../../../core/types/responses/import-topology-snapshot-v2-response.js";
import { SignTopologyTransactionsResponse } from "../../../core/types/responses/sign-topology-transactions-response.js";
import { GeneratedTopologyTransaction } from "../../../core/types/topology/generated-topology-transaction.js";
import { DecentralizedNamespaceDefinition } from "../../../core/types/topology/decentralized-namespace-definition.js";
import { MultiTopologyTransactionSignature } from "../../../core/types/topology/multi-topology-transaction-signature.js";
import {
    NamespaceDelegation,
    NamespaceDelegationRestrictionKind,
} from "../../../core/types/topology/namespace-delegation.js";
import {
    PartyToParticipant,
    PartyToParticipantOnboarding,
    PartyToParticipantParticipant,
} from "../../../core/types/topology/party-to-participant.js";
import { SignedTopologyTransaction } from "../../../core/types/topology/signed-topology-transaction.js";
import { TopologyDuration } from "../../../core/types/topology/topology-duration.js";
import { TopologyForceFlag } from "../../../core/types/topology/topology-force-flag.js";
import { TopologyMapping } from "../../../core/types/topology/topology-mapping.js";
import { TopologySignatureDelegation } from "../../../core/types/topology/topology-signature-delegation.js";
import { TopologySigningKeysWithThreshold, TopologySigningPublicKey } from "../../../core/types/topology/topology-public-key.js";
import { TopologyStoreId, TopologyStoreKind, TopologyStoreTemporary } from "../../../core/types/topology/topology-store-id.js";
import { TopologyTransactionSignature } from "../../../core/types/topology/topology-transaction-signature.js";
import { Duration } from "../generated/canton/google/protobuf/duration.js";
import {
    CryptoKeyFormat,
    Signature as GrpcSignature,
    SignatureDelegation as GrpcSignatureDelegation,
    SignatureFormat as GrpcSignatureFormat,
    SigningAlgorithmSpec,
    SigningKeyScheme,
    SigningKeySpec,
    SigningKeysWithThreshold,
    SigningKeyUsage,
} from "../generated/canton/com/digitalasset/canton/crypto/v30/crypto.js";
import {
    StoreId,
    StoreId_Temporary,
} from "../generated/canton/com/digitalasset/canton/topology/admin/v30/common.js";
import {
    AddTransactionsRequest as GrpcAddTransactionsRequest,
    AddTransactionsResponse as GrpcAddTransactionsResponse,
    AuthorizeRequest as GrpcAuthorizeRequest,
    AuthorizeRequest_Proposal as GrpcAuthorizeRequestProposal,
    AuthorizeResponse as GrpcAuthorizeResponse,
    CreateTemporaryTopologyStoreRequest as GrpcCreateTemporaryTopologyStoreRequest,
    CreateTemporaryTopologyStoreResponse as GrpcCreateTemporaryTopologyStoreResponse,
    DropTemporaryTopologyStoreRequest as GrpcDropTemporaryTopologyStoreRequest,
    DropTemporaryTopologyStoreResponse as GrpcDropTemporaryTopologyStoreResponse,
    ForceFlag,
    GenerateTransactionsRequest as GrpcGenerateTransactionsRequest,
    GenerateTransactionsRequest_Proposal as GrpcGenerateTransactionsProposal,
    GenerateTransactionsResponse as GrpcGenerateTransactionsResponse,
    ImportTopologySnapshotRequest as GrpcImportTopologySnapshotRequest,
    ImportTopologySnapshotResponse as GrpcImportTopologySnapshotResponse,
    ImportTopologySnapshotV2Request as GrpcImportTopologySnapshotV2Request,
    ImportTopologySnapshotV2Response as GrpcImportTopologySnapshotV2Response,
    SignTransactionsRequest as GrpcSignTransactionsRequest,
    SignTransactionsResponse as GrpcSignTransactionsResponse,
} from "../generated/canton/com/digitalasset/canton/topology/admin/v30/topology_manager_write_service.js";
import {
    DecentralizedNamespaceDefinition as GrpcDecentralizedNamespaceDefinition,
    Enums_ParticipantPermission,
    NamespaceDelegation as GrpcNamespaceDelegation,
    PartyToParticipant as GrpcPartyToParticipant,
    SignedTopologyTransaction as GrpcSignedTopologyTransaction,
    TopologyMapping as GrpcTopologyMapping,
    MultiTransactionSignatures as GrpcMultiTransactionSignatures,
} from "../generated/canton/com/digitalasset/canton/protocol/v30/topology.js";
import {
    mapGrpcTopologyChangeOp,
    mapGrpcTopologyMappingCode,
    mapGrpcTopologyStoreId,
    mapSdkParticipantPermission,
} from "./topology-common-mapper.js";

export function mapGrpcGenerateTopologyTransactionsRequest(
    request: GenerateTopologyTransactionsRequest,
): GrpcGenerateTransactionsRequest {
    return {
        proposals: request.proposals.map(mapGrpcGenerateTopologyTransactionsProposal),
    };
}

export function mapGrpcGenerateTopologyTransactionsResponse(
    payload: Partial<GrpcGenerateTransactionsResponse>,
): GenerateTopologyTransactionsResponse {
    return new GenerateTopologyTransactionsResponse({
        generatedTransactions: (payload.generatedTransactions ?? []).map(
            (item) =>
                new GeneratedTopologyTransaction({
                    serializedTransaction: item.serializedTransaction,
                    transactionHash: item.transactionHash,
                }),
        ),
    });
}

export function mapGrpcAuthorizeTopologyTransactionsRequest(
    request: AuthorizeTopologyTransactionsRequest,
): GrpcAuthorizeRequest {
    return {
        type:
            request.proposal !== undefined
                ? {
                    oneofKind: "proposal",
                    proposal: mapGrpcAuthorizeTopologyTransactionsProposal(
                        request.proposal,
                    ),
                }
                : request.transactionHash !== undefined
                  ? {
                        oneofKind: "transactionHash",
                        transactionHash: request.transactionHash,
                    }
                  : {
                        oneofKind: undefined,
                    },
        mustFullyAuthorize: request.mustFullyAuthorize,
        forceChanges: request.forceChanges.map(mapGrpcForceFlag),
        signedBy: [...request.signedBy],
        store: mapGrpcTopologyStoreId(request.store),
        waitToBecomeEffective: mapGrpcDuration(request.waitToBecomeEffective),
    };
}

export function mapGrpcAuthorizeTopologyTransactionsResponse(
    payload: Partial<GrpcAuthorizeResponse>,
): AuthorizeTopologyTransactionsResponse {
    return new AuthorizeTopologyTransactionsResponse({
        transaction:
            payload.transaction === undefined
                ? undefined
                : mapSdkSignedTopologyTransaction(payload.transaction),
    });
}

export function mapGrpcAddTopologyTransactionsRequest(
    request: AddTopologyTransactionsRequest,
): GrpcAddTransactionsRequest {
    return {
        transactions: request.transactions.map(mapGrpcSignedTopologyTransaction),
        forceChanges: request.forceChanges.map(mapGrpcForceFlag),
        store: mapGrpcTopologyStoreId(request.store),
        waitToBecomeEffective: mapGrpcDuration(request.waitToBecomeEffective),
    };
}

export function mapGrpcAddTopologyTransactionsResponse(
    _payload: Partial<GrpcAddTransactionsResponse>,
): AddTopologyTransactionsResponse {
    return new AddTopologyTransactionsResponse();
}

export function mapGrpcImportTopologySnapshotRequest(
    request: ImportTopologySnapshotRequest,
): GrpcImportTopologySnapshotRequest {
    return {
        topologySnapshot: new Uint8Array(request.topologySnapshot),
        store: mapGrpcTopologyStoreId(request.store),
        waitToBecomeEffective: mapGrpcDuration(request.waitToBecomeEffective),
    };
}

export function mapGrpcImportTopologySnapshotResponse(
    _payload: Partial<GrpcImportTopologySnapshotResponse>,
): ImportTopologySnapshotResponse {
    return new ImportTopologySnapshotResponse();
}

export function mapGrpcImportTopologySnapshotV2Request(
    request: ImportTopologySnapshotV2Request,
): GrpcImportTopologySnapshotV2Request {
    return {
        topologySnapshot: new Uint8Array(request.topologySnapshot),
        store: mapGrpcTopologyStoreId(request.store),
        waitToBecomeEffective: mapGrpcDuration(request.waitToBecomeEffective),
    };
}

export function mapGrpcImportTopologySnapshotV2Response(
    _payload: Partial<GrpcImportTopologySnapshotV2Response>,
): ImportTopologySnapshotV2Response {
    return new ImportTopologySnapshotV2Response();
}

export function mapGrpcSignTopologyTransactionsRequest(
    request: SignTopologyTransactionsRequest,
): GrpcSignTransactionsRequest {
    return {
        transactions: request.transactions.map(mapGrpcSignedTopologyTransaction),
        signedBy: [...request.signedBy],
        store: mapGrpcTopologyStoreId(request.store),
        forceFlags: request.forceFlags.map(mapGrpcForceFlag),
    };
}

export function mapGrpcSignTopologyTransactionsResponse(
    payload: Partial<GrpcSignTransactionsResponse>,
): SignTopologyTransactionsResponse {
    return new SignTopologyTransactionsResponse({
        transactions: (payload.transactions ?? []).map(
            mapSdkSignedTopologyTransaction,
        ),
    });
}

export function mapGrpcCreateTemporaryTopologyStoreRequest(
    request: CreateTemporaryTopologyStoreRequest,
): GrpcCreateTemporaryTopologyStoreRequest {
    return {
        name: request.name,
        protocolVersion: request.protocolVersion,
    };
}

export function mapGrpcCreateTemporaryTopologyStoreResponse(
    payload: Partial<GrpcCreateTemporaryTopologyStoreResponse>,
): CreateTemporaryTopologyStoreResponse {
    return new CreateTemporaryTopologyStoreResponse({
        storeId:
            payload.storeId === undefined
                ? undefined
                : new TopologyStoreTemporary({
                    name: payload.storeId.name,
                }),
    });
}

export function mapGrpcDropTemporaryTopologyStoreRequest(
    request: DropTemporaryTopologyStoreRequest,
): GrpcDropTemporaryTopologyStoreRequest {
    return {
        storeId: mapGrpcTemporaryStoreId(request.storeId),
    };
}

export function mapGrpcDropTemporaryTopologyStoreResponse(
    _payload: Partial<GrpcDropTemporaryTopologyStoreResponse>,
): DropTemporaryTopologyStoreResponse {
    return new DropTemporaryTopologyStoreResponse();
}

function mapGrpcGenerateTopologyTransactionsProposal(
    proposal: GenerateTopologyTransactionsProposal,
): GrpcGenerateTransactionsProposal {
    return {
        operation: mapGrpcTopologyChangeOp(proposal.operation),
        serial: proposal.serial,
        mapping: mapGrpcTopologyMapping(proposal.mapping),
        store: mapGrpcTopologyStoreId(proposal.store),
    };
}

function mapGrpcAuthorizeTopologyTransactionsProposal(
    proposal: AuthorizeTopologyTransactionsProposal,
): GrpcAuthorizeRequestProposal {
    return {
        change: mapGrpcTopologyChangeOp(proposal.operation),
        serial: proposal.serial,
        mapping: mapGrpcTopologyMapping(proposal.mapping),
    };
}

function mapGrpcTopologyMapping(
    mapping?: TopologyMapping,
): GrpcTopologyMapping | undefined {
    if (mapping === undefined) {
        return undefined;
    } else if (mapping instanceof PartyToParticipant) {
        return {
            mapping: {
                oneofKind: "partyToParticipant",
                partyToParticipant: mapGrpcPartyToParticipant(mapping),
            },
        };
    } else if (mapping instanceof DecentralizedNamespaceDefinition) {
        return {
            mapping: {
                oneofKind: "decentralizedNamespaceDefinition",
                decentralizedNamespaceDefinition:
                    mapGrpcDecentralizedNamespaceDefinition(mapping),
            },
        };
    } else if (mapping instanceof NamespaceDelegation) {
        return {
            mapping: {
                oneofKind: "namespaceDelegation",
                namespaceDelegation: mapGrpcNamespaceDelegation(mapping),
            },
        };
    }

    throw new ValidationError(
        `Unsupported topology write mapping type: ${mapping.constructor.name}.`,
    );
}

function mapGrpcDecentralizedNamespaceDefinition(
    value: DecentralizedNamespaceDefinition,
): GrpcDecentralizedNamespaceDefinition {
    return {
        decentralizedNamespace: value.decentralizedNamespace,
        threshold: value.threshold,
        owners: [...value.owners],
    };
}

function mapGrpcNamespaceDelegation(
    value: NamespaceDelegation,
): GrpcNamespaceDelegation {
    return {
        namespace: value.namespace,
        targetKey:
            value.targetKey === undefined
                ? undefined
                : mapGrpcSigningPublicKey(value.targetKey),
        isRootDelegation: value.isRootDelegation,
        restriction: mapGrpcNamespaceDelegationRestriction(value),
    };
}

function mapGrpcNamespaceDelegationRestriction(
    value: NamespaceDelegation,
): GrpcNamespaceDelegation["restriction"] {
    switch (value.restriction?.kind) {
        case NamespaceDelegationRestrictionKind.canSignAllMappings:
            return {
                oneofKind: "canSignAllMappings",
                canSignAllMappings: {},
            };
        case NamespaceDelegationRestrictionKind.canSignAllButNamespaceDelegations:
            return {
                oneofKind: "canSignAllButNamespaceDelegations",
                canSignAllButNamespaceDelegations: {},
            };
        case NamespaceDelegationRestrictionKind.canSignSpecificMappings:
            return {
                oneofKind: "canSignSpecificMapings",
                canSignSpecificMapings: {
                    mappings: value.restriction.mappings.map(
                        mapGrpcTopologyMappingCode,
                    ),
                },
            };
        default:
            return { oneofKind: undefined };
    }
}

function mapGrpcPartyToParticipant(
    value: PartyToParticipant,
): GrpcPartyToParticipant {
    return {
        party: value.party,
        threshold: value.threshold,
        participants: value.participants.map(mapGrpcPartyToParticipantParticipant),
        partySigningKeys: mapGrpcSigningKeysWithThreshold(value.partySigningKeys),
    };
}

function mapGrpcPartyToParticipantParticipant(
    value: PartyToParticipantParticipant,
): GrpcPartyToParticipant["participants"][number] {
    return {
        participantUid: value.participantUid,
        permission: mapGrpcParticipantPermission(value.permission),
        onboarding:
            value.onboarding instanceof PartyToParticipantOnboarding
                ? {}
                : undefined,
    };
}

function mapGrpcSigningKeysWithThreshold(
    value?: TopologySigningKeysWithThreshold,
): SigningKeysWithThreshold | undefined {
    if (value === undefined) {
        return undefined;
    }

    return {
        threshold: value.threshold,
        keys: value.keys.map(mapGrpcSigningPublicKey),
    };
}

function mapGrpcSigningPublicKey(
    value: TopologySigningPublicKey,
): SigningKeysWithThreshold["keys"][number] {
    return {
        format: mapGrpcCryptoKeyFormat(value.format),
        publicKey: new Uint8Array(value.publicKey),
        scheme: mapGrpcSigningKeyScheme(value.scheme, value.keySpec),
        usage: value.usage.map(mapGrpcSigningKeyUsage),
        keySpec: mapGrpcSigningKeySpec(value.keySpec),
    };
}

function mapGrpcSignedTopologyTransaction(
    value: SignedTopologyTransaction,
): GrpcSignedTopologyTransaction {
    return {
        transaction: new Uint8Array(value.transaction),
        signatures: value.signatures.map(mapGrpcTopologyTransactionSignature),
        proposal: value.proposal,
        multiTransactionSignatures: value.multiTransactionSignatures.map(
            mapGrpcMultiTopologyTransactionSignature,
        ),
    };
}

function mapSdkSignedTopologyTransaction(
    value: Partial<GrpcSignedTopologyTransaction>,
): SignedTopologyTransaction {
    return new SignedTopologyTransaction({
        transaction: value.transaction,
        signatures: (value.signatures ?? []).map(
            mapSdkTopologyTransactionSignature,
        ),
        proposal: value.proposal ?? false,
        multiTransactionSignatures: (value.multiTransactionSignatures ?? []).map(
            mapSdkMultiTopologyTransactionSignature,
        ),
    });
}

function mapGrpcTopologyTransactionSignature(
    value: TopologyTransactionSignature,
): GrpcSignature {
    return {
        format: mapGrpcSignatureFormat(value.format),
        signature: new Uint8Array(value.signature),
        signedBy: value.signedByFingerprint,
        signingAlgorithmSpec: mapGrpcSigningAlgorithmSpec(
            value.signingAlgorithmSpec,
        ),
        signatureDelegation:
            value.signatureDelegation === undefined
                ? undefined
                : mapGrpcSignatureDelegation(value.signatureDelegation),
    };
}

function mapSdkTopologyTransactionSignature(
    value: Partial<GrpcSignature>,
): TopologyTransactionSignature {
    return new TopologyTransactionSignature({
        format: mapSdkSignatureFormat(value.format),
        signature: value.signature,
        signedByFingerprint: value.signedBy ?? "",
        signingAlgorithmSpec: mapSdkSigningAlgorithmSpec(
            value.signingAlgorithmSpec,
        ),
        signatureDelegation:
            value.signatureDelegation === undefined
                ? undefined
                : mapSdkSignatureDelegation(value.signatureDelegation),
    });
}

function mapGrpcMultiTopologyTransactionSignature(
    value: MultiTopologyTransactionSignature,
): GrpcMultiTransactionSignatures {
    return {
        transactionHashes: value.transactionHashes.map(
            (item) => new Uint8Array(item),
        ),
        signatures: value.signatures.map(mapGrpcTopologyTransactionSignature),
    };
}

function mapSdkMultiTopologyTransactionSignature(
    value: Partial<GrpcMultiTransactionSignatures>,
): MultiTopologyTransactionSignature {
    return new MultiTopologyTransactionSignature({
        transactionHashes: (value.transactionHashes ?? []).map(
            (item) => new Uint8Array(item),
        ),
        signatures: (value.signatures ?? []).map(
            mapSdkTopologyTransactionSignature,
        ),
    });
}

function mapGrpcSignatureDelegation(
    value: TopologySignatureDelegation,
): GrpcSignatureDelegation {
    return {
        sessionKey: new Uint8Array(value.sessionKey),
        sessionKeySpec: mapGrpcSigningKeySpec(value.sessionKeySpec),
        validityPeriodFromInclusive: value.validityPeriodFromInclusive,
        validityPeriodDurationSeconds: value.validityPeriodDurationSeconds,
        format: mapGrpcSignatureFormat(value.format),
        signature: new Uint8Array(value.signature),
        signingAlgorithmSpec: mapGrpcSigningAlgorithmSpec(
            value.signingAlgorithmSpec,
        ),
    };
}

function mapSdkSignatureDelegation(
    value: Partial<GrpcSignatureDelegation>,
): TopologySignatureDelegation {
    return new TopologySignatureDelegation({
        sessionKey: value.sessionKey,
        sessionKeySpec: mapSdkSigningKeySpec(value.sessionKeySpec),
        validityPeriodFromInclusive: value.validityPeriodFromInclusive ?? "0",
        validityPeriodDurationSeconds:
            value.validityPeriodDurationSeconds ?? 0,
        format: mapSdkSignatureFormat(value.format),
        signature: value.signature,
        signingAlgorithmSpec: mapSdkSigningAlgorithmSpec(
            value.signingAlgorithmSpec,
        ),
    });
}

function mapGrpcDuration(value?: TopologyDuration): Duration | undefined {
    if (value === undefined) {
        return undefined;
    }

    return {
        seconds: value.seconds,
        nanos: value.nanos,
    };
}

function mapGrpcForceFlag(value: TopologyForceFlag): ForceFlag {
    switch (value) {
        case TopologyForceFlag.alienMember:
            return ForceFlag.ALIEN_MEMBER;
        case TopologyForceFlag.ledgerTimeRecordTimeToleranceIncrease:
            return ForceFlag.LEDGER_TIME_RECORD_TIME_TOLERANCE_INCREASE;
        case TopologyForceFlag.allowUnknownPackage:
            return ForceFlag.ALLOW_UNKNOWN_PACKAGE;
        case TopologyForceFlag.allowUnvettedDependencies:
            return ForceFlag.ALLOW_UNVETTED_DEPENDENCIES;
        case TopologyForceFlag.disablePartyWithActiveContracts:
            return ForceFlag.DISABLE_PARTY_WITH_ACTIVE_CONTRACTS;
        case TopologyForceFlag.unspecified:
        default:
            return ForceFlag.UNSPECIFIED;
    }
}

function mapGrpcParticipantPermission(
    value: PartyToParticipantParticipant["permission"],
): Enums_ParticipantPermission {
    switch (value) {
        case "submission":
            return Enums_ParticipantPermission.SUBMISSION;
        case "confirmation":
            return Enums_ParticipantPermission.CONFIRMATION;
        case "observation":
            return Enums_ParticipantPermission.OBSERVATION;
        case "unspecified":
        default:
            return Enums_ParticipantPermission.UNSPECIFIED;
    }
}

function mapGrpcSignatureFormat(value?: string): GrpcSignatureFormat {
    switch (value) {
        case "raw":
            return GrpcSignatureFormat.RAW;
        case "der":
            return GrpcSignatureFormat.DER;
        case "concat":
            return GrpcSignatureFormat.CONCAT;
        case "symbolic":
            return GrpcSignatureFormat.SYMBOLIC;
        default:
            return GrpcSignatureFormat.UNSPECIFIED;
    }
}

function mapSdkSignatureFormat(value?: GrpcSignatureFormat): string | undefined {
    switch (value) {
        case GrpcSignatureFormat.RAW:
            return "raw";
        case GrpcSignatureFormat.DER:
            return "der";
        case GrpcSignatureFormat.CONCAT:
            return "concat";
        case GrpcSignatureFormat.SYMBOLIC:
            return "symbolic";
        case GrpcSignatureFormat.UNSPECIFIED:
        default:
            return "unspecified";
    }
}

function mapGrpcSigningAlgorithmSpec(value?: string): SigningAlgorithmSpec {
    switch (value) {
        case "ed25519":
            return SigningAlgorithmSpec.ED25519;
        case "ecDsaSha256":
            return SigningAlgorithmSpec.EC_DSA_SHA_256;
        case "ecDsaSha384":
            return SigningAlgorithmSpec.EC_DSA_SHA_384;
        case "mlDsa65":
            return SigningAlgorithmSpec.ML_DSA_65;
        default:
            return SigningAlgorithmSpec.UNSPECIFIED;
    }
}

function mapSdkSigningAlgorithmSpec(
    value?: SigningAlgorithmSpec,
): string | undefined {
    switch (value) {
        case SigningAlgorithmSpec.ED25519:
            return "ed25519";
        case SigningAlgorithmSpec.EC_DSA_SHA_256:
            return "ecDsaSha256";
        case SigningAlgorithmSpec.EC_DSA_SHA_384:
            return "ecDsaSha384";
        case SigningAlgorithmSpec.ML_DSA_65:
            return "mlDsa65";
        case SigningAlgorithmSpec.UNSPECIFIED:
        default:
            return "unspecified";
    }
}

function mapGrpcCryptoKeyFormat(value?: string): CryptoKeyFormat {
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

function mapGrpcSigningKeyUsage(value: string): SigningKeyUsage {
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

function mapGrpcSigningKeySpec(value?: string): SigningKeySpec {
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

function mapGrpcSigningKeyScheme(
    scheme?: string,
    keySpec?: string,
): SigningKeyScheme {
    switch (scheme ?? keySpec) {
        case "ed25519":
        case "ecCurve25519":
            return SigningKeyScheme.ED25519;
        case "ecDsaP256":
        case "ecP256":
            return SigningKeyScheme.EC_DSA_P256;
        case "ecDsaP384":
        case "ecP384":
            return SigningKeyScheme.EC_DSA_P384;
        default:
            return SigningKeyScheme.UNSPECIFIED;
    }
}

function mapSdkSigningKeySpec(value?: SigningKeySpec): string | undefined {
    switch (value) {
        case SigningKeySpec.EC_CURVE25519:
            return "ecCurve25519";
        case SigningKeySpec.EC_P256:
            return "ecP256";
        case SigningKeySpec.EC_P384:
            return "ecP384";
        case SigningKeySpec.EC_SECP256K1:
            return "ecSecp256k1";
        case SigningKeySpec.ML_DSA_65:
            return "mlDsa65";
        case SigningKeySpec.UNSPECIFIED:
        default:
            return "unspecified";
    }
}

function mapGrpcTemporaryStoreId(
    value?: TopologyStoreTemporary,
): StoreId_Temporary | undefined {
    if (value === undefined) {
        return undefined;
    }

    return {
        name: value.name,
    };
}
