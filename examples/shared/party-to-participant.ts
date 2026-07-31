export interface PartyToParticipantMapping {
    readonly party: string;
    readonly participants: readonly {
        readonly participantUid: string;
    }[];
    readonly partySigningKeys?: {
        readonly threshold: number;
        readonly keys: readonly {
            readonly publicKey: Uint8Array;
        }[];
    };
}

export interface WaitForPartyToParticipantInit {
    readonly partyId: string;
    readonly expectedParticipantId: string;
    readonly expectedSigningKeyFingerprint: string;
    readonly expectedSigningThreshold: number;
    readonly readMappingsAsync: () => Promise<readonly PartyToParticipantMapping[]>;
    readonly computePublicKeyFingerprint: (publicKey: Uint8Array) => string;
    readonly now?: () => number;
    readonly sleepAsync?: (milliseconds: number) => Promise<void>;
    readonly pollIntervalMs?: number;
    readonly timeoutMs?: number;
}

export async function waitForPartyToParticipantAsync(
    init: WaitForPartyToParticipantInit,
): Promise<void> {
    const now = init.now ?? Date.now;

    const sleepAsync = init.sleepAsync ?? ((milliseconds: number) =>
        new Promise<void>(resolve => setTimeout(resolve, milliseconds)));

    const deadline = now() + (init.timeoutMs ?? 30_000);

    let lastObservedMappingSummary = "none";

    while (now() <= deadline) {
        const mapping = (await init.readMappingsAsync()).find(
            item => item.party === init.partyId,
        );

        if (mapping !== undefined) {
            const partySigningKeys = mapping.partySigningKeys;

            const observedFingerprints = partySigningKeys?.keys.map(
                key => init.computePublicKeyFingerprint(key.publicKey),
            ) ?? [];

            lastObservedMappingSummary = formatMappingSummary(
                mapping,
                observedFingerprints,
            );

            if (
                mapping.participants.some(
                    participant =>
                        participant.participantUid === init.expectedParticipantId,
                ) &&
                partySigningKeys !== undefined &&
                partySigningKeys.threshold === init.expectedSigningThreshold &&
                observedFingerprints.includes(init.expectedSigningKeyFingerprint)
            ) {
                return;
            }
        }

        await sleepAsync(init.pollIntervalMs ?? 500);
    }

    throw new Error(
        `Timed out waiting for PartyToParticipant topology for ${init.partyId}; expected participant UID '${init.expectedParticipantId}', signing-key fingerprint '${init.expectedSigningKeyFingerprint}', signing threshold ${init.expectedSigningThreshold}; last observed mapping: ${lastObservedMappingSummary}.`,
    );
}

function formatMappingSummary(
    mapping: PartyToParticipantMapping,
    signingKeyFingerprints: readonly string[],
): string {
    return `party='${mapping.party}', participants=[${mapping.participants.map(participant => participant.participantUid).join(", ")}], signingThreshold=${mapping.partySigningKeys?.threshold ?? "none"}, signingKeyFingerprints=[${signingKeyFingerprints.join(", ")}]`;
}
