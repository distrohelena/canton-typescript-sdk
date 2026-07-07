import { describe, expect, it, vi } from "vitest";
import {
    EventQueryServiceClient,
    GetEventsByContractIdRequest,
    GetEventsByContractIdResponse,
    RequestOptions,
} from "../../../src";

describe("EventQueryServiceClient", () => {
    it("forwards event query requests through the selected transport", async () => {
        const getEventsByContractIdAsync = vi.fn(
            async () =>
                new GetEventsByContractIdResponse({
                    created: undefined,
                    archived: undefined,
                }),
        );

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
                new GetEventsByContractIdRequest({
                    contractId: "contract-1",
                }),
                options,
            ),
        ).resolves.toBeInstanceOf(GetEventsByContractIdResponse);

        expect(getEventsByContractIdAsync).toHaveBeenCalledWith(
            expect.any(GetEventsByContractIdRequest),
            options,
        );
    });
});
