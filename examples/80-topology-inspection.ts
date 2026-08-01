import {
    ListPartyToParticipantRequest,
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

        if (!mapping || mapping.item.participants.length === 0) {
            throw new Error(
                `No party-to-participant mapping with participants was found for '${actor.party}' on synchronizer '${synchronizer}'.`,
            );
        }

        const context = mapping.context;

        console.log(`Synchronizer: ${synchronizer}`);
        console.log(`Party: ${mapping.item.party}`);
        console.log(`Threshold: ${mapping.item.threshold}`);

        for (const participant of mapping.item.participants) {
            console.log(
                `Participant: ${participant.participantUid} (${participant.permission})`,
            );
        }

        console.log(`Context serial: ${context?.serial ?? "<none>"}`);
        console.log(`Context valid from: ${formatDate(context?.validFrom)}`);
        console.log(`Context valid until: ${formatDate(context?.validUntil)}`);
    } finally {
        await client.disposeAsync();
    }
});

function formatDate(value: Date | undefined): string {
    return value?.toISOString() ?? "<none>";
}
