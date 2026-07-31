import {
    CantonClient,
    ListKnownPartiesRequest,
} from "../../../src/index.js";
import {
    AllocateExternalPartyRequest,
    AllocateExternalPartyRequest_SignedTransaction,
    GenerateExternalPartyTopologyRequest,
    GetParticipantIdRequest,
    GetPartiesRequest,
    type PartyDetails,
} from "../../../src/transports/grpc/generated/canton/com/daml/ledger/api/v2/admin/party_management_service.js";
import {
    CryptoKeyFormat,
    Signature,
    SignatureFormat,
    SigningAlgorithmSpec,
    SigningKeySpec,
    SigningPublicKey,
} from "../../../src/transports/grpc/generated/canton/com/daml/ledger/api/v2/crypto.js";
import { ListConnectedSynchronizersRequest } from "../../../src/transports/grpc/generated/canton/com/digitalasset/canton/admin/participant/v30/synchronizer_connectivity_service.js";
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
            GetParticipantIdRequest.create(),
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
            GenerateExternalPartyTopologyRequest.create({
                synchronizer: synchronizerId,
                partyHint: init.partyHint ?? "ed25519_party",
                publicKey: SigningPublicKey.create({
                    format:
                        CryptoKeyFormat.DER_X509_SUBJECT_PUBLIC_KEY_INFO,
                    keyData: publicKeyBytes,
                    keySpec: SigningKeySpec.EC_CURVE25519,
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
            AllocateExternalPartyRequest.create({
                synchronizer: synchronizerId,
                onboardingTransactions: generatedTopology.topologyTransactions.map(
                    item =>
                        AllocateExternalPartyRequest_SignedTransaction.create({
                            transaction: item,
                            signatures: [],
                        }),
                ),
                multiHashSignatures: [
                    Signature.create({
                        format: SignatureFormat.CONCAT,
                        signature: multiHashSignature,
                        signedBy:
                            generatedTopology.publicKeyFingerprint,
                        signingAlgorithmSpec: SigningAlgorithmSpec.ED25519,
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
        GetPartiesRequest.create({
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
            ListConnectedSynchronizersRequest.create(),
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
