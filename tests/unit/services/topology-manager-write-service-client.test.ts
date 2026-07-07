import { describe, expect, it, vi } from "vitest";
import {
    AddTopologyTransactionsRequest,
    AddTopologyTransactionsResponse,
    AssembleSignedTopologyTransactionsRequest,
    ExternalTopologySignature,
    GenerateTopologyTransactionsRequest,
    GenerateTopologyTransactionsResponse,
    PreparedTopologyTransaction,
    RequestOptions,
    TopologyManagerWriteServiceClient,
    TopologySignatureFormat,
} from "../../../src";

describe("TopologyManagerWriteServiceClient", () => {
    it("forwards topology write requests through the selected transport", async () => {
        const generateTopologyTransactionsAsync = vi.fn(
            async () =>
                new GenerateTopologyTransactionsResponse({
                    generatedTransactions: [],
                }),
        );

        const addTopologyTransactionsAsync = vi.fn(
            async () => new AddTopologyTransactionsResponse(),
        );

        const transport = {
            features: { supportsCommandSigning: false },
            disposeAsync: async () => undefined,
            generateTopologyTransactionsAsync,
            addTopologyTransactionsAsync,
        };

        const client = new TopologyManagerWriteServiceClient(transport as never);

        const generateRequest = new GenerateTopologyTransactionsRequest();

        const addRequest = new AddTopologyTransactionsRequest();

        const options = new RequestOptions({
            timeoutMs: 5_000,
        });

        await expect(
            client.generateTransactionsAsync(generateRequest, options),
        ).resolves.toBeInstanceOf(GenerateTopologyTransactionsResponse);
        await expect(
            client.addTransactionsAsync(addRequest, options),
        ).resolves.toBeInstanceOf(AddTopologyTransactionsResponse);

        expect(generateTopologyTransactionsAsync).toHaveBeenCalledWith(
            generateRequest,
            options,
        );
        expect(addTopologyTransactionsAsync).toHaveBeenCalledWith(
            addRequest,
            options,
        );
    });

    it("assembles signed topology transactions without using the transport", () => {
        const client = new TopologyManagerWriteServiceClient({} as never);

        const result = client.assembleSignedTransactions(
            new AssembleSignedTopologyTransactionsRequest({
                preparedTransactions: [
                    new PreparedTopologyTransaction({
                        serializedTransaction: new Uint8Array([1, 2]),
                        transactionHash: new Uint8Array([3, 4]),
                        proposal: true,
                    }),
                ],
                signatures: [
                    new ExternalTopologySignature({
                        transactionHash: new Uint8Array([3, 4]),
                        signature: new Uint8Array([5, 6]),
                        signedByFingerprint: "fingerprint::1",
                        signatureFormat: TopologySignatureFormat.ed25519,
                    }),
                ],
            }),
        );

        expect(result).toHaveLength(1);
        expect(result[0].proposal).toBe(true);
        expect(result[0].signatures).toHaveLength(1);
    });
});
