import { describe, expect, it, vi } from "vitest";
import {
    CommitmentChunkObserver,
    CountInFlightRequest,
    CountInFlightResponse,
    GetConfigForSlowCounterParticipantsRequest,
    GetConfigForSlowCounterParticipantsResponse,
    GetIntervalsBehindForCounterParticipantsRequest,
    GetIntervalsBehindForCounterParticipantsResponse,
    LookupOffsetByTimeRequest,
    LookupOffsetByTimeResponse,
    ParticipantInspectionServiceClient,
    RequestOptions,
} from "../../../src";

describe("ParticipantInspectionServiceClient", () => {
    it("forwards participant inspection requests through the selected transport", async () => {
        const lookupOffsetByTimeAsync = vi.fn(
            async () =>
                new LookupOffsetByTimeResponse({
                    offset: "42",
                }),
        );

        const countInFlightAsync = vi.fn(
            async () =>
                new CountInFlightResponse({
                    pendingSubmissions: 1,
                    pendingTransactions: 2,
                }),
        );

        const getConfigForSlowCounterParticipantsAsync = vi.fn(
            async () =>
                new GetConfigForSlowCounterParticipantsResponse({
                    configs: [],
                }),
        );

        const getIntervalsBehindForCounterParticipantsAsync = vi.fn(
            async () =>
                new GetIntervalsBehindForCounterParticipantsResponse({
                    intervalsBehind: [],
                }),
        );

        const lookupSentAcsCommitmentsAsync = vi.fn(
            async () => ({
                sent: [],
            }),
        );

        const lookupReceivedAcsCommitmentsAsync = vi.fn(
            async () => ({
                received: [],
            }),
        );

        const openCommitmentAsync = vi.fn(
            async (_request, observer: CommitmentChunkObserver) => {
                await observer.nextAsync({
                    chunk: new Uint8Array([1, 2, 3]),
                });
            },
        );

        const inspectCommitmentContractsAsync = vi.fn(
            async (_request, observer: CommitmentChunkObserver) => {
                await observer.nextAsync({
                    chunk: new Uint8Array([4, 5, 6]),
                });
            },
        );

        const transport = {
            features: { supportsCommandSigning: false },
            disposeAsync: async () => undefined,
            lookupOffsetByTimeAsync,
            countInFlightAsync,
            getConfigForSlowCounterParticipantsAsync,
            getIntervalsBehindForCounterParticipantsAsync,
            lookupSentAcsCommitmentsAsync,
            lookupReceivedAcsCommitmentsAsync,
            openCommitmentAsync,
            inspectCommitmentContractsAsync,
        };

        const client = new ParticipantInspectionServiceClient(transport as never);

        const options = new RequestOptions({
            timeoutMs: 5_000,
        });

        const openCommitmentObserver: CommitmentChunkObserver = {
            nextAsync: async () => undefined,
        };

        const inspectCommitmentContractsObserver: CommitmentChunkObserver = {
            nextAsync: async () => undefined,
        };

        await client.lookupOffsetByTimeAsync(
            new LookupOffsetByTimeRequest({
                timestamp: new Date("2026-01-01T00:00:00.000Z"),
            }),
            options,
        );

        await client.countInFlightAsync(
            new CountInFlightRequest({
                synchronizerId: "sync-1",
            }),
            options,
        );

        await client.getConfigForSlowCounterParticipantsAsync(
            new GetConfigForSlowCounterParticipantsRequest({
                synchronizerIds: ["sync-1"],
            }),
            options,
        );

        await client.getIntervalsBehindForCounterParticipantsAsync(
            new GetIntervalsBehindForCounterParticipantsRequest({
                counterParticipantIds: ["participant-1"],
                synchronizerIds: ["sync-1"],
                threshold: "3",
            }),
            options,
        );

        await (client as any).lookupSentAcsCommitmentsAsync(
            {
                timeRanges: [],
                counterParticipantIds: ["participant-1"],
                commitmentState: [],
                verbose: true,
            },
            options,
        );

        await (client as any).lookupReceivedAcsCommitmentsAsync(
            {
                timeRanges: [],
                counterParticipantIds: ["participant-1"],
                commitmentState: [],
                verbose: true,
            },
            options,
        );

        await (client as any).openCommitmentAsync(
            {
                commitment: new Uint8Array([7, 8]),
                physicalSynchronizerId: "physical-sync-1",
                computedForCounterParticipantUid: "participant-2",
                periodEndTick: new Date("2026-01-01T00:00:00.000Z"),
            },
            openCommitmentObserver,
            options,
        );

        await (client as any).inspectCommitmentContractsAsync(
            {
                cids: [new Uint8Array([9, 10])],
                expectedSynchronizerId: "sync-1",
                timestamp: new Date("2026-01-01T00:00:00.000Z"),
                downloadPayload: true,
            },
            inspectCommitmentContractsObserver,
            options,
        );

        expect(lookupOffsetByTimeAsync).toHaveBeenLastCalledWith(
            expect.any(LookupOffsetByTimeRequest),
            options,
        );
        expect(countInFlightAsync).toHaveBeenLastCalledWith(
            expect.any(CountInFlightRequest),
            options,
        );
        expect(getConfigForSlowCounterParticipantsAsync).toHaveBeenLastCalledWith(
            expect.any(GetConfigForSlowCounterParticipantsRequest),
            options,
        );
        expect(
            getIntervalsBehindForCounterParticipantsAsync,
        ).toHaveBeenLastCalledWith(
            expect.any(GetIntervalsBehindForCounterParticipantsRequest),
            options,
        );
        expect(lookupSentAcsCommitmentsAsync).toHaveBeenLastCalledWith(
            {
                timeRanges: [],
                counterParticipantIds: ["participant-1"],
                commitmentState: [],
                verbose: true,
            },
            options,
        );
        expect(lookupReceivedAcsCommitmentsAsync).toHaveBeenLastCalledWith(
            {
                timeRanges: [],
                counterParticipantIds: ["participant-1"],
                commitmentState: [],
                verbose: true,
            },
            options,
        );
        expect(openCommitmentAsync).toHaveBeenLastCalledWith(
            {
                commitment: new Uint8Array([7, 8]),
                physicalSynchronizerId: "physical-sync-1",
                computedForCounterParticipantUid: "participant-2",
                periodEndTick: new Date("2026-01-01T00:00:00.000Z"),
            },
            openCommitmentObserver,
            options,
        );
        expect(inspectCommitmentContractsAsync).toHaveBeenLastCalledWith(
            {
                cids: [new Uint8Array([9, 10])],
                expectedSynchronizerId: "sync-1",
                timestamp: new Date("2026-01-01T00:00:00.000Z"),
                downloadPayload: true,
            },
            inspectCommitmentContractsObserver,
            options,
        );
    });
});
