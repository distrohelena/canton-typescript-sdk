import { describe, expect, it, vi } from "vitest";
import {
    RequestOptions,
    UserManagementServiceClient,
} from "../../../src";
import {
    GetUserRequest,
    GetUserResponse,
    ListUserRightsRequest,
    ListUserRightsResponse,
    ListUsersRequest,
    ListUsersResponse,
} from "../../../src/transports/grpc/generated/canton/com/daml/ledger/api/v2/admin/user_management_service.js";

describe("UserManagementServiceClient read methods", () => {
    it("forwards user read requests through the selected transport", async () => {
        const getUserResponse = GetUserResponse.create();
        const getUserAsync = vi.fn(async () => getUserResponse);

        const listUsersResponse = ListUsersResponse.create({
            nextPageToken: "next-1",
        });
        const listUsersAsync = vi.fn(async () => listUsersResponse);

        const listUserRightsResponse = ListUserRightsResponse.create();
        const listUserRightsAsync = vi.fn(async () => listUserRightsResponse);

        const transport = {
            features: { supportsCommandSigning: false },
            getUserAsync,
            listUsersAsync,
            listUserRightsAsync,
        };

        const client = new UserManagementServiceClient(transport as never);

        const options = new RequestOptions({
            timeoutMs: 5_000,
        });

        await expect(
            client.getUserAsync(
                GetUserRequest.create({
                    userId: "user-1",
                }),
                options,
            ),
        ).resolves.toBe(getUserResponse);

        await expect(
            client.listUsersAsync(
                ListUsersRequest.create({
                    pageSize: 10,
                }),
                options,
            ),
        ).resolves.toBe(listUsersResponse);

        await expect(
            client.listUserRightsAsync(
                ListUserRightsRequest.create({
                    userId: "user-1",
                }),
                options,
            ),
        ).resolves.toBe(listUserRightsResponse);

        expect(getUserAsync).toHaveBeenCalledWith(
            GetUserRequest.create({ userId: "user-1" }),
            options,
        );
        expect(listUsersAsync).toHaveBeenCalledWith(
            ListUsersRequest.create({ pageSize: 10 }),
            options,
        );
        expect(listUserRightsAsync).toHaveBeenCalledWith(
            ListUserRightsRequest.create({ userId: "user-1" }),
            options,
        );
    });
});
