export interface AggregatedPartyHosting {
    readonly party: string;
    readonly participants: readonly {
        readonly participantUid: string;
        readonly synchronizers: readonly {
            readonly synchronizerId: string;
        }[];
    }[];
}

export interface WaitForPartyHostingInit {
    readonly partyId: string;
    readonly expectedParticipantId: string;
    readonly expectedSynchronizerId: string;
    readonly readPartiesAsync: () => Promise<readonly AggregatedPartyHosting[]>;
    readonly now?: () => number;
    readonly sleepAsync?: (milliseconds: number) => Promise<void>;
    readonly pollIntervalMs?: number;
    readonly timeoutMs?: number;
}

export async function waitForPartyHostingAsync(
    init: WaitForPartyHostingInit,
): Promise<void> {
    const now = init.now ?? Date.now;

    const sleepAsync = init.sleepAsync ?? ((milliseconds: number) =>
        new Promise<void>(resolve => setTimeout(resolve, milliseconds)));

    const deadline = now() + (init.timeoutMs ?? 30_000);

    let lastObservedHosting = "none";

    while (now() <= deadline) {
        const hosting = (await init.readPartiesAsync()).find(
            result => result.party === init.partyId,
        );

        if (hosting !== undefined) {
            lastObservedHosting = formatHosting(hosting);

            const participant = hosting.participants.find(
                result => result.participantUid === init.expectedParticipantId,
            );

            if (participant?.synchronizers.some(
                result => result.synchronizerId === init.expectedSynchronizerId,
            )) {
                return;
            }
        }

        await sleepAsync(init.pollIntervalMs ?? 500);
    }

    throw new Error(
        `Timed out waiting for aggregated PartyToParticipant topology for ${init.partyId}; expected participant UID '${init.expectedParticipantId}' on synchronizer '${init.expectedSynchronizerId}'; last observed hosting: ${lastObservedHosting}.`,
    );
}

function formatHosting(hosting: AggregatedPartyHosting): string {
    const participants = hosting.participants.flatMap(participant =>
        participant.synchronizers.map(
            synchronizer => `${participant.participantUid}@${synchronizer.synchronizerId}`,
        ),
    );

    return `party='${hosting.party}', participants=[${participants.join(", ")}]`;
}
