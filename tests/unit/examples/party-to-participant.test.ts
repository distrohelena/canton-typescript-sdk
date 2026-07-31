import { describe, expect, it, vi } from "vitest";
import {
    waitForPartyToParticipantAsync,
    type PartyToParticipantMapping,
} from "../../../examples/shared/party-to-participant.js";

const expectedPartyId = "party::namespace";

const expectedParticipantId = "participant::namespace";

const expectedFingerprint = "expected-fingerprint";

function mapping(init: {
    party?: string;
    participantUids?: readonly string[];
    signingThreshold?: number;
    signingKeys?: readonly Uint8Array[];
} = {}): PartyToParticipantMapping {
    return {
        party: init.party ?? expectedPartyId,
        participants: (init.participantUids ?? []).map(participantUid => ({
            participantUid,
        })),
        partySigningKeys: init.signingThreshold === undefined
            ? undefined
            : {
                threshold: init.signingThreshold,
                keys: (init.signingKeys ?? []).map(publicKey => ({ publicKey })),
            },
    };
}

describe("PartyToParticipant polling", () => {
    it("succeeds when the expected participant and signing key appear", async () => {
        const readMappingsAsync = vi.fn(async () => [mapping({
            participantUids: [expectedParticipantId],
            signingThreshold: 1,
            signingKeys: [new Uint8Array([1])],
        })]);

        const sleepAsync = vi.fn(async () => {});

        await expect(waitForPartyToParticipantAsync({
            partyId: expectedPartyId,
            expectedParticipantId,
            expectedSigningKeyFingerprint: expectedFingerprint,
            expectedSigningThreshold: 1,
            readMappingsAsync,
            computePublicKeyFingerprint: () => expectedFingerprint,
            now: () => 0,
            sleepAsync,
            pollIntervalMs: 1,
            timeoutMs: 1,
        })).resolves.toBeUndefined();

        expect(readMappingsAsync).toHaveBeenCalledTimes(1);
        expect(sleepAsync).not.toHaveBeenCalled();
    });

    it("retries and reports expected values with the last observed mapping on timeout", async () => {
        let now = 0;

        const readMappingsAsync = vi.fn(async () => [mapping({
            participantUids: ["participant::other"],
            signingThreshold: 0,
            signingKeys: [new Uint8Array([2])],
        })]);

        const sleepAsync = vi.fn(async () => {
            now += 5;
        });

        await expect(waitForPartyToParticipantAsync({
            partyId: expectedPartyId,
            expectedParticipantId,
            expectedSigningKeyFingerprint: expectedFingerprint,
            expectedSigningThreshold: 1,
            readMappingsAsync,
            computePublicKeyFingerprint: () => "observed-fingerprint",
            now: () => now,
            sleepAsync,
            pollIntervalMs: 5,
            timeoutMs: 10,
        })).rejects.toThrow(
            "expected participant UID 'participant::namespace', signing-key fingerprint 'expected-fingerprint', signing threshold 1; last observed mapping: party='party::namespace', participants=[participant::other], signingThreshold=0, signingKeyFingerprints=[observed-fingerprint]",
        );

        expect(readMappingsAsync).toHaveBeenCalledTimes(3);
        expect(sleepAsync).toHaveBeenCalledTimes(3);
    });
});
