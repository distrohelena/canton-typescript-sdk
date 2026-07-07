import { describe, expect, it } from "vitest";
import {
    GetNoWaitCommitmentsFromRequest,
    GetParticipantPruningScheduleRequest,
    GetPruningScheduleRequest,
    GetSafePruningOffsetRequest,
    PruningServiceClient,
    RequestOptions,
    SafeToPruneCommitmentState,
    TopologyDuration,
} from "../../../src";
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
            streamTransactionsAsync: async () => [],
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
            new GetSafePruningOffsetRequest({
                beforeOrAt: new Date("2026-01-01T00:00:00.000Z"),
                ledgerEnd: "100",
                counterParticipantsCommitmentsState:
                    SafeToPruneCommitmentState.match,
            }),
            options,
        );

        const schedule = await pruning.getScheduleAsync(
            new GetPruningScheduleRequest(),
            options,
        );

        const participantSchedule =
            await pruning.getParticipantScheduleAsync(
                new GetParticipantPruningScheduleRequest(),
                options,
            );

        const noWait = await pruning.getNoWaitCommitmentsFromAsync(
            new GetNoWaitCommitmentsFromRequest({
                synchronizerIds: ["sync-1"],
                participantUids: ["participant-1"],
            }),
            options,
        );

        expect(safeOffset.hasSafePruningOffset).toBe(true);
        expect(safeOffset.safePruningOffset).toBe("42");
        expect(schedule.schedule?.maxDuration).toEqual(
            new TopologyDuration({
                seconds: "30",
                nanos: 0,
            }),
        );
        expect(participantSchedule.schedule?.pruneInternallyOnly).toBe(true);
        expect(noWait.ignoredParticipants[0]).toMatchObject({
            counterParticipantUid: "participant-1",
            synchronizerIds: ["sync-1"],
        });
    });
});
