import { describe, expect, it, vi } from "vitest";
import {
    GetResourceLimitsRequest,
    GetResourceLimitsResponse,
    RequestOptions,
    ResourceLimits,
    ResourceManagementServiceClient,
} from "../../../src";

describe("ResourceManagementServiceClient", () => {
    it("forwards resource limit reads through the selected transport", async () => {
        const getResourceLimitsAsync = vi.fn(
            async () =>
                new GetResourceLimitsResponse({
                    currentLimits: new ResourceLimits({
                        maxInflightValidationRequests: 50,
                        maxSubmissionRate: 100,
                        maxSubmissionBurstFactor: 2.5,
                    }),
                }),
        );

        const transport = {
            features: { supportsCommandSigning: false },
            disposeAsync: async () => undefined,
            getResourceLimitsAsync,
        };

        const client = new ResourceManagementServiceClient(transport as never);

        const request = new GetResourceLimitsRequest();

        const options = new RequestOptions({
            timeoutMs: 5_000,
        });

        await expect(
            client.getResourceLimitsAsync(
                request,
                options,
            ),
        ).resolves.toBeInstanceOf(GetResourceLimitsResponse);

        expect(getResourceLimitsAsync).toHaveBeenCalledWith(
            request,
            options,
        );
    });
});
