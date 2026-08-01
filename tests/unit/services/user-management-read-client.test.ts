import { describe, expect, it, vi } from "vitest";
import {
    GetUserRequest,
    GetUserResponse,
    LedgerUser,
    ListUserRightsRequest,
    ListUserRightsResponse,
    ListUsersRequest,
    ListUsersResponse,
    RequestOptions,
    UserManagementServiceClient,
} from "../../../src";

describe("UserManagementServiceClient read methods", () => {
    it("forwards user read requests through the selected transport", async () => {
        const getUserRequest = new GetUserRequest({ userId: "user-1" });

        const getUserResponse = new GetUserResponse({
            user: new LedgerUser({ id: "user-1" }),
        });

        const getUserAsync = vi.fn(async () => getUserResponse);

        const listUsersRequest = new ListUsersRequest({ pageSize: 10 });

        const listUsersResponse = new ListUsersResponse({
            users: [new LedgerUser({ id: "user-1" })],
            nextPageToken: "next-1",
        });

        const listUsersAsync = vi.fn(async () => listUsersResponse);

        const listUserRightsRequest = new ListUserRightsRequest({
            userId: "user-1",
        });

        const listUserRightsResponse = new ListUserRightsResponse({ rights: [] });

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
                getUserRequest,
                options,
            ),
        ).resolves.toBe(getUserResponse);

        await expect(
            client.listUsersAsync(
                listUsersRequest,
                options,
            ),
        ).resolves.toBe(listUsersResponse);

        await expect(
            client.listUserRightsAsync(
                listUserRightsRequest,
                options,
            ),
        ).resolves.toBe(listUserRightsResponse);

        expect(getUserAsync).toHaveBeenCalledWith(
            getUserRequest,
            options,
        );
        expect(listUsersAsync).toHaveBeenCalledWith(
            listUsersRequest,
            options,
        );
        expect(listUserRightsAsync).toHaveBeenCalledWith(
            listUserRightsRequest,
            options,
        );
    });
});
