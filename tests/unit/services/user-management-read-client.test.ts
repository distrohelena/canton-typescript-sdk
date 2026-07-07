import { describe, expect, it, vi } from "vitest";
import {
    GetUserRequest,
    GetUserResponse,
    ListUserRightsRequest,
    ListUserRightsResponse,
    ListUsersRequest,
    ListUsersResponse,
    RequestOptions,
    UserManagementServiceClient,
} from "../../../src";

describe("UserManagementServiceClient read methods", () => {
    it("forwards user read requests through the selected transport", async () => {
        const getUserAsync = vi.fn(
            async () =>
                new GetUserResponse({
                    user: undefined,
                }),
        );

        const listUsersAsync = vi.fn(
            async () =>
                new ListUsersResponse({
                    users: [],
                    nextPageToken: "next-1",
                }),
        );

        const listUserRightsAsync = vi.fn(
            async () =>
                new ListUserRightsResponse({
                    rights: [],
                }),
        );

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
                new GetUserRequest({
                    userId: "user-1",
                }),
                options,
            ),
        ).resolves.toBeInstanceOf(GetUserResponse);

        await expect(
            client.listUsersAsync(
                new ListUsersRequest({
                    pageSize: 10,
                }),
                options,
            ),
        ).resolves.toBeInstanceOf(ListUsersResponse);

        await expect(
            client.listUserRightsAsync(
                new ListUserRightsRequest({
                    userId: "user-1",
                }),
                options,
            ),
        ).resolves.toBeInstanceOf(ListUserRightsResponse);

        expect(getUserAsync).toHaveBeenCalledWith(
            expect.any(GetUserRequest),
            options,
        );
        expect(listUsersAsync).toHaveBeenCalledWith(
            expect.any(ListUsersRequest),
            options,
        );
        expect(listUserRightsAsync).toHaveBeenCalledWith(
            expect.any(ListUserRightsRequest),
            options,
        );
    });
});
