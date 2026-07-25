import { describe, expect, it, vi } from "vitest";
import {
    EventQueryServiceClient,
    RequestOptions,
} from "../../../src";
import {
    GetEventsByContractIdRequest,
    GetEventsByContractIdResponse,
} from "../../../src/transports/grpc/generated/canton/com/daml/ledger/api/v2/event_query_service.js";

describe("EventQueryServiceClient", () => {
    it("forwards event query requests through the selected transport", async () => {
        const response = GetEventsByContractIdResponse.create({
            created: undefined,
            archived: undefined,
        });
        const getEventsByContractIdAsync = vi.fn(async () => response);

        const transport = {
            features: { supportsCommandSigning: false },
            getEventsByContractIdAsync,
        };

        const client = new EventQueryServiceClient(transport as never);

        const options = new RequestOptions({
            timeoutMs: 5_000,
        });

        await expect(
            client.getEventsByContractIdAsync(
                GetEventsByContractIdRequest.create({
                    contractId: "contract-1",
                }),
                options,
            ),
        ).resolves.toBe(response);

        expect(getEventsByContractIdAsync).toHaveBeenCalledWith(
            expect.objectContaining({
                contractId: "contract-1",
            }),
            options,
        );
    });
});
