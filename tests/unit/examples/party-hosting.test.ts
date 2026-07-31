import { describe, expect, it, vi } from "vitest";
import { waitForPartyHostingAsync } from "../../../examples/shared/party-hosting.js";

describe("aggregated party-hosting polling", () => {
    it("exports a bounded polling helper", async () => {
        const module = await import("../../../examples/shared/party-hosting.js");

        expect(module.waitForPartyHostingAsync).toBeTypeOf("function");
    });

    it("succeeds when the expected party, participant, and synchronizer appear", async () => {
        const readPartiesAsync = vi.fn(async () => [{
            party: "party::namespace",
            participants: [{
                participantUid: "participant::namespace",
                synchronizers: [{ synchronizerId: "sync::namespace" }],
            }],
        }]);

        await expect(waitForPartyHostingAsync({
            partyId: "party::namespace",
            expectedParticipantId: "participant::namespace",
            expectedSynchronizerId: "sync::namespace",
            readPartiesAsync,
            now: () => 0,
            sleepAsync: vi.fn(async () => {}),
            timeoutMs: 1,
        })).resolves.toBeUndefined();

        expect(readPartiesAsync).toHaveBeenCalledTimes(1);
    });

    it("retries and reports the last observed hosting state on timeout", async () => {
        let now = 0;

        const readPartiesAsync = vi.fn(async () => [{
            party: "party::namespace",
            participants: [{
                participantUid: "participant::other",
                synchronizers: [{ synchronizerId: "sync::other" }],
            }],
        }]);

        const sleepAsync = vi.fn(async () => {
            now += 5;
        });

        await expect(waitForPartyHostingAsync({
            partyId: "party::namespace",
            expectedParticipantId: "participant::namespace",
            expectedSynchronizerId: "sync::namespace",
            readPartiesAsync,
            now: () => now,
            sleepAsync,
            pollIntervalMs: 5,
            timeoutMs: 10,
        })).rejects.toThrow(
            "expected participant UID 'participant::namespace' on synchronizer 'sync::namespace'; last observed hosting: party='party::namespace', participants=[participant::other@sync::other]",
        );

        expect(readPartiesAsync).toHaveBeenCalledTimes(3);
        expect(sleepAsync).toHaveBeenCalledTimes(3);
    });
});
