import { appendFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import { tmpdir } from "node:os";
import { allocateLiveExternalPartyAsync } from "./create-live-external-party.js";
import {
    ExternalPartyActivationClient,
    ExternalPartyActivationRequest,
    GetParticipantStatusRequest,
    ParticipantPermission,
    PartyToParticipant,
} from "../../../src/index.js";
import { LiveMultiNodeClients } from "../runtime/live-multi-node-client-factory.js";
import {
    LivePartyToParticipantScenario,
    createExplorerUrl,
    validateLivePartyToParticipantScenario,
} from "./live-party-to-participant-scenario-matrix.js";

export interface LiveMultiHostPartyToParticipantResult {
    readonly partyId: string;
    readonly explorerUrl: string;
    readonly synchronizerId: string;
    readonly expectedConfirmingParticipantUids: readonly string[];
    readonly expectedObservingParticipantUids: readonly string[];
    readonly readBack: PartyToParticipant;
}

/** Creates a fresh PartyToParticipant mapping from an explicit confirmer/observer scenario and verifies the read-back topology. */
export async function createLiveMultiHostPartyToParticipantAsync(
    clients: LiveMultiNodeClients,
    init: LivePartyToParticipantScenario,
): Promise<LiveMultiHostPartyToParticipantResult> {
    validateLivePartyToParticipantScenario(init, clients.all.length);

    const involvedHostIndexes = [
        ...new Set([
            ...init.confirmingHostIndexes,
            ...init.observingHostIndexes,
            ...(init.localParticipantObservationOnly ? [0] : []),
        ]),
    ];
    const participantUidsByHostIndex = await readParticipantUidsByHostIndexAsync(
        clients,
        involvedHostIndexes,
    );
    const expectedConfirmingParticipantUids = init.confirmingHostIndexes.map(
        (hostIndex) => participantUidsByHostIndex.get(hostIndex)!,
    );
    const expectedObservingParticipantUids = [
        ...(init.localParticipantObservationOnly ? [participantUidsByHostIndex.get(0)!] : []),
        ...init.observingHostIndexes.map(
            (hostIndex) => participantUidsByHostIndex.get(hostIndex)!,
        ),
    ];

    const createdParty = await allocateLiveExternalPartyAsync(clients.primary, {
        partyHint: init.scenarioName,
        localParticipantObservationOnly: init.localParticipantObservationOnly,
        otherConfirmingParticipantUids: init.confirmingHostIndexes
            .filter((hostIndex) => hostIndex !== 0)
            .map((hostIndex) => participantUidsByHostIndex.get(hostIndex)!),
        confirmationThreshold: init.threshold,
        observingParticipantUids: init.observingHostIndexes.map(
            (hostIndex) => participantUidsByHostIndex.get(hostIndex)!,
        ),
    });

    const authorizingClients = [
        ...new Set([
            ...init.confirmingHostIndexes,
            ...init.observingHostIndexes,
        ]),
    ]
        .filter((hostIndex) => hostIndex !== 0)
        .map((hostIndex) => clients.all[hostIndex]);
    const activationClient = new ExternalPartyActivationClient(clients.primary);
    const activation = await activationClient.activateAsync(
        new ExternalPartyActivationRequest({
            partyId: createdParty.partyId,
            synchronizerId: createdParty.synchronizerId,
            authorizingClients,
        }),
    );

    const readBack = activation.mapping;

    if (readBack.threshold !== init.threshold) {
        throw new Error(
            `Live multi-host PartyToParticipant helper read back threshold '${readBack.threshold}', expected '${init.threshold}'.`,
        );
    }

    assertParticipantPermissions(
        readBack,
        expectedConfirmingParticipantUids,
        expectedObservingParticipantUids,
    );

    const explorerUrl = createExplorerUrl(createdParty.partyId);
    await appendScenarioExplorerSummaryAsync({
        explorerUrl,
        partyId: createdParty.partyId,
        scenarioName: init.scenarioName,
        threshold: init.threshold,
        expectedConfirmingParticipantUids,
        expectedObservingParticipantUids,
    });

    return {
        partyId: createdParty.partyId,
        explorerUrl,
        synchronizerId: createdParty.synchronizerId,
        expectedConfirmingParticipantUids,
        expectedObservingParticipantUids,
        readBack,
    };
}

async function readParticipantUidsByHostIndexAsync(
    clients: LiveMultiNodeClients,
    hostIndexes: readonly number[],
): Promise<Map<number, string>> {
    const result = new Map<number, string>();

    await Promise.all(
        hostIndexes.map(async (hostIndex) => {
            const client = clients.all[hostIndex];

            if (client === undefined) {
                throw new Error(
                    `Live multi-host PartyToParticipant helper requires configured client for host index ${hostIndex}.`,
                );
            }

            const response =
                await client.participantStatusService.getParticipantStatusAsync(
                    new GetParticipantStatusRequest(),
                );

            if (response.status === undefined) {
                throw new Error(
                    "Live multi-host PartyToParticipant helper could not read participant status uid from participant-admin.",
                );
            }

            result.set(hostIndex, response.status.uid);
        }),
    );

    return result;
}

function assertParticipantPermissions(
    mapping: PartyToParticipant,
    expectedConfirmingParticipantUids: readonly string[],
    expectedObservingParticipantUids: readonly string[],
): void {
    const actualPermissions = new Map(
        mapping.participants.map((participant) => [
            participant.participantUid,
            participant.permission,
        ]),
    );
    const expectedParticipantCount =
        expectedConfirmingParticipantUids.length
        + expectedObservingParticipantUids.length;

    if (actualPermissions.size !== expectedParticipantCount) {
        throw new Error(
            `Live multi-host PartyToParticipant helper read back ${actualPermissions.size} participants, expected ${expectedParticipantCount}.`,
        );
    }

    for (const participantUid of expectedConfirmingParticipantUids) {
        if (
            actualPermissions.get(participantUid)
            !== ParticipantPermission.confirmation
        ) {
            throw new Error(
                `Live multi-host PartyToParticipant helper expected confirmer '${participantUid}' to have permission '${ParticipantPermission.confirmation}'.`,
            );
        }
    }

    for (const participantUid of expectedObservingParticipantUids) {
        if (
            actualPermissions.get(participantUid)
            !== ParticipantPermission.observation
        ) {
            throw new Error(
                `Live multi-host PartyToParticipant helper expected observer '${participantUid}' to have permission '${ParticipantPermission.observation}'.`,
            );
        }
    }
}

async function appendScenarioExplorerSummaryAsync(init: {
    scenarioName: string;
    partyId: string;
    explorerUrl: string;
    threshold: number;
    expectedConfirmingParticipantUids: readonly string[];
    expectedObservingParticipantUids: readonly string[];
}): Promise<void> {
    const outputPath =
        process.env.SDK_TEST_PARTY_TO_PARTICIPANT_LINKS_FILE
        ?? `${tmpdir()}/canton-typescript-sdk-party-to-participant-links.txt`;
    const summaryLine = [
        init.scenarioName,
        `party=${init.partyId}`,
        `threshold=${init.threshold}`,
        `confirming=${init.expectedConfirmingParticipantUids.join(",")}`,
        `observing=${init.expectedObservingParticipantUids.join(",")}`,
        init.explorerUrl,
    ].join(" | ");

    await mkdir(dirname(outputPath), { recursive: true });
    await appendFile(outputPath, `${summaryLine}\n`, "utf8");
}
