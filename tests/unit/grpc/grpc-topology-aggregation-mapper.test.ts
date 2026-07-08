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
                    signingKeys: [
                        {
                            format: 1,
                            publicKey: new Uint8Array([1, 2, 3]),
                            scheme: 0,
                            usage: [],
                            keySpec: 0,
                        },
                    ],
                    encryptionKeys: [
                        {
                            format: 1,
                            publicKey: new Uint8Array([4, 5, 6]),
                            scheme: 0,
                            keySpec: 0,
                        },
                    ],
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
        expect(listKeyOwnersResponse.results[0].signingKeys[0].fingerprint).toBe(
            "122073c069682f595c7c21974e4e6381cb413b08a7e7851296abd38f688d3cb8f1c8",
        );
        expect(
            listKeyOwnersResponse.results[0].encryptionKeys[0].fingerprint,
        ).toBe(
            "122060803466c5c84a11c08cb5b5d7d001582e28a0a887cf902c2fcc56e65ff1f016",
        );
    });
});
