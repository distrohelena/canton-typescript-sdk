import { describe, expect, it, vi } from "vitest";
import {
    AddTopologyTransactionsRequest,
    AddTopologyTransactionsResponse,
    GenerateTopologyTransactionsRequest,
    GenerateTopologyTransactionsResponse,
    RequestOptions,
    TopologyManagerWriteServiceClient,
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
});
