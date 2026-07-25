import { describe, expect, it } from "vitest";
import {
    ParticipantInspectionServiceClient,
    RequestOptions,
    SynchronizerConnectivityServiceClient,
} from "../../../src";
import { GrpcTransport } from "../../../src/transports/grpc/grpc-transport.js";
import {
    ListRegisteredSynchronizersRequest,
    ListRegisteredSynchronizersResponse,
} from "../../../src/transports/grpc/generated/canton/com/digitalasset/canton/admin/participant/v30/synchronizer_connectivity_service.js";

describe("GrpcTransport batch 7 read services", () => {
    it("maps ACS commitment inspection and registered synchronizer reads", async () => {
        const registeredSynchronizersResponse =
            ListRegisteredSynchronizersResponse.create({ results: [] });
        const transport = new GrpcTransport({
            getHealthAsync: async () => ({ version: "3.4.0", features: {} }),
            checkHealthAsync: async () => ({ status: 1 }),
            createPartyAsync: async () => ({ identifier: "unused" }),
            listPartiesAsync: async () => ({ partyDetails: [], nextPageToken: "" }),
            grantUserRightsAsync: async () => ({ rights: [] }),
            uploadPackageAsync: async () => ({ packageId: "unused" }),
            queryContractsAsync: async () => ({ activeContracts: [] }),
            getUpdatesAsync: async () => [],
            submitCommandAsync: async () => ({ updateId: "unused" }),
            lookupSentAcsCommitmentsAsync: async () => ({
                sent: [
                    {
                        synchronizerId: "sync-1",
                        sent: [
                            {
                                interval: {
                                    startTickExclusive: {
                                        seconds: "1735689600",
                                        nanos: 0,
                                    },
                                    endTickInclusive: {
                                        seconds: "1735689660",
                                        nanos: 0,
                                    },
                                },
                                destCounterParticipantUid: "participant-2",
                                ownCommitment: new Uint8Array([1, 2]),
                                receivedCommitment: new Uint8Array([3, 4]),
                                state: 2,
                            },
                        ],
                    },
                ],
            }),
            lookupReceivedAcsCommitmentsAsync: async () => ({
                received: [
                    {
                        synchronizerId: "sync-1",
                        received: [
                            {
                                interval: {
                                    startTickExclusive: {
                                        seconds: "1735689720",
                                        nanos: 0,
                                    },
                                    endTickInclusive: {
                                        seconds: "1735689780",
                                        nanos: 0,
                                    },
                                },
                                originCounterParticipantUid: "participant-3",
                                receivedCommitment: new Uint8Array([5, 6]),
                                ownCommitment: new Uint8Array([7, 8]),
                                state: 1,
                            },
                        ],
                    },
                ],
            }),
            listRegisteredSynchronizersAsync: async () => registeredSynchronizersResponse,
        } as any);

        const participantInspection = new ParticipantInspectionServiceClient(
            transport,
        );

        const synchronizerConnectivity =
            new SynchronizerConnectivityServiceClient(transport);

        const options = new RequestOptions({
            timeoutMs: 1_000,
        });

        const sent = await (participantInspection as any)
            .lookupSentAcsCommitmentsAsync(
                {
                    timeRanges: [],
                    counterParticipantIds: ["participant-2"],
                    commitmentState: [],
                    verbose: true,
                },
                options,
            );

        const received = await (participantInspection as any)
            .lookupReceivedAcsCommitmentsAsync(
                {
                    timeRanges: [],
                    counterParticipantIds: ["participant-3"],
                    commitmentState: [],
                    verbose: true,
                },
                options,
            );

        const registered = await synchronizerConnectivity
            .listRegisteredSynchronizersAsync(
                ListRegisteredSynchronizersRequest.create({ allStatuses: true }),
                options,
            );

        expect(sent.sent[0]?.sent[0]?.destCounterParticipantUid).toBe(
            "participant-2",
        );
        expect(received.received[0]?.received[0]?.originCounterParticipantUid).toBe(
            "participant-3",
        );
        expect(registered).toBe(registeredSynchronizersResponse);
    });
});
