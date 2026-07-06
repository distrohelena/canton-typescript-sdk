import { describe, expect, it } from "vitest";
import {
    PartyToParticipant,
    ParticipantPermission,
    TopologyBaseQuery,
    TopologyMappingCode,
    TopologyMappingOperation,
    TopologyMappingResult,
} from "../../../src";

describe("topology dto core", () => {
    it("constructs shared topology query and result models", () => {
        const query = new TopologyBaseQuery({
            includeProposals: true,
            operation: TopologyMappingOperation.addReplace,
            headState: true,
        });

        const result = new TopologyMappingResult({
            item: new PartyToParticipant({
                party: "Alice",
                threshold: 1,
                participants: [],
            }),
        });

        expect(query.includeProposals).toBe(true);
        expect(query.operation).toBe(TopologyMappingOperation.addReplace);
        expect(query.headState).toBe(true);
        expect(result.item.party).toBe("Alice");
        expect(ParticipantPermission.submission).toBe("submission");
        expect(TopologyMappingCode.partyToParticipant).toBe(
            "partyToParticipant",
        );
    });
});
