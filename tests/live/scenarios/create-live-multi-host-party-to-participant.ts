import { allocateLiveExternalPartyAsync } from "./create-live-external-party.js";
import {
    ExternalPartyActivationClient,
    ExternalPartyActivationRequest,
    GetParticipantStatusRequest,
    PartyToParticipant,
} from "../../../src/index.js";
import { LiveMultiNodeClients } from "../runtime/live-multi-node-client-factory.js";

export interface LiveMultiHostPartyToParticipantResult {
    readonly partyId: string;
    readonly synchronizerId: string;
    readonly expectedParticipantUids: readonly string[];
    readonly readBack: PartyToParticipant;
}

/** Creates a fresh multi-host external party and verifies the resulting PartyToParticipant mapping through participant-admin reads. */
export async function createLiveMultiHostPartyToParticipantAsync(
    clients: LiveMultiNodeClients,
    init: {
        topologyPatternName: string;
        hostCount: 2 | 3;
        threshold: number;
    },
): Promise<LiveMultiHostPartyToParticipantResult> {
    const hostClients = getRequiredHostClients(clients, init.hostCount);

    if (init.threshold < 1 || init.threshold > hostClients.length) {
        throw new Error(
            `Live multi-host PartyToParticipant threshold must be between 1 and ${hostClients.length}, received ${init.threshold}.`,
        );
    }

    const expectedParticipantUids = await Promise.all(
        hostClients.map(async (client) => {
            const response =
                await client.participantStatusService.getParticipantStatusAsync(
                    new GetParticipantStatusRequest(),
                );

            if (response.status === undefined) {
                throw new Error(
                    "Live multi-host PartyToParticipant helper could not read participant status uid from participant-admin.",
                );
            }

            return response.status.uid;
        }),
    );

    const createdParty = await allocateLiveExternalPartyAsync(clients.primary, {
        partyHint: init.topologyPatternName,
        otherConfirmingParticipantUids: expectedParticipantUids.slice(1),
        confirmationThreshold: init.threshold,
    });

    const activationClient = new ExternalPartyActivationClient(clients.primary);
    const activation = await activationClient.activateAsync(
        new ExternalPartyActivationRequest({
            partyId: createdParty.partyId,
            synchronizerId: createdParty.synchronizerId,
            authorizingClients: hostClients.slice(1),
        }),
    );

    const readBack = activation.mapping;

    if (readBack.threshold !== init.threshold) {
        throw new Error(
            `Live multi-host PartyToParticipant helper read back threshold '${readBack.threshold}', expected '${init.threshold}'.`,
        );
    }

    assertParticipantSet(readBack, expectedParticipantUids);

    return {
        partyId: createdParty.partyId,
        synchronizerId: createdParty.synchronizerId,
        expectedParticipantUids,
        readBack,
    };
}

function getRequiredHostClients(
    clients: LiveMultiNodeClients,
    hostCount: 2 | 3,
): readonly LiveMultiNodeClients["all"][number][] {
    const hostClients = [clients.primary, clients.secondary, clients.tertiary].slice(
        0,
        hostCount,
    );

    if (hostClients.some((client) => client === undefined)) {
        throw new Error(
            `Live multi-host PartyToParticipant helper requires ${hostCount} configured client(s). Configure tertiary node endpoints to run the 3-host case.`,
        );
    }

    return hostClients as readonly LiveMultiNodeClients["all"][number][];
}

function assertParticipantSet(
    mapping: PartyToParticipant,
    expectedParticipantUids: readonly string[],
): void {
    const actualParticipantUids = mapping.participants
        .map((participant) => participant.participantUid)
        .sort();
    const sortedExpectedParticipantUids = [...expectedParticipantUids].sort();

    if (
        actualParticipantUids.length !== sortedExpectedParticipantUids.length
        || actualParticipantUids.some(
            (participantUid, index) =>
                participantUid !== sortedExpectedParticipantUids[index],
        )
    ) {
        throw new Error(
            `Live multi-host PartyToParticipant helper read back participants '${actualParticipantUids.join(",")}', expected '${sortedExpectedParticipantUids.join(",")}'.`,
        );
    }
}
