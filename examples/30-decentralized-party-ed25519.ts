import {
    CreateDecentralizedPartyRequest,
    WaitForPartyHostingRequest,
} from "@distrohelena/canton-typescript-sdk";
import { ledgerApiV2 } from "@distrohelena/canton-typescript-sdk/protobuf";
import {
    createExampleClient,
    createPartyHint,
    discoverSynchronizerIdAsync,
} from "./shared/localnet.js";
import { createExampleEd25519Key } from "./shared/party-keys.js";
import { runExampleAsync } from "./shared/run.js";

runExampleAsync("decentralized-party-ed25519", async () => {
    const client = createExampleClient();

    try {
        const synchronizer = await discoverSynchronizerIdAsync(
            client,
            process.env.SDK_EXAMPLE_SYNCHRONIZER,
        );

        const ownerOne = createExampleEd25519Key();

        const ownerTwo = createExampleEd25519Key();

        const partySigningKey = createExampleEd25519Key();

        const partyHint = createPartyHint();

        const partySigningKeyFingerprint =
            client.hashing.computePublicKeyFingerprint(
                partySigningKey.publicKey.keyData,
                partySigningKey.publicKey.format,
            );

        console.warn(
            "Warning: decentralized party creation creates durable localnet topology state and is not cleaned up.",
        );

        const allocation =
            await client.partyManagementService.createDecentralizedPartyAsync(
                new CreateDecentralizedPartyRequest({
                    synchronizer,
                    partyHint,
                    owners: [ownerOne, ownerTwo],
                    ownerThreshold: 2,
                    partySigningKeys: [partySigningKey],
                    partySigningThreshold: 1,
                    confirmationThreshold: 1,
                    waitForAllocation: true,
                }),
            );

        const partyId = allocation.partyId;

        const localParticipant =
            await client.partyManagementService.getParticipantIdAsync(
                ledgerApiV2.admin.GetParticipantIdRequest.create(),
            );

        await client.topologyAggregationService.waitForPartyHostingAsync(
            new WaitForPartyHostingRequest({
                partyId,
                participantId: localParticipant.participantId,
                synchronizerId: synchronizer,
            }),
        );

        console.log(`Decentralized party: ${partyId}`);
        console.log(
            `PartyToParticipant confirmed for ${localParticipant.participantId} on ${synchronizer}; submitted signing-key fingerprint: ${partySigningKeyFingerprint}`,
        );
    } finally {
        await client.disposeAsync();
    }
});
