import { CreateExternalPartyRequest } from "@distrohelena/canton-typescript-sdk";
import {
    createExampleClient,
    createPartyHint,
    discoverSynchronizerIdAsync,
} from "./shared/localnet.js";
import { createExampleEd25519Key } from "./shared/party-keys.js";
import { runExampleAsync } from "./shared/run.js";

runExampleAsync("external-party-ed25519", async () => {
    const client = createExampleClient();

    try {
        const synchronizer = await discoverSynchronizerIdAsync(
            client,
            process.env.SDK_EXAMPLE_SYNCHRONIZER,
        );

        const key = createExampleEd25519Key();

        const partyHint = createPartyHint();

        console.warn(
            "Warning: party allocation creates durable localnet topology state and is not cleaned up.",
        );

        const party = await client.partyManagementService.createExternalPartyAsync(
            new CreateExternalPartyRequest({
                synchronizer,
                partyHint,
                publicKey: key.publicKey,
                // This ephemeral Node key is discarded on exit; replace only this callback with an HSM/KMS signer in production.
                sign: key.sign,
                waitForAllocation: true,
            }),
        );

        console.log(`External party: ${party.partyId}`);
        console.log(
            `Public-key fingerprint: ${client.hashing.computePublicKeyFingerprint(
                key.publicKey.keyData,
                key.publicKey.format,
            )}`,
        );
    } finally {
        await client.disposeAsync();
    }
});
