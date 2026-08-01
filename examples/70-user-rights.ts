import {
    GetUserRequest,
    ListUserRightsRequest,
    ListUsersRequest,
    RequestOptions,
} from "@distrohelena/canton-typescript-sdk";
import { createExampleClient, exampleTimeoutMs } from "./shared/localnet.js";
import { runExampleAsync } from "./shared/run.js";

runExampleAsync("user-rights", async () => {
    const client = createExampleClient();

    try {
        const timeoutMs = exampleTimeoutMs();

        const userId = (process.env.SDK_EXAMPLE_USER_ID ?? "ledger-api-user").trim();

        if (process.env.SDK_EXAMPLE_USER_ID !== undefined && !userId) {
            throw new Error("SDK_EXAMPLE_USER_ID must not be empty.");
        }

        const userResponse = await client.userManagementService.getUserAsync(
            new GetUserRequest({ userId }),
            new RequestOptions({ timeoutMs }),
        );

        const user = userResponse.user;

        if (user?.id !== userId) {
            throw new Error(`User '${userId}' was not returned by getUserAsync.`);
        }

        const rightsResponse =
            await client.userManagementService.listUserRightsAsync(
                new ListUserRightsRequest({ userId }),
                new RequestOptions({ timeoutMs }),
            );

        let pageToken: string | undefined;

        let listedUser: typeof user | undefined;

        const seenPageTokens = new Set<string>();

        do {
            const response = await client.userManagementService.listUsersAsync(
                new ListUsersRequest({ pageToken, pageSize: 100 }),
                new RequestOptions({ timeoutMs }),
            );

            listedUser = response.users.find((user) => user.id === userId);

            if (listedUser !== undefined) {
                break;
            }

            const nextPageToken = response.nextPageToken;

            if (!nextPageToken) {
                break;
            } else if (seenPageTokens.has(nextPageToken)) {
                throw new Error(
                    `ListUsers returned repeated page token '${nextPageToken}' before finding user '${userId}'.`,
                );
            }

            seenPageTokens.add(nextPageToken);
            pageToken = nextPageToken;
        } while (true);

        if (listedUser === undefined) {
            throw new Error(`User '${userId}' was not found by listUsersAsync.`);
        }

        console.log(`User ID: ${user.id}`);
        console.log(`Deactivated: ${user.isDeactivated}`);
        console.log(`Primary party: ${user.primaryParty ?? "<none>"}`);
        console.log(`Listed confirmation: ${listedUser.id}`);

        if (rightsResponse.rights.length === 0) {
            console.log("Rights: <none>");
        } else {
            console.log("Rights:");

            for (const right of rightsResponse.rights) {
                console.log(
                    `- ${right.type}${right.party === undefined ? "" : `: ${right.party}`}`,
                );
            }
        }
    } finally {
        await client.disposeAsync();
    }
});
