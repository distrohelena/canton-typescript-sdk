import {
    type CantonClient,
    CreateDecentralizedPartyRequest,
    ExternalPartyCryptoKeyFormat,
    GetParticipantIdRequest,
} from "@distrohelena/canton-typescript-sdk";
import { comDigitalasset } from "@distrohelena/canton-typescript-sdk/protobuf";
import {
    createExampleClient,
    createPartyHint,
    discoverSynchronizerIdAsync,
} from "./shared/localnet.js";
import { createExampleEd25519Key } from "./shared/party-keys.js";
import { runExampleAsync } from "./shared/run.js";

const topologyPollIntervalMs = 500;

const topologyPollTimeoutMs = 30_000;

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
                    waitForAllocation: true,
                }),
            );

        const partyId = allocation.partyId;

        const localParticipant =
            await client.partyManagementService.getParticipantIdAsync(
                new GetParticipantIdRequest(),
            );

        await waitForPartyToParticipantAsync(
            client,
            partyId,
            localParticipant.participantId,
            partySigningKeyFingerprint,
            partySigningKey.publicKey.format,
        );

        console.log(`Decentralized party: ${partyId}`);
        console.log(
            `PartyToParticipant confirmed for ${localParticipant.participantId} with signing-key fingerprint: ${partySigningKeyFingerprint}`,
        );
    } finally {
        await client.disposeAsync();
    }
});

async function waitForPartyToParticipantAsync(
    client: Pick<
        CantonClient,
        "hashing" | "topologyManagerReadService"
    >,
    partyId: string,
    expectedParticipantId: string,
    partySigningKeyFingerprint: string,
    partySigningKeyFormat: ExternalPartyCryptoKeyFormat,
): Promise<void> {
    const deadline = Date.now() + topologyPollTimeoutMs;

    while (Date.now() <= deadline) {
        const response =
            await client.topologyManagerReadService.listPartyToParticipantAsync(
                ListPartyToParticipantRequest.create({ filterParty: partyId }),
            );

        const mapping = response.results
            .map(result => result.item)
            .find(item => item?.party === partyId);

        const partySigningKeys = mapping?.partySigningKeys;

        if (
            mapping !== undefined &&
            mapping.participants.some(
                participant => participant.participantUid === expectedParticipantId,
            ) &&
            partySigningKeys !== undefined &&
            partySigningKeys.threshold === 1 &&
            partySigningKeys.keys.some(
                key =>
                    client.hashing.computePublicKeyFingerprint(
                        key.publicKey,
                        partySigningKeyFormat,
                    ) === partySigningKeyFingerprint,
            )
        ) {
            return;
        }

        await new Promise(resolve => setTimeout(resolve, topologyPollIntervalMs));
    }

    throw new Error(
        `Timed out waiting for PartyToParticipant topology for ${partyId}.`,
    );
}
