import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const examplePath = new URL(
    "../../../examples/30-decentralized-party-ed25519.ts",
    import.meta.url,
);

describe("decentralized party example", () => {
    it("creates and proves a decentralized party through PartyToParticipant", () => {
        const example = readFileSync(examplePath, "utf8");

        expect(example).toContain("createDecentralizedPartyAsync");
        expect(example).toContain("owners: [ownerOne, ownerTwo]");
        expect(example).toContain("ownerThreshold: 2");
        expect(example).toContain("partySigningKeys: [partySigningKey]");
        expect(example).toContain("partySigningThreshold: 1");
        expect(example).toContain("confirmationThreshold: 1");
        expect(example).toContain("getParticipantIdAsync");
        expect(example).toContain("WaitForPartyHostingRequest");
        expect(example).toContain(
            "topologyAggregationService.waitForPartyHostingAsync(",
        );
        expect(example).toContain("participantId: localParticipant.participantId");
        expect(example).toContain("synchronizerId: synchronizer");
        expect(example).not.toContain("./shared/party-hosting.js");
        expect(example).not.toContain("./shared/party-to-participant.js");
        expect(example).not.toContain("ListPartiesRequest");
        expect(example).not.toContain("listPartiesAsync");
        expect(example).not.toContain("listPartyToParticipantAsync");
        expect(example).toContain("computePublicKeyFingerprint(");
        expect(example).not.toContain("PartyToKeyMapping");
    });
});
