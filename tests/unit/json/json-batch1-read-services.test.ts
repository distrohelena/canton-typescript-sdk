import { describe, expect, it } from "vitest";
import {
    CantonClient,
    CantonClientOptions,
    GetCompletionsRequest,
    GetConnectedSynchronizersRequest,
    GetContractRequest,
    GetEventsByContractIdRequest,
    GetLatestPrunedOffsetsRequest,
    GetLedgerEndRequest,
    GetParticipantIdRequest,
    GetPartiesRequest,
    GetUpdateByHashRequest,
    GetUpdateByIdRequest,
    GetUpdateByOffsetRequest,
    GetUpdatesPageRequest,
    GetUserRequest,
    ListKnownPackagesRequest,
    ListUserRightsRequest,
    ListUsersRequest,
    NotSupportedError,
    TransportKind,
} from "../../../src";

describe("Batch 1 read services with JSON transport", () => {
    it("rejects unsupported ledger-admin and ledger read methods", async () => {
        const client = new CantonClient(
            new CantonClientOptions({
                transportKind: TransportKind.json,
                ledgerEndpoint: "https://ledger.example.com",
                ledgerAdminEndpoint: "https://ledger-admin.example.com",
            }),
        );

        const calls = [
            [
                "PartyManagementService.GetParticipantId",
                () =>
                    client.partyManagementService.getParticipantIdAsync(
                        new GetParticipantIdRequest(),
                    ),
            ],
            [
                "PartyManagementService.GetParties",
                () =>
                    client.partyManagementService.getPartiesAsync(
                        new GetPartiesRequest({
                            parties: ["Alice"],
                        }),
                    ),
            ],
            [
                "UserManagementService.GetUser",
                () =>
                    client.userManagementService.getUserAsync(
                        new GetUserRequest({
                            userId: "user-1",
                        }),
                    ),
            ],
            [
                "UserManagementService.ListUsers",
                () =>
                    client.userManagementService.listUsersAsync(
                        new ListUsersRequest(),
                    ),
            ],
            [
                "UserManagementService.ListUserRights",
                () =>
                    client.userManagementService.listUserRightsAsync(
                        new ListUserRightsRequest({
                            userId: "user-1",
                        }),
                    ),
            ],
            [
                "PackageManagementService.ListKnownPackages",
                () =>
                    client.packageManagementService.listKnownPackagesAsync(
                        new ListKnownPackagesRequest(),
                    ),
            ],
            [
                "ContractService.GetContract",
                () =>
                    client.contractService.getContractAsync(
                        new GetContractRequest({
                            contractId: "contract-1",
                        }),
                    ),
            ],
            [
                "EventQueryService.GetEventsByContractId",
                () =>
                    client.eventQueryService.getEventsByContractIdAsync(
                        new GetEventsByContractIdRequest({
                            contractId: "contract-1",
                        }),
                    ),
            ],
            [
                "StateService.GetConnectedSynchronizers",
                () =>
                    client.stateService.getConnectedSynchronizersAsync(
                        new GetConnectedSynchronizersRequest(),
                    ),
            ],
            [
                "StateService.GetLedgerEnd",
                () =>
                    client.stateService.getLedgerEndAsync(
                        new GetLedgerEndRequest(),
                    ),
            ],
            [
                "StateService.GetLatestPrunedOffsets",
                () =>
                    client.stateService.getLatestPrunedOffsetsAsync(
                        new GetLatestPrunedOffsetsRequest(),
                    ),
            ],
            [
                "UpdateService.GetUpdateByOffset",
                () =>
                    client.updateService.getUpdateByOffsetAsync(
                        new GetUpdateByOffsetRequest({
                            offset: "1",
                        }),
                    ),
            ],
            [
                "UpdateService.GetUpdateById",
                () =>
                    client.updateService.getUpdateByIdAsync(
                        new GetUpdateByIdRequest({
                            updateId: "u-1",
                        }),
                    ),
            ],
            [
                "UpdateService.GetUpdateByHash",
                () =>
                    client.updateService.getUpdateByHashAsync(
                        new GetUpdateByHashRequest({
                            transactionHash: new Uint8Array([1]),
                        }),
                    ),
            ],
            [
                "UpdateService.GetUpdatesPage",
                () =>
                    client.updateService.getUpdatesPageAsync(
                        new GetUpdatesPageRequest(),
                    ),
            ],
            [
                "CommandCompletionService.GetCompletions",
                () =>
                    client.commandCompletionService.getCompletionsAsync(
                        new GetCompletionsRequest({
                            beginExclusive: "0",
                        }),
                        {
                            nextAsync: async () => undefined,
                        },
                    ),
            ],
        ] as const;

        for (const [message, invoke] of calls) {
            await expect(invoke()).rejects.toThrow(NotSupportedError);
            await expect(invoke()).rejects.toThrow(message);
        }
    });
});
