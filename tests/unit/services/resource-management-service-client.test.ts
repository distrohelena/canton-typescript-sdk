import { describe, expect, it, vi } from "vitest";
import {
    RequestOptions,
    ResourceManagementServiceClient,
} from "../../../src";
import {
    GetResourceLimitsRequest,
    GetResourceLimitsResponse,
} from "../../../src/transports/grpc/generated/canton/com/digitalasset/canton/admin/participant/v30/resource_management_service.js";

describe("ResourceManagementServiceClient", () => {
    it("forwards resource limit reads through the selected transport", async () => {
        const getResourceLimitsAsync = vi.fn(
            async () =>
                GetResourceLimitsResponse.create({
                    currentLimits: {
                        maxInflightValidationRequests: 50,
                        maxSubmissionRate: 100,
                        maxSubmissionBurstFactor: 2.5,
                    },
                }),
        );

        const transport = {
            features: { supportsCommandSigning: false },
            disposeAsync: async () => undefined,
            getResourceLimitsAsync,
        };

        const client = new ResourceManagementServiceClient(transport as never);

        const request = GetResourceLimitsRequest.create();

        const options = new RequestOptions({
            timeoutMs: 5_000,
        });

        await expect(
            client.getResourceLimitsAsync(
                request,
                options,
            ),
        ).resolves.toEqual(GetResourceLimitsResponse.create({
            currentLimits: {
                maxInflightValidationRequests: 50,
                maxSubmissionRate: 100,
                maxSubmissionBurstFactor: 2.5,
            },
        }));

        expect(getResourceLimitsAsync).toHaveBeenCalledWith(
            request,
            options,
        );
    });
});
