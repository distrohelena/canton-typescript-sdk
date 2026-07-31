import { describe, expect, it } from "vitest";
import {
    CantonClient,
    CantonClientOptions,
    GetConnectedSynchronizersRequest,
    GetLatestPrunedOffsetsRequest,
    GetLedgerEndRequest,
    GetPartiesRequest,
    GetUserRequest,
    ListKnownPackagesRequest,
    ListUserRightsRequest,
    ListUsersRequest,
    NotSupportedError,
    TransportKind,
} from "../../../src";
import { GetCompletionsRequest } from "../../../src/transports/grpc/generated/canton/com/daml/ledger/api/v2/command_completion_service.js";
import { GetContractRequest } from "../../../src/transports/grpc/generated/canton/com/daml/ledger/api/v2/contract_service.js";
import { GetEventsByContractIdRequest } from "../../../src/transports/grpc/generated/canton/com/daml/ledger/api/v2/event_query_service.js";
import { GetParticipantIdRequest } from "../../../src/transports/grpc/generated/canton/com/daml/ledger/api/v2/admin/party_management_service.js";
import {
    GetUpdateByHashRequest,
    GetUpdateByIdRequest,
    GetUpdateByOffsetRequest,
    GetUpdatesPageRequest,
} from "../../../src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js";

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
                        GetParticipantIdRequest.create(),
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
                        GetContractRequest.create({
                            contractId: "contract-1",
                        }),
                    ),
            ],
            [
                "EventQueryService.GetEventsByContractId",
                () =>
                    client.eventQueryService.getEventsByContractIdAsync(
                        GetEventsByContractIdRequest.create({
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
                        GetUpdateByOffsetRequest.create({
                            offset: "1",
                        }),
                    ),
            ],
            [
                "UpdateService.GetUpdateById",
                () =>
                    client.updateService.getUpdateByIdAsync(
                        GetUpdateByIdRequest.create({
                            updateId: "u-1",
                        }),
                    ),
            ],
            [
                "UpdateService.GetUpdateByHash",
                () =>
                    client.updateService.getUpdateByHashAsync(
                        GetUpdateByHashRequest.create({
                            transactionHash: new Uint8Array([1]),
                        }),
                    ),
            ],
            [
                "UpdateService.GetUpdatesPage",
                () =>
                    client.updateService.getUpdatesPageAsync(
                        GetUpdatesPageRequest.create(),
                    ),
            ],
            [
                "CommandCompletionService.GetCompletions",
                () => Array.fromAsync(
                    client.commandCompletionService.getCompletionsAsync(
                        GetCompletionsRequest.create({
                            beginExclusive: "0",
                        }),
                    ),
                ),
            ],
        ] as const;

        for (const [message, invoke] of calls) {
            await expect(invoke()).rejects.toThrow(NotSupportedError);
            await expect(invoke()).rejects.toThrow(message);
        }
    });
});
