import {
    ListPartyToParticipantRequest,
    ParticipantPermission,
    RequestOptions,
    TopologyBaseQuery,
    TopologyStoreId,
    TopologyStoreKind,
    TopologyStoreSynchronizer,
} from "@distrohelena/canton-typescript-sdk";
import { resolveExamplePartyAsync } from "./shared/application-fixture.js";
import {
    createExampleClient,
    discoverSynchronizerIdAsync,
    exampleTimeoutMs,
} from "./shared/localnet.js";
import { runExampleAsync } from "./shared/run.js";

runExampleAsync("topology-inspection", async () => {
    const client = createExampleClient();

    try {
        const timeoutMs = exampleTimeoutMs();

        const actor = await resolveExamplePartyAsync(client);

        if (actor.allocated) {
            console.warn(
                "Warning: fallback party allocation creates durable localnet topology state and is not cleaned up.",
            );
        }

        const synchronizer = await discoverSynchronizerIdAsync(
            client,
            process.env.SDK_EXAMPLE_SYNCHRONIZER,
        );

        const baseQuery = new TopologyBaseQuery({
            headState: true,
            storeId: new TopologyStoreId({
                kind: TopologyStoreKind.synchronizer,
                synchronizer: new TopologyStoreSynchronizer({ id: synchronizer }),
            }),
        });

        const request = new ListPartyToParticipantRequest({
            baseQuery,
            filterParty: actor.party,
        });

        const response =
            await client.topologyManagerReadService.listPartyToParticipantAsync(
                request,
                new RequestOptions({ timeoutMs }),
            );

        const mapping = response.results.find(
            (result) => result.item.party === actor.party,
        );

        if (
            !mapping
            || mapping.item.threshold <= 0
            || mapping.item.participants.length === 0
        ) {
            throw new Error(
                `No party-to-participant mapping with a positive threshold and participants was found for '${actor.party}' on synchronizer '${synchronizer}'.`,
            );
        }

        const submissionParticipant = mapping.item.participants.find(
            (participant) =>
                participant.participantUid.trim()
                && participant.permission === ParticipantPermission.submission,
        );

        if (!submissionParticipant) {
            throw new Error(
                `No submission participant with a non-empty UID was found for '${actor.party}'.`,
            );
        }

        const context = mapping.context;

        if (
            !context
            || context.serial <= 0
            || !isValidDate(context.validFrom)
            || (
                context.validUntil !== undefined
                && (
                    !isValidDate(context.validUntil)
                    || context.validUntil < context.validFrom
                )
            )
        ) {
            throw new Error(
                `Party-to-participant mapping for '${actor.party}' has invalid serial or effective timestamps.`,
            );
        }

        console.log(`Synchronizer: ${synchronizer}`);
        console.log(`Party: ${mapping.item.party}`);
        console.log(`Threshold: ${mapping.item.threshold}`);

        for (const participant of mapping.item.participants) {
            console.log(
                `Participant: ${participant.participantUid} (${participant.permission})`,
            );
        }

        console.log(`Context serial: ${context.serial}`);
        console.log(`Context valid from: ${formatDate(context.validFrom)}`);
        console.log(`Context valid until: ${formatDate(context.validUntil)}`);
    } finally {
        await client.disposeAsync();
    }
});

function formatDate(value: Date | undefined): string {
    return value?.toISOString() ?? "<none>";
}

function isValidDate(value: Date | undefined): value is Date {
    return value instanceof Date && !Number.isNaN(value.getTime());
}
