import {
    CreateDecentralizedPartyRequest,
    GetParticipantIdRequest,
} from "@distrohelena/canton-typescript-sdk";
import { comDigitalasset } from "@distrohelena/canton-typescript-sdk/protobuf";
import {
    createExampleClient,
    createPartyHint,
    discoverSynchronizerIdAsync,
} from "./shared/localnet.js";
import { createExampleEd25519Key } from "./shared/party-keys.js";
import { waitForPartyToParticipantAsync } from "./shared/party-to-participant.js";
import { runExampleAsync } from "./shared/run.js";

const ListPartyToParticipantRequest =
    comDigitalasset.canton.topology.admin.v30.ListPartyToParticipantRequest;

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
                new GetParticipantIdRequest(),
            );

        await waitForPartyToParticipantAsync(
            {
                partyId,
                expectedParticipantId: localParticipant.participantId,
                expectedSigningKeyFingerprint: partySigningKeyFingerprint,
                expectedSigningThreshold: 1,
                readMappingsAsync: async () =>
                    (
                        await client.topologyManagerReadService.listPartyToParticipantAsync(
                            ListPartyToParticipantRequest.create({
                                filterParty: partyId,
                            }),
                        )
                    ).results.flatMap(result =>
                        result.item === undefined ? [] : [result.item],
                    ),
                computePublicKeyFingerprint: publicKey =>
                    client.hashing.computePublicKeyFingerprint(
                        publicKey,
                        partySigningKey.publicKey.format,
                    ),
            },
        );

        console.log(`Decentralized party: ${partyId}`);
        console.log(
            `PartyToParticipant confirmed for ${localParticipant.participantId} with signing-key fingerprint: ${partySigningKeyFingerprint}`,
        );
    } finally {
        await client.disposeAsync();
    }
});
