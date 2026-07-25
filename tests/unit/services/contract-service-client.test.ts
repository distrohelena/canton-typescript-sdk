import { describe, expect, it, vi } from "vitest";
import {
    ContractServiceClient,
    RequestOptions,
} from "../../../src";
import {
    GetContractRequest,
    GetContractResponse,
} from "../../../src/transports/grpc/generated/canton/com/daml/ledger/api/v2/contract_service.js";

describe("ContractServiceClient", () => {
    it("forwards contract read requests through the selected transport", async () => {
        const response = GetContractResponse.create({
            createdEvent: undefined,
        });
        const getContractAsync = vi.fn(async () => response);

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
                GetContractRequest.create({
                    contractId: "contract-1",
                    queryingParties: ["Alice"],
                }),
                options,
            ),
        ).resolves.toBe(response);

        expect(getContractAsync).toHaveBeenCalledWith(
            expect.objectContaining({
                contractId: "contract-1",
                queryingParties: ["Alice"],
            }),
            options,
        );
    });
});
