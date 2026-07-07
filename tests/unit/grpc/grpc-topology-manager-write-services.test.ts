import { describe, expect, it, vi } from "vitest";
import {
    AddTopologyTransactionsRequest,
    GenerateTopologyTransactionsRequest,
    GenerateTopologyTransactionsResponse,
    PartyToParticipant,
    RequestOptions,
} from "../../../src";
import { GrpcTransport } from "../../../src/transports/grpc/grpc-transport.js";

describe("GrpcTransport topology manager write services", () => {
    it("maps topology manager write generation responses", async () => {
        const generateTopologyTransactionsAsync = vi.fn(async () => ({
            generatedTransactions: [
                {
                    serializedTransaction: new Uint8Array([1, 2, 3]),
                    transactionHash: new Uint8Array([4, 5, 6]),
                },
            ],
        }));

        const addTopologyTransactionsAsync = vi.fn(async () => ({}));

        const transport = new GrpcTransport({
            getHealthAsync: async () => ({ version: "3.4.0", features: {} }),
            checkHealthAsync: async () => ({ status: 1 }),
            createPartyAsync: async () => ({ identifier: "unused" }),
            listPartiesAsync: async () => ({ partyDetails: [], nextPageToken: "" }),
            grantUserRightsAsync: async () => ({ rights: [] }),
            uploadPackageAsync: async () => ({ packageId: "unused" }),
            generateTopologyTransactionsAsync,
            addTopologyTransactionsAsync,
            queryContractsAsync: async () => ({ activeContracts: [] }),
            streamTransactionsAsync: async () => [],
            submitCommandAsync: async () => ({
                updateId: "unused",
                completionOffset: "0",
            }),
        } as any);

        const request = new GenerateTopologyTransactionsRequest({
            proposals: [
                {
                    mapping: new PartyToParticipant({
                        party: "ExternalParty::default",
                        participants: [],
                    }),
                },
            ],
        });

        const options = new RequestOptions({
            timeoutMs: 2_500,
        });

        const result = await transport.generateTopologyTransactionsAsync(
            request,
            options,
        );

        await transport.addTopologyTransactionsAsync(
            new AddTopologyTransactionsRequest({
                transactions: [],
            }),
            options,
        );

        expect(generateTopologyTransactionsAsync).toHaveBeenCalledWith(
            expect.objectContaining({
                proposals: expect.any(Array),
            }),
            expect.any(RequestOptions),
        );
        expect(addTopologyTransactionsAsync).toHaveBeenCalledWith(
            expect.objectContaining({
                transactions: [],
            }),
            expect.any(RequestOptions),
        );
        expect(result).toBeInstanceOf(GenerateTopologyTransactionsResponse);
        expect(result.generatedTransactions[0].transactionHash).toEqual(
            new Uint8Array([4, 5, 6]),
        );
    });
});
