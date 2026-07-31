import { describe, expect, it } from "vitest";
import {
    PruningServiceClient,
    RequestOptions,
} from "../../../src";
import {
    GetNoWaitCommitmentsFromRequest,
    GetParticipantScheduleRequest,
    GetScheduleRequest,
} from "../../../src/transports/grpc/generated/canton/com/digitalasset/canton/admin/pruning/v30/pruning.js";
import {
    GetSafePruningOffsetRequest,
    SafeToPruneCommitmentState,
} from "../../../src/transports/grpc/generated/canton/com/digitalasset/canton/admin/participant/v30/pruning_service.js";
import { GrpcTransport } from "../../../src/transports/grpc/grpc-transport.js";

describe("GrpcTransport batch 5 read services", () => {
    it("maps pruning read methods", async () => {
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
            getSafePruningOffsetAsync: async () => ({
                response: {
                    oneofKind: "safePruningOffset",
                    safePruningOffset: "42",
                },
            }),
            getPruningScheduleAsync: async () => ({
                schedule: {
                    cron: "0 0 * * *",
                    maxDuration: {
                        seconds: "30",
                        nanos: 0,
                    },
                    retention: {
                        seconds: "3600",
                        nanos: 0,
                    },
                },
            }),
            getParticipantPruningScheduleAsync: async () => ({
                schedule: {
                    schedule: {
                        cron: "0 0 * * *",
                        maxDuration: {
                            seconds: "30",
                            nanos: 0,
                        },
                        retention: {
                            seconds: "3600",
                            nanos: 0,
                        },
                    },
                    pruneInternallyOnly: true,
                },
            }),
            getNoWaitCommitmentsFromAsync: async () => ({
                ignoredParticipants: [
                    {
                        counterParticipantUid: "participant-1",
                        synchronizers: {
                            synchronizerIds: ["sync-1"],
                        },
                    },
                ],
                notIgnoredParticipants: [],
            }),
        } as any);

        const options = new RequestOptions({
            timeoutMs: 1_000,
        });

        const pruning = new PruningServiceClient(transport);

        const safeOffset = await pruning.getSafePruningOffsetAsync(
            GetSafePruningOffsetRequest.create({
                beforeOrAt: { seconds: "1767225600", nanos: 0 },
                ledgerEnd: "100",
                counterParticipantsCommitmentsState:
                    SafeToPruneCommitmentState.MATCH,
            }),
            options,
        );

        const schedule = await pruning.getScheduleAsync(
            GetScheduleRequest.create(),
            options,
        );

        const participantSchedule =
            await pruning.getParticipantScheduleAsync(
                GetParticipantScheduleRequest.create(),
                options,
            );

        const noWait = await pruning.getNoWaitCommitmentsFromAsync(
            GetNoWaitCommitmentsFromRequest.create({
                synchronizerIds: ["sync-1"],
                participantUids: ["participant-1"],
            }),
            options,
        );

        expect(safeOffset.response).toEqual({
            oneofKind: "safePruningOffset",
            safePruningOffset: "42",
        });
        expect(schedule.schedule?.maxDuration).toEqual({
            seconds: "30",
            nanos: 0,
        });
        expect(participantSchedule.schedule?.pruneInternallyOnly).toBe(true);
        expect(noWait.ignoredParticipants[0]).toMatchObject({
            counterParticipantUid: "participant-1",
            synchronizers: { synchronizerIds: ["sync-1"] },
        });
    });
});
