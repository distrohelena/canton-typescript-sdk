import {
    AllocateExternalPartyRequest,
    CantonClient,
    ExternalPartyCryptoKeyFormat,
    ExternalPartyOnboardingTransaction,
    ExternalPartySignature,
    ExternalPartySignatureFormat,
    ExternalPartySigningAlgorithmSpec,
    ExternalPartySigningKeySpec,
    ExternalPartySigningPublicKey,
    GenerateExternalPartyTopologyRequest,
    GetParticipantIdRequest,
    GetPartiesRequest,
    ListConnectedSynchronizersRequest,
    ListKnownPartiesRequest,
    PartyDetails,
} from "../../../src/index.js";
import { generateKeyPairSync, sign } from "node:crypto";

export interface LiveExternalPartyResult {
    readonly partyId: string;
    readonly publicKeyFingerprint: string;
    readonly synchronizerId: string;
    readonly participantId: string;
    readonly partyDetails: PartyDetails;
    readonly knownPartyDetails: PartyDetails;
}

export interface LiveExternalPartyAllocationResult {
    readonly partyId: string;
    readonly publicKeyFingerprint: string;
    readonly synchronizerId: string;
    readonly participantId: string;
}

/** Allocates a fresh ED25519 external party through the public gRPC SDK surface. */
export async function allocateLiveExternalPartyAsync(
    client: CantonClient,
    init: {
        partyHint?: string;
        localParticipantObservationOnly?: boolean;
        otherConfirmingParticipantUids?: string[];
        confirmationThreshold?: number;
        observingParticipantUids?: string[];
    } = {},
): Promise<LiveExternalPartyAllocationResult> {
    const participantIdResponse =
        await client.partyManagementService.getParticipantIdAsync(
            new GetParticipantIdRequest(),
        );

    const synchronizerId = await discoverSingleHealthySynchronizerIdAsync(client);

    const generatedKeyPair = generateKeyPairSync("ed25519");

    const publicKeyBytes = new Uint8Array(
        generatedKeyPair.publicKey.export({
            format: "der",
            type: "spki",
        }),
    );

    const generatedTopology =
        await client.partyManagementService.generateExternalPartyTopologyAsync(
            new GenerateExternalPartyTopologyRequest({
                synchronizer: synchronizerId,
                partyHint: init.partyHint ?? "ed25519_party",
                publicKey: new ExternalPartySigningPublicKey({
                    format:
                        ExternalPartyCryptoKeyFormat
                            .derX509SubjectPublicKeyInfo,
                    keyData: publicKeyBytes,
                    keySpec: ExternalPartySigningKeySpec.ecCurve25519,
                }),
                localParticipantObservationOnly:
                    init.localParticipantObservationOnly,
                otherConfirmingParticipantUids:
                    init.otherConfirmingParticipantUids,
                confirmationThreshold: init.confirmationThreshold,
                observingParticipantUids: init.observingParticipantUids,
            }),
        );

    const multiHashSignature = new Uint8Array(
        sign(null, generatedTopology.multiHash, generatedKeyPair.privateKey),
    );

    const allocation =
        await client.partyManagementService.allocateExternalPartyAsync(
            new AllocateExternalPartyRequest({
                synchronizer: synchronizerId,
                onboardingTransactions: generatedTopology.topologyTransactions.map(
                    item =>
                        new ExternalPartyOnboardingTransaction({
                            transaction: item,
                        }),
                ),
                multiHashSignatures: [
                    new ExternalPartySignature({
                        format: ExternalPartySignatureFormat.concat,
                        signature: multiHashSignature,
                        signedByFingerprint:
                            generatedTopology.publicKeyFingerprint,
                        signingAlgorithmSpec:
                            ExternalPartySigningAlgorithmSpec.ed25519,
                    }),
                ],
                waitForAllocation: true,
            }),
        );

    return {
        partyId: allocation.partyId,
        publicKeyFingerprint: generatedTopology.publicKeyFingerprint,
        synchronizerId,
        participantId: participantIdResponse.participantId,
    };
}

/** Creates a fresh ED25519 external party through the public gRPC SDK surface. */
export async function createLiveExternalPartyAsync(
    client: CantonClient,
    init: {
        partyHint?: string;
        localParticipantObservationOnly?: boolean;
        otherConfirmingParticipantUids?: string[];
        confirmationThreshold?: number;
        observingParticipantUids?: string[];
    } = {},
): Promise<LiveExternalPartyResult> {
    const allocation = await allocateLiveExternalPartyAsync(client, init);

    const knownParties =
        await client.partyManagementService.listKnownPartiesAsync(
            new ListKnownPartiesRequest({
                filterParty: allocation.partyId,
                pageSize: 10,
            }),
        );

    const knownPartyDetails = knownParties.partyDetails.find(
        item => item.party === allocation.partyId,
    );

    if (knownPartyDetails === undefined) {
        throw new Error(
            `Live external-party helper could not read '${allocation.partyId}' through listKnownPartiesAsync.`,
        );
    }

    const parties = await client.partyManagementService.getPartiesAsync(
        new GetPartiesRequest({
            parties: [allocation.partyId],
        }),
    );

    const partyDetails = parties.partyDetails.find(
        item => item.party === allocation.partyId,
    );

    if (partyDetails === undefined) {
        throw new Error(
            `Live external-party helper could not read '${allocation.partyId}' through getPartiesAsync.`,
        );
    }

    return {
        partyId: allocation.partyId,
        publicKeyFingerprint: allocation.publicKeyFingerprint,
        synchronizerId: allocation.synchronizerId,
        participantId: allocation.participantId,
        partyDetails,
        knownPartyDetails,
    };
}

async function discoverSingleHealthySynchronizerIdAsync(
    client: CantonClient,
): Promise<string> {
    const response =
        await client.synchronizerConnectivityService.listConnectedSynchronizersAsync(
            new ListConnectedSynchronizersRequest(),
        );

    const healthySynchronizers = response.connectedSynchronizers.filter(
        item => item.healthy,
    );

    if (healthySynchronizers.length !== 1) {
        throw new Error(
            `Live external-party helper requires exactly one healthy connected synchronizer, observed ${healthySynchronizers.length}.`,
        );
    }

    return healthySynchronizers[0].synchronizerId;
}
