import { ParticipantPermission } from "../../../core/types/topology/participant-permission.js";
import {
    ParticipantSynchronizerLimits,
    ParticipantSynchronizerPermission,
} from "../../../core/types/topology/participant-synchronizer-permission.js";
import {
    PartyToParticipant,
    PartyToParticipantOnboarding,
    PartyToParticipantParticipant,
} from "../../../core/types/topology/party-to-participant.js";
import {
    TopologyBaseQuery,
    TopologyTimeRange,
} from "../../../core/types/topology/topology-base-query.js";
import { TopologyBaseResult } from "../../../core/types/topology/topology-base-result.js";
import { TopologyDuration } from "../../../core/types/topology/topology-duration.js";
import { TopologyKeyOwnerResult } from "../../../core/types/topology/topology-key-owner-result.js";
import { TopologyMappingCode } from "../../../core/types/topology/topology-mapping-code.js";
import { TopologyMappingOperation } from "../../../core/types/topology/topology-mapping-operation.js";
import { TopologyMappingResult } from "../../../core/types/topology/topology-mapping-result.js";
import {
    TopologyPartyParticipant,
    TopologyPartyParticipantSynchronizerPermission,
    TopologyPartyResult,
} from "../../../core/types/topology/topology-party-result.js";
import {
    TopologyEncryptionPublicKey,
    TopologyPublicKey,
    TopologySigningKeysWithThreshold,
    TopologySigningPublicKey,
} from "../../../core/types/topology/topology-public-key.js";
import {
    TopologyStoreAuthorized,
    TopologyStoreId,
    TopologyStoreKind,
    TopologyStoreSynchronizer,
    TopologyStoreTemporary,
} from "../../../core/types/topology/topology-store-id.js";
import {
    TopologyTransactionItem,
    TopologyTransactions,
} from "../../../core/types/topology/topology-transactions.js";
import { TopologyVettedPackage } from "../../../core/types/topology/vetted-package.js";
import { TopologyVettedPackages } from "../../../core/types/topology/vetted-packages.js";
import {
    BaseQuery,
    BaseQuery_TimeRange,
    BaseResult,
    ListAllV2Response,
    ListAvailableStoresResponse,
    ListPartyToParticipantResponse,
    ListVettedPackagesResponse,
    StoreId,
} from "../generated/canton/com/digitalasset/canton/topology/admin/v30/topology_manager_read_service.js";
import {
    ListKeyOwnersResponse,
    ListPartiesResponse,
} from "../generated/canton/com/digitalasset/canton/topology/admin/v30/topology_aggregation_service.js";
import {
    EncryptionKeySpec,
    EncryptionPublicKey,
    PublicKey,
    SigningKeySpec,
    SigningKeyUsage,
    SigningPublicKey,
    SigningKeysWithThreshold,
    CryptoKeyFormat,
} from "../generated/canton/com/digitalasset/canton/crypto/v30/crypto.js";
import {
    DynamicSequencingParameters as GrpcDynamicSequencingParameters,
} from "../generated/canton/com/digitalasset/canton/protocol/v30/sequencing_parameters.js";
import {
    AcsCommitmentsCatchUpConfig,
    DynamicSynchronizerParameters,
    OnboardingRestriction,
    TrafficControlParameters,
} from "../generated/canton/com/digitalasset/canton/protocol/v30/synchronizer_parameters.js";
import {
    DecentralizedNamespaceDefinition,
    Enums_ParticipantPermission,
    Enums_ParticipantFeatureFlag,
    Enums_TopologyChangeOp,
    Enums_TopologyMappingCode,
    LsuAnnouncement,
    LsuSequencerConnectionSuccessor,
    MediatorSynchronizerState,
    NamespaceDelegation,
    OwnerToKeyMapping,
    PartyHostingLimits,
    PartyToKeyMapping,
    SequencerSynchronizerState,
    SynchronizerTrustCertificate,
} from "../generated/canton/com/digitalasset/canton/protocol/v30/topology.js";
import { Timestamp } from "../generated/canton/google/protobuf/timestamp.js";
import { Duration } from "../generated/canton/google/protobuf/duration.js";
import { DynamicSequencingParameters } from "../../../core/types/topology/dynamic-sequencing-parameters.js";
import {
    AcsCommitmentsCatchUpConfig as SdkAcsCommitmentsCatchUpConfig,
    DynamicSynchronizerParameters as SdkDynamicSynchronizerParameters,
    OnboardingRestriction as SdkOnboardingRestriction,
    TrafficControlParameters as SdkTrafficControlParameters,
} from "../../../core/types/topology/dynamic-synchronizer-parameters.js";
import { NamespaceDelegationRestriction, NamespaceDelegationRestrictionKind } from "../../../core/types/topology/namespace-delegation.js";
import { DecentralizedNamespaceDefinition as SdkDecentralizedNamespaceDefinition } from "../../../core/types/topology/decentralized-namespace-definition.js";
import { OwnerToKeyMapping as SdkOwnerToKeyMapping } from "../../../core/types/topology/owner-to-key-mapping.js";
import { PartyToKeyMapping as SdkPartyToKeyMapping } from "../../../core/types/topology/party-to-key-mapping.js";
import { SynchronizerTrustCertificate as SdkSynchronizerTrustCertificate } from "../../../core/types/topology/synchronizer-trust-certificate.js";
import { PartyHostingLimits as SdkPartyHostingLimits } from "../../../core/types/topology/party-hosting-limits.js";
import { LsuAnnouncement as SdkLsuAnnouncement } from "../../../core/types/topology/lsu-announcement.js";
import {
    LsuSequencerConnection,
    LsuSequencerConnectionSuccessor as SdkLsuSequencerConnectionSuccessor,
} from "../../../core/types/topology/lsu-sequencer-connection-successor.js";
import { MediatorSynchronizerState as SdkMediatorSynchronizerState } from "../../../core/types/topology/mediator-synchronizer-state.js";
import { SequencerSynchronizerState as SdkSequencerSynchronizerState } from "../../../core/types/topology/sequencer-synchronizer-state.js";
import { NamespaceDelegation as SdkNamespaceDelegation } from "../../../core/types/topology/namespace-delegation.js";

export function mapGrpcTopologyBaseQuery(
    query?: TopologyBaseQuery,
): BaseQuery | undefined {
    if (query === undefined) {
        return undefined;
    }

    return {
        store: mapGrpcTopologyStoreId(query.storeId),
        proposals: query.includeProposals,
        operation: mapGrpcTopologyChangeOp(query.operation),
        timeQuery:
            query.snapshot !== undefined
                ? {
                    oneofKind: "snapshot",
                    snapshot: mapGrpcTimestamp(query.snapshot),
                }
                : query.headState
                  ? {
                        oneofKind: "headState",
                        headState: {},
                    }
                  : query.timeRange !== undefined
                    ? {
                        oneofKind: "range",
                        range: mapGrpcTopologyTimeRange(query.timeRange),
                    }
                    : {
                        oneofKind: undefined,
                    },
        filterSignedKey: query.signedKeyFingerprint ?? "",
        protocolVersion: query.protocolVersion,
    };
}

export function mapGrpcTopologyBaseResult(
    payload?: Partial<BaseResult>,
): TopologyBaseResult {
    return new TopologyBaseResult({
        storeId: mapSdkTopologyStoreId(payload?.store),
        sequencedAt: mapSdkTimestamp(payload?.sequenced),
        validFrom: mapSdkTimestamp(payload?.validFrom),
        validUntil: mapSdkTimestamp(payload?.validUntil),
        operation: mapSdkTopologyChangeOp(payload?.operation),
        transactionHash: payload?.transactionHash ?? new Uint8Array(),
        serial: payload?.serial ?? 0,
        signedByFingerprints: [...(payload?.signedByFingerprints ?? [])],
    });
}

export function mapGrpcListPartyToParticipantResponse(
    payload: Partial<ListPartyToParticipantResponse>,
): { results: TopologyMappingResult<PartyToParticipant>[] } {
    return {
        results: (payload.results ?? []).map(
            (item) =>
                new TopologyMappingResult({
                    context: mapGrpcTopologyBaseResult(item.context),
                    item: mapSdkPartyToParticipant(item.item),
                }),
        ),
    };
}

export function mapGrpcListAvailableStoresResponse(
    payload: Partial<ListAvailableStoresResponse>,
): { storeIds: TopologyStoreId[] } {
    return {
        storeIds: (payload.storeIds ?? []).map((item) => mapSdkTopologyStoreId(item)!),
    };
}

export function mapGrpcListAllV2Response(
    payload: Partial<ListAllV2Response>,
): { result?: TopologyTransactions } {
    return {
        result:
            payload.result === undefined
                ? undefined
                : new TopologyTransactions({
                    items: (payload.result.items ?? []).map(
                        (item) =>
                            new TopologyTransactionItem({
                                sequencedAt: mapSdkTimestamp(item.sequenced),
                                validFrom: mapSdkTimestamp(item.validFrom),
                                validUntil: mapSdkTimestamp(item.validUntil),
                                transaction: item.transaction,
                                rejectionReason: item.rejectionReason,
                            }),
                    ),
                }),
    };
}

export function mapGrpcTopologyListPartiesResponse(
    payload: Partial<ListPartiesResponse>,
): { results: TopologyPartyResult[] } {
    return {
        results: (payload.results ?? []).map(
            (result) =>
                new TopologyPartyResult({
                    party: result.party ?? "",
                    participants: (result.participants ?? []).map(
                        (participant) =>
                            new TopologyPartyParticipant({
                                participantUid: participant.participantUid ?? "",
                                synchronizers: (participant.synchronizers ?? []).map(
                                    (item) =>
                                        new TopologyPartyParticipantSynchronizerPermission({
                                            synchronizerId: item.synchronizerId ?? "",
                                            permission: mapSdkParticipantPermission(
                                                item.permission,
                                            ),
                                            physicalSynchronizerId:
                                                item.physicalSynchronizerId ?? "",
                                        }),
                                ),
                            }),
                    ),
                }),
        ),
    };
}

export function mapGrpcListKeyOwnersResponse(
    payload: Partial<ListKeyOwnersResponse>,
): { results: TopologyKeyOwnerResult[] } {
    return {
        results: (payload.results ?? []).map(
            (item) =>
                new TopologyKeyOwnerResult({
                    synchronizerId: item.synchronizerId ?? "",
                    keyOwner: item.keyOwner ?? "",
                    signingKeys: (item.signingKeys ?? []).map(
                        mapSdkSigningPublicKey,
                    ),
                    encryptionKeys: (item.encryptionKeys ?? []).map(
                        mapSdkEncryptionPublicKey,
                    ),
                    physicalSynchronizerId: item.physicalSynchronizerId ?? "",
                }),
        ),
    };
}

export function mapGrpcTopologyStoreId(
    value?: TopologyStoreId,
): StoreId | undefined {
    if (value === undefined) {
        return undefined;
    }

    switch (value.kind) {
        case TopologyStoreKind.authorized:
            return {
                store: {
                    oneofKind: "authorized",
                    authorized: {},
                },
            };
        case TopologyStoreKind.synchronizer:
            return {
                store: {
                    oneofKind: "synchronizer",
                    synchronizer: {
                        kind:
                            value.synchronizer?.physicalId !== undefined
                                ? {
                                    oneofKind: "physicalId",
                                    physicalId: value.synchronizer.physicalId,
                                }
                                : {
                                    oneofKind: "id",
                                    id: value.synchronizer?.id ?? "",
                                },
                    },
                },
            };
        case TopologyStoreKind.temporary:
            return {
                store: {
                    oneofKind: "temporary",
                    temporary: {
                        name: value.temporary?.name ?? "",
                    },
                },
            };
        default:
            return undefined;
    }
}

export function mapSdkTopologyStoreId(
    payload?: Partial<StoreId>,
): TopologyStoreId | undefined {
    switch (payload?.store.oneofKind) {
        case "authorized":
            return new TopologyStoreId({
                kind: TopologyStoreKind.authorized,
                authorized: new TopologyStoreAuthorized(),
            });
        case "synchronizer":
            return new TopologyStoreId({
                kind: TopologyStoreKind.synchronizer,
                synchronizer: new TopologyStoreSynchronizer({
                    id:
                        payload.store.synchronizer.kind.oneofKind === "id"
                            ? payload.store.synchronizer.kind.id
                            : undefined,
                    physicalId:
                        payload.store.synchronizer.kind.oneofKind === "physicalId"
                            ? payload.store.synchronizer.kind.physicalId
                            : undefined,
                }),
            });
        case "temporary":
            return new TopologyStoreId({
                kind: TopologyStoreKind.temporary,
                temporary: new TopologyStoreTemporary({
                    name: payload.store.temporary.name,
                }),
            });
        default:
            return undefined;
    }
}

export function mapGrpcTopologyTimeRange(
    range: TopologyTimeRange,
): BaseQuery_TimeRange {
    return {
        from: mapGrpcTimestamp(range.from),
        until: mapGrpcTimestamp(range.until),
    };
}

export function mapGrpcTopologyChangeOp(
    value?: TopologyMappingOperation,
): Enums_TopologyChangeOp {
    switch (value) {
        case TopologyMappingOperation.addReplace:
            return Enums_TopologyChangeOp.ADD_REPLACE;
        case TopologyMappingOperation.remove:
            return Enums_TopologyChangeOp.REMOVE;
        case TopologyMappingOperation.unspecified:
        default:
            return Enums_TopologyChangeOp.UNSPECIFIED;
    }
}

export function mapSdkTopologyChangeOp(
    value?: Enums_TopologyChangeOp,
): TopologyMappingOperation {
    switch (value) {
        case Enums_TopologyChangeOp.ADD_REPLACE:
            return TopologyMappingOperation.addReplace;
        case Enums_TopologyChangeOp.REMOVE:
            return TopologyMappingOperation.remove;
        case Enums_TopologyChangeOp.UNSPECIFIED:
        default:
            return TopologyMappingOperation.unspecified;
    }
}

export function mapGrpcTopologyMappingCode(
    value: TopologyMappingCode,
): Enums_TopologyMappingCode {
    switch (value) {
        case TopologyMappingCode.namespaceDelegation:
            return Enums_TopologyMappingCode.NAMESPACE_DELEGATION;
        case TopologyMappingCode.decentralizedNamespaceDefinition:
            return Enums_TopologyMappingCode.DECENTRALIZED_NAMESPACE_DEFINITION;
        case TopologyMappingCode.ownerToKeyMapping:
            return Enums_TopologyMappingCode.OWNER_TO_KEY_MAPPING;
        case TopologyMappingCode.synchronizerTrustCertificate:
            return Enums_TopologyMappingCode.SYNCHRONIZER_TRUST_CERTIFICATE;
        case TopologyMappingCode.participantPermission:
            return Enums_TopologyMappingCode.PARTICIPANT_PERMISSION;
        case TopologyMappingCode.partyHostingLimits:
            return Enums_TopologyMappingCode.PARTY_HOSTING_LIMITS;
        case TopologyMappingCode.vettedPackages:
            return Enums_TopologyMappingCode.VETTED_PACKAGES;
        case TopologyMappingCode.partyToParticipant:
            return Enums_TopologyMappingCode.PARTY_TO_PARTICIPANT;
        case TopologyMappingCode.synchronizerParametersState:
            return Enums_TopologyMappingCode.SYNCHRONIZER_PARAMETERS_STATE;
        case TopologyMappingCode.mediatorSynchronizerState:
            return Enums_TopologyMappingCode.MEDIATOR_SYNCHRONIZER_STATE;
        case TopologyMappingCode.sequencerSynchronizerState:
            return Enums_TopologyMappingCode.SEQUENCER_SYNCHRONIZER_STATE;
        case TopologyMappingCode.sequencingDynamicParametersState:
            return Enums_TopologyMappingCode.SEQUENCING_DYNAMIC_PARAMETERS_STATE;
        case TopologyMappingCode.partyToKeyMapping:
            return Enums_TopologyMappingCode.PARTY_TO_KEY_MAPPING;
        case TopologyMappingCode.lsuAnnouncement:
            return Enums_TopologyMappingCode.LSU_ANNOUNCEMENT;
        case TopologyMappingCode.sequencerConnectionSuccessor:
            return Enums_TopologyMappingCode.SEQUENCER_CONNECTION_SUCCESSOR;
        case TopologyMappingCode.unspecified:
        default:
            return Enums_TopologyMappingCode.UNSPECIFIED;
    }
}

export function mapSdkTopologyMappingCode(
    value?: Enums_TopologyMappingCode,
): TopologyMappingCode {
    switch (value) {
        case Enums_TopologyMappingCode.NAMESPACE_DELEGATION:
            return TopologyMappingCode.namespaceDelegation;
        case Enums_TopologyMappingCode.DECENTRALIZED_NAMESPACE_DEFINITION:
            return TopologyMappingCode.decentralizedNamespaceDefinition;
        case Enums_TopologyMappingCode.OWNER_TO_KEY_MAPPING:
            return TopologyMappingCode.ownerToKeyMapping;
        case Enums_TopologyMappingCode.SYNCHRONIZER_TRUST_CERTIFICATE:
            return TopologyMappingCode.synchronizerTrustCertificate;
        case Enums_TopologyMappingCode.PARTICIPANT_PERMISSION:
            return TopologyMappingCode.participantPermission;
        case Enums_TopologyMappingCode.PARTY_HOSTING_LIMITS:
            return TopologyMappingCode.partyHostingLimits;
        case Enums_TopologyMappingCode.VETTED_PACKAGES:
            return TopologyMappingCode.vettedPackages;
        case Enums_TopologyMappingCode.PARTY_TO_PARTICIPANT:
            return TopologyMappingCode.partyToParticipant;
        case Enums_TopologyMappingCode.SYNCHRONIZER_PARAMETERS_STATE:
            return TopologyMappingCode.synchronizerParametersState;
        case Enums_TopologyMappingCode.MEDIATOR_SYNCHRONIZER_STATE:
            return TopologyMappingCode.mediatorSynchronizerState;
        case Enums_TopologyMappingCode.SEQUENCER_SYNCHRONIZER_STATE:
            return TopologyMappingCode.sequencerSynchronizerState;
        case Enums_TopologyMappingCode.SEQUENCING_DYNAMIC_PARAMETERS_STATE:
            return TopologyMappingCode.sequencingDynamicParametersState;
        case Enums_TopologyMappingCode.PARTY_TO_KEY_MAPPING:
            return TopologyMappingCode.partyToKeyMapping;
        case Enums_TopologyMappingCode.LSU_ANNOUNCEMENT:
            return TopologyMappingCode.lsuAnnouncement;
        case Enums_TopologyMappingCode.SEQUENCER_CONNECTION_SUCCESSOR:
            return TopologyMappingCode.sequencerConnectionSuccessor;
        case Enums_TopologyMappingCode.UNSPECIFIED:
        default:
            return TopologyMappingCode.unspecified;
    }
}

export function mapSdkParticipantPermission(
    value?: Enums_ParticipantPermission,
): ParticipantPermission {
    switch (value) {
        case Enums_ParticipantPermission.SUBMISSION:
            return ParticipantPermission.submission;
        case Enums_ParticipantPermission.CONFIRMATION:
            return ParticipantPermission.confirmation;
        case Enums_ParticipantPermission.OBSERVATION:
            return ParticipantPermission.observation;
        case Enums_ParticipantPermission.UNSPECIFIED:
        default:
            return ParticipantPermission.unspecified;
    }
}

export function mapSdkTimestamp(
    value?: Partial<Timestamp>,
): Date | undefined {
    if (value?.seconds === undefined) {
        return undefined;
    }

    return new Date(
        Number(value.seconds) * 1_000 + Math.floor((value.nanos ?? 0) / 1_000_000),
    );
}

export function mapGrpcTimestamp(
    value?: Date,
): Timestamp | undefined {
    if (value === undefined) {
        return undefined;
    }

    const milliseconds = value.getTime();

    const seconds = Math.floor(milliseconds / 1_000);

    const nanos = (milliseconds % 1_000) * 1_000_000;

    return {
        seconds: seconds.toString(),
        nanos,
    };
}

export function mapSdkDuration(
    value?: Partial<Duration>,
): TopologyDuration | undefined {
    if (value?.seconds === undefined) {
        return undefined;
    }

    return new TopologyDuration({
        seconds: value.seconds,
        nanos: value.nanos ?? 0,
    });
}

export function mapSdkSigningPublicKey(
    value?: Partial<SigningPublicKey>,
): TopologySigningPublicKey {
    return new TopologySigningPublicKey({
        format: mapSdkCryptoKeyFormat(value?.format),
        publicKey: value?.publicKey,
        scheme: undefined,
        usage: (value?.usage ?? []).map(mapSdkSigningKeyUsage),
        keySpec: mapSdkSigningKeySpec(value?.keySpec),
    });
}

export function mapSdkEncryptionPublicKey(
    value?: Partial<EncryptionPublicKey>,
): TopologyEncryptionPublicKey {
    return new TopologyEncryptionPublicKey({
        format: mapSdkCryptoKeyFormat(value?.format),
        publicKey: value?.publicKey,
        scheme: undefined,
        keySpec: mapSdkEncryptionKeySpec(value?.keySpec),
    });
}

export function mapSdkPublicKey(
    value?: Partial<PublicKey>,
): TopologyPublicKey {
    return new TopologyPublicKey({
        signingPublicKey:
            value?.key.oneofKind === "signingPublicKey"
                ? mapSdkSigningPublicKey(value.key.signingPublicKey)
                : undefined,
        encryptionPublicKey:
            value?.key.oneofKind === "encryptionPublicKey"
                ? mapSdkEncryptionPublicKey(value.key.encryptionPublicKey)
                : undefined,
    });
}

export function mapSdkSigningKeysWithThreshold(
    value?: Partial<SigningKeysWithThreshold>,
): TopologySigningKeysWithThreshold | undefined {
    if (value === undefined) {
        return undefined;
    }

    return new TopologySigningKeysWithThreshold({
        threshold: value.threshold ?? 0,
        keys: (value.keys ?? []).map(mapSdkSigningPublicKey),
    });
}

export function mapSdkNamespaceDelegation(
    value?: Partial<NamespaceDelegation>,
): SdkNamespaceDelegation {
    return new SdkNamespaceDelegation({
        namespace: value?.namespace ?? "",
        targetKey:
            value?.targetKey === undefined
                ? undefined
                : mapSdkSigningPublicKey(value.targetKey),
        isRootDelegation: value?.isRootDelegation ?? false,
        restriction:
            value?.restriction.oneofKind === undefined
                ? undefined
                : new NamespaceDelegationRestriction({
                    kind: mapSdkNamespaceDelegationRestrictionKind(
                        value.restriction.oneofKind,
                    ),
                    mappings:
                        value.restriction.oneofKind === "canSignSpecificMapings"
                            ? value.restriction.canSignSpecificMapings.mappings.map(
                                mapSdkTopologyMappingCode,
                            )
                            : [],
                }),
    });
}

export function mapSdkDecentralizedNamespaceDefinition(
    value?: Partial<DecentralizedNamespaceDefinition>,
): SdkDecentralizedNamespaceDefinition {
    return new SdkDecentralizedNamespaceDefinition({
        decentralizedNamespace: value?.decentralizedNamespace ?? "",
        threshold: value?.threshold ?? 0,
        owners: [...(value?.owners ?? [])],
    });
}

export function mapSdkOwnerToKeyMapping(
    value?: Partial<OwnerToKeyMapping>,
): SdkOwnerToKeyMapping {
    return new SdkOwnerToKeyMapping({
        member: value?.member ?? "",
        publicKeys: (value?.publicKeys ?? []).map(mapSdkPublicKey),
    });
}

export function mapSdkPartyToKeyMapping(
    value?: Partial<PartyToKeyMapping>,
): SdkPartyToKeyMapping {
    return new SdkPartyToKeyMapping({
        party: value?.party ?? "",
        threshold: value?.threshold ?? 0,
        signingKeys: (value?.signingKeys ?? []).map(mapSdkSigningPublicKey),
    });
}

export function mapSdkSynchronizerTrustCertificate(
    value?: Partial<SynchronizerTrustCertificate>,
): SdkSynchronizerTrustCertificate {
    return new SdkSynchronizerTrustCertificate({
        participantUid: value?.participantUid ?? "",
        synchronizerId: value?.synchronizerId ?? "",
        featureFlags: (value?.featureFlags ?? []).map(
            mapSdkParticipantFeatureFlag,
        ),
    });
}

export function mapSdkParticipantSynchronizerPermission(
    value?: Partial<ParticipantSynchronizerPermission>,
): ParticipantSynchronizerPermission {
    return new ParticipantSynchronizerPermission({
        synchronizerId: value?.synchronizerId ?? "",
        participantUid: value?.participantUid ?? "",
        permission: mapSdkParticipantPermission(value?.permission),
        limits:
            value?.limits === undefined
                ? undefined
                : new ParticipantSynchronizerLimits({
                    confirmationRequestsMaxRate:
                        value.limits.confirmationRequestsMaxRate ?? 0,
                }),
        loginAfter: value?.loginAfter,
    });
}

export function mapSdkPartyHostingLimits(
    value?: Partial<PartyHostingLimits>,
): SdkPartyHostingLimits {
    return new SdkPartyHostingLimits({
        synchronizerId: value?.synchronizerId ?? "",
        party: value?.party ?? "",
    });
}

export function mapSdkTopologyVettedPackages(
    value?: Partial<ListVettedPackagesResponse["results"][number]["item"]>,
): TopologyVettedPackages {
    return new TopologyVettedPackages({
        participantUid: value?.participantUid ?? "",
        packageIds: [...(value?.packageIds ?? [])],
        packages: (value?.packages ?? []).map(
            (item) =>
                new TopologyVettedPackage({
                    packageId: item.packageId ?? "",
                    validFromInclusive: mapSdkTimestamp(item.validFromInclusive),
                    validUntilExclusive: mapSdkTimestamp(item.validUntilExclusive),
                }),
        ),
    });
}

export function mapSdkPartyToParticipant(
    value?: Partial<PartyToParticipant>,
): PartyToParticipant {
    return new PartyToParticipant({
        party: value?.party ?? "",
        threshold: value?.threshold ?? 0,
        participants: (value?.participants ?? []).map(
            (participant) =>
                new PartyToParticipantParticipant({
                    participantUid: participant.participantUid ?? "",
                    permission: mapSdkParticipantPermission(participant.permission),
                    onboarding:
                        participant.onboarding === undefined
                            ? undefined
                            : new PartyToParticipantOnboarding(),
                }),
        ),
        partySigningKeys: mapSdkSigningKeysWithThreshold(value?.partySigningKeys),
    });
}

export function mapSdkDynamicSynchronizerParameters(
    value?: Partial<DynamicSynchronizerParameters>,
): SdkDynamicSynchronizerParameters {
    return new SdkDynamicSynchronizerParameters({
        confirmationResponseTimeout: mapSdkDuration(
            value?.confirmationResponseTimeout,
        ),
        mediatorReactionTimeout: mapSdkDuration(value?.mediatorReactionTimeout),
        assignmentExclusivityTimeout: mapSdkDuration(
            value?.assignmentExclusivityTimeout,
        ),
        ledgerTimeRecordTimeTolerance: mapSdkDuration(
            value?.ledgerTimeRecordTimeTolerance,
        ),
        reconciliationInterval: mapSdkDuration(value?.reconciliationInterval),
        mediatorDeduplicationTimeout: mapSdkDuration(
            value?.mediatorDeduplicationTimeout,
        ),
        maxRequestSize: value?.maxRequestSize ?? 0,
        onboardingRestriction: mapSdkOnboardingRestriction(
            value?.onboardingRestriction,
        ),
        participantSynchronizerLimits:
            value?.participantSynchronizerLimits === undefined
                ? undefined
                : {
                    confirmationRequestsMaxRate:
                        value.participantSynchronizerLimits
                            .confirmationRequestsMaxRate ?? 0,
                },
        sequencerAggregateSubmissionTimeout: mapSdkDuration(
            value?.sequencerAggregateSubmissionTimeout,
        ),
        trafficControl:
            value?.trafficControl === undefined
                ? undefined
                : mapSdkTrafficControlParameters(value.trafficControl),
        acsCommitmentsCatchup:
            value?.acsCommitmentsCatchup === undefined
                ? undefined
                : mapSdkAcsCommitmentsCatchUpConfig(
                    value.acsCommitmentsCatchup,
                ),
        preparationTimeRecordTimeTolerance: mapSdkDuration(
            value?.preparationTimeRecordTimeTolerance,
        ),
    });
}

export function mapSdkDynamicSequencingParameters(
    value?: Partial<GrpcDynamicSequencingParameters>,
): DynamicSequencingParameters {
    return new DynamicSequencingParameters({
        payload: value?.payload,
    });
}

export function mapSdkMediatorSynchronizerState(
    value?: Partial<MediatorSynchronizerState>,
): SdkMediatorSynchronizerState {
    return new SdkMediatorSynchronizerState({
        synchronizerId: value?.synchronizerId ?? "",
        group: value?.group ?? 0,
        threshold: value?.threshold ?? 0,
        active: [...(value?.active ?? [])],
        observers: [...(value?.observers ?? [])],
    });
}

export function mapSdkSequencerSynchronizerState(
    value?: Partial<SequencerSynchronizerState>,
): SdkSequencerSynchronizerState {
    return new SdkSequencerSynchronizerState({
        synchronizerId: value?.synchronizerId ?? "",
        threshold: value?.threshold ?? 0,
        active: [...(value?.active ?? [])],
        observers: [...(value?.observers ?? [])],
    });
}

export function mapSdkLsuAnnouncement(
    value?: Partial<LsuAnnouncement>,
): SdkLsuAnnouncement {
    return new SdkLsuAnnouncement({
        successorPhysicalSynchronizerId:
            value?.successorPhysicalSynchronizerId ?? "",
        upgradeTime: mapSdkTimestamp(value?.upgradeTime),
    });
}

export function mapSdkLsuSequencerConnectionSuccessor(
    value?: Partial<LsuSequencerConnectionSuccessor>,
): SdkLsuSequencerConnectionSuccessor {
    return new SdkLsuSequencerConnectionSuccessor({
        sequencerId: value?.sequencerId ?? "",
        successorPhysicalSynchronizerId:
            value?.successorPhysicalSynchronizerId ?? "",
        connection:
            value?.connection === undefined
                ? undefined
                : new LsuSequencerConnection({
                    endpoints: [...(value.connection.endpoints ?? [])],
                    customTrustCertificates:
                        value.connection.customTrustCertificates,
                }),
    });
}

function mapSdkParticipantFeatureFlag(
    value: Enums_ParticipantFeatureFlag,
): string {
    switch (value) {
        case Enums_ParticipantFeatureFlag.ENABLE_MULTI_SYNCHRONIZER:
            return "enableMultiSynchronizer";
        case Enums_ParticipantFeatureFlag.PV33_EXTERNAL_SIGNING_LOCAL_CONTRACT_IN_SUBVIEW:
            return "pv33ExternalSigningLocalContractInSubview";
        case Enums_ParticipantFeatureFlag.UNSPECIFIED:
        default:
            return "unspecified";
    }
}

function mapSdkNamespaceDelegationRestrictionKind(
    value: NamespaceDelegation["restriction"]["oneofKind"],
): NamespaceDelegationRestrictionKind {
    switch (value) {
        case "canSignAllMappings":
            return NamespaceDelegationRestrictionKind.canSignAllMappings;
        case "canSignAllButNamespaceDelegations":
            return NamespaceDelegationRestrictionKind.canSignAllButNamespaceDelegations;
        case "canSignSpecificMapings":
        default:
            return NamespaceDelegationRestrictionKind.canSignSpecificMappings;
    }
}

function mapSdkTrafficControlParameters(
    value: Partial<TrafficControlParameters>,
): SdkTrafficControlParameters {
    return new SdkTrafficControlParameters({
        maxBaseTrafficAmount: value.maxBaseTrafficAmount ?? "0",
        maxBaseTrafficAccumulationDuration: mapSdkDuration(
            value.maxBaseTrafficAccumulationDuration,
        ),
        readVsWriteScalingFactor: value.readVsWriteScalingFactor ?? 0,
        setBalanceRequestSubmissionWindowSize: mapSdkDuration(
            value.setBalanceRequestSubmissionWindowSize,
        ),
        enforceRateLimiting: value.enforceRateLimiting ?? false,
        baseEventCost: value.baseEventCost,
        freeConfirmationResponses: value.freeConfirmationResponses ?? false,
    });
}

function mapSdkAcsCommitmentsCatchUpConfig(
    value: Partial<AcsCommitmentsCatchUpConfig>,
): SdkAcsCommitmentsCatchUpConfig {
    return new SdkAcsCommitmentsCatchUpConfig({
        catchupIntervalSkip: value.catchupIntervalSkip ?? 0,
        nrIntervalsToTriggerCatchup: value.nrIntervalsToTriggerCatchup ?? 0,
    });
}

function mapSdkOnboardingRestriction(
    value?: OnboardingRestriction,
): SdkOnboardingRestriction {
    switch (value) {
        case OnboardingRestriction.UNRESTRICTED_OPEN:
            return SdkOnboardingRestriction.unrestrictedOpen;
        case OnboardingRestriction.UNRESTRICTED_LOCKED:
            return SdkOnboardingRestriction.unrestrictedLocked;
        case OnboardingRestriction.RESTRICTED_OPEN:
            return SdkOnboardingRestriction.restrictedOpen;
        case OnboardingRestriction.RESTRICTED_LOCKED:
            return SdkOnboardingRestriction.restrictedLocked;
        case OnboardingRestriction.UNSPECIFIED:
        default:
            return SdkOnboardingRestriction.unspecified;
    }
}

function mapSdkSigningKeyUsage(value: SigningKeyUsage): string {
    switch (value) {
        case SigningKeyUsage.NAMESPACE:
            return "namespace";
        case SigningKeyUsage.IDENTITY_DELEGATION:
            return "identityDelegation";
        case SigningKeyUsage.SEQUENCER_AUTHENTICATION:
            return "sequencerAuthentication";
        case SigningKeyUsage.PROTOCOL:
            return "protocol";
        case SigningKeyUsage.PROOF_OF_OWNERSHIP:
            return "proofOfOwnership";
        case SigningKeyUsage.UNSPECIFIED:
        default:
            return "unspecified";
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

function mapSdkEncryptionKeySpec(
    value?: EncryptionKeySpec,
): string | undefined {
    switch (value) {
        case EncryptionKeySpec.EC_P256:
            return "ecP256";
        case EncryptionKeySpec.RSA_2048:
            return "rsa2048";
        case EncryptionKeySpec.UNSPECIFIED:
        default:
            return "unspecified";
    }
}

function mapSdkCryptoKeyFormat(
    value?: CryptoKeyFormat,
): string | undefined {
    switch (value) {
        case CryptoKeyFormat.DER:
            return "der";
        case CryptoKeyFormat.RAW:
            return "raw";
        case CryptoKeyFormat.DER_X509_SUBJECT_PUBLIC_KEY_INFO:
            return "derX509SubjectPublicKeyInfo";
        case CryptoKeyFormat.DER_PKCS8_PRIVATE_KEY_INFO:
            return "derPkcs8PrivateKeyInfo";
        case CryptoKeyFormat.SYMBOLIC:
            return "symbolic";
        case CryptoKeyFormat.UNSPECIFIED:
        default:
            return "unspecified";
    }
}
