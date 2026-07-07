import { describe, expect, it, vi } from "vitest";
import {
    ContractServiceClient,
    GetContractRequest,
    GetContractResponse,
    RequestOptions,
} from "../../../src";

describe("ContractServiceClient", () => {
    it("forwards contract read requests through the selected transport", async () => {
        const getContractAsync = vi.fn(
            async () =>
                new GetContractResponse({
                    createdEvent: undefined,
                }),
        );

        const transport = {
            features: { supportsCommandSigning: false },
            getContractAsync,
        };

        const client = new ContractServiceClient(transport as never);

        const options = new RequestOptions({
            timeoutMs: 5_000,
        });

        await expect(
            client.getContractAsync(
                new GetContractRequest({
                    contractId: "contract-1",
                    queryingParties: ["Alice"],
                }),
                options,
            ),
        ).resolves.toBeInstanceOf(GetContractResponse);

        expect(getContractAsync).toHaveBeenCalledWith(
            expect.any(GetContractRequest),
            options,
        );
    });
});
