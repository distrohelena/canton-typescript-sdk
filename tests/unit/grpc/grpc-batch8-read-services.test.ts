import { describe, expect, it } from "vitest";
import {
    CommitmentChunkObserver,
    ParticipantInspectionServiceClient,
    RequestOptions,
} from "../../../src";
import { GrpcTransport } from "../../../src/transports/grpc/grpc-transport.js";

describe("GrpcTransport batch 8 read services", () => {
    it("maps commitment chunk inspection reads", async () => {
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
            openCommitmentAsync: async () => [
                {
                    chunk: new Uint8Array([1, 2, 3]),
                },
            ],
            inspectCommitmentContractsAsync: async () => [
                {
                    chunk: new Uint8Array([4, 5, 6]),
                },
            ],
        } as any);

        const participantInspection = new ParticipantInspectionServiceClient(
            transport,
        );

        const options = new RequestOptions({
            timeoutMs: 1_000,
        });

        const openCommitmentChunks: Uint8Array[] = [];

        const inspectCommitmentContractsChunks: Uint8Array[] = [];

        const openCommitmentObserver: CommitmentChunkObserver = {
            nextAsync: async (chunk: any) => {
                openCommitmentChunks.push(chunk.chunk);
            },
        };

        const inspectCommitmentContractsObserver: CommitmentChunkObserver = {
            nextAsync: async (chunk: any) => {
                inspectCommitmentContractsChunks.push(chunk.chunk);
            },
        };

        await (participantInspection as any).openCommitmentAsync(
            {
                commitment: new Uint8Array([7, 8]),
                physicalSynchronizerId: "physical-sync-1",
                computedForCounterParticipantUid: "participant-2",
                periodEndTick: new Date("2026-01-01T00:00:00.000Z"),
            },
            openCommitmentObserver,
            options,
        );

        await (participantInspection as any).inspectCommitmentContractsAsync(
            {
                cids: [new Uint8Array([9, 10])],
                expectedSynchronizerId: "sync-1",
                timestamp: new Date("2026-01-01T00:00:00.000Z"),
                downloadPayload: true,
            },
            inspectCommitmentContractsObserver,
            options,
        );

        expect(openCommitmentChunks).toEqual([new Uint8Array([1, 2, 3])]);
        expect(inspectCommitmentContractsChunks).toEqual([
            new Uint8Array([4, 5, 6]),
        ]);
    });
});
