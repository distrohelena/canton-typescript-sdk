import { describe, expect, it } from "vitest";
import {
    ListAllV2Response,
    ListPartyToParticipantRequest,
    ListPartyToParticipantResponse,
    PartyToParticipant,
    ParticipantPermission,
    TopologyListVettedPackagesRequest,
    TopologyListVettedPackagesResponse,
    TopologyBaseQuery,
    TopologyMappingCode,
    TopologyMappingOperation,
    TopologyMappingResult,
    TopologyTransactions,
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

    it("constructs topology manager read request and response models", () => {
        const request = new ListPartyToParticipantRequest({
            baseQuery: new TopologyBaseQuery({
                includeProposals: false,
                operation: TopologyMappingOperation.addReplace,
                headState: true,
            }),
            filterParty: "Alice",
        });

        const response = new ListPartyToParticipantResponse({
            results: [],
        });

        const rawResponse = new ListAllV2Response({
            result: new TopologyTransactions({
                items: [],
            }),
        });

        const topologyListVettedPackagesRequest =
            new TopologyListVettedPackagesRequest({
                filterParticipant: "participant::sandbox",
            });

        const topologyListVettedPackagesResponse =
            new TopologyListVettedPackagesResponse({
                results: [],
            });

        expect(request.filterParty).toBe("Alice");
        expect(request.baseQuery?.headState).toBe(true);
        expect(response.results).toEqual([]);
        expect(rawResponse.result?.items).toEqual([]);
        expect(topologyListVettedPackagesRequest.filterParticipant).toBe(
            "participant::sandbox",
        );
        expect(topologyListVettedPackagesResponse.results).toEqual([]);
    });
});
