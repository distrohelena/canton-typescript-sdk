import { describe, expect, it } from "vitest";
import {
    ListKeyOwnersRequest,
    ParticipantPermission,
    TopologyListPartiesRequest,
} from "../../../src";
import {
    mapGrpcListKeyOwnersRequest,
    mapGrpcListKeyOwnersResponse,
    mapGrpcTopologyListPartiesRequest,
    mapGrpcTopologyListPartiesResponse,
} from "../../../src/transports/grpc/mappers/topology-aggregation-mapper.js";

describe("gRPC topology aggregation mappers", () => {
    it("maps topology aggregation requests", () => {
        const listPartiesRequest = mapGrpcTopologyListPartiesRequest(
            new TopologyListPartiesRequest({
                limit: 10,
                synchronizerIds: ["sync::sandbox"],
                filterParty: "Alice",
                filterParticipant: "participant::sandbox",
            }),
        );

        const listKeyOwnersRequest = mapGrpcListKeyOwnersRequest(
            new ListKeyOwnersRequest({
                limit: 5,
                synchronizerIds: ["sync::sandbox"],
                filterKeyOwnerType: "Participant",
                filterKeyOwnerUid: "participant::sandbox",
            }),
        );

        expect(listPartiesRequest).toMatchObject({
            limit: 10,
            synchronizerIds: ["sync::sandbox"],
            filterParty: "Alice",
            filterParticipant: "participant::sandbox",
        });
        expect(listKeyOwnersRequest).toMatchObject({
            limit: 5,
            synchronizerIds: ["sync::sandbox"],
            filterKeyOwnerType: "Participant",
            filterKeyOwnerUid: "participant::sandbox",
        });
    });

    it("defaults omitted synchronizer ids to an empty array for plain-object requests", () => {
        const listPartiesRequest = mapGrpcTopologyListPartiesRequest({
            filterParty: "Alice",
        } as TopologyListPartiesRequest);

        const listKeyOwnersRequest = mapGrpcListKeyOwnersRequest({
            filterKeyOwnerUid: "participant::sandbox",
        } as ListKeyOwnersRequest);

        expect(listPartiesRequest.synchronizerIds).toEqual([]);
        expect(listKeyOwnersRequest.synchronizerIds).toEqual([]);
    });

    it("maps topology aggregation responses", () => {
        const listPartiesResponse = mapGrpcTopologyListPartiesResponse({
            results: [
                {
                    party: "Alice",
                    participants: [
                        {
                            participantUid: "participant::sandbox",
                            synchronizers: [
                                {
                                    synchronizerId: "sync::sandbox",
                                    permission: 1,
                                    physicalSynchronizerId: "sync-physical",
                                },
                            ],
                        },
                    ],
                },
            ],
        });

        const listKeyOwnersResponse = mapGrpcListKeyOwnersResponse({
            results: [
                {
                    synchronizerId: "sync::sandbox",
                    keyOwner: "participant::sandbox",
                    signingKeys: [],
                    encryptionKeys: [],
                    physicalSynchronizerId: "sync-physical",
                },
            ],
        });

        expect(
            listPartiesResponse.results[0].participants[0].synchronizers[0]
                .permission,
        ).toBe(ParticipantPermission.submission);
        expect(listKeyOwnersResponse.results[0].keyOwner).toBe(
            "participant::sandbox",
        );
    });
});
