import { describe, expect, it, vi } from "vitest";
import {
    CommandCompletionServiceClient,
    ContractServiceClient,
    EventQueryServiceClient,
    GetConnectedSynchronizersRequest,
    GetLatestPrunedOffsetsRequest,
    GetLedgerEndRequest,
    GetParticipantIdRequest,
    GetPartiesRequest,
    GetUserRequest,
    ListKnownPackagesRequest,
    ListUserRightsRequest,
    ListUsersRequest,
    PackageManagementServiceClient,
    PartyManagementServiceClient,
    ParticipantPermission,
    RequestOptions,
    StateServiceClient,
    UpdateServiceClient,
    UserManagementServiceClient,
} from "../../../src";
import {
    GetCompletionsRequest,
} from "../../../src/transports/grpc/generated/canton/com/daml/ledger/api/v2/command_completion_service.js";
import {
    GetUpdateByHashRequest,
    GetUpdateByIdRequest,
    GetUpdateByOffsetRequest,
    GetUpdatesPageRequest,
} from "../../../src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js";
import { GrpcTransport } from "../../../src/transports/grpc/grpc-transport.js";
import {
    GetContractRequest as ProtobufGetContractRequest,
    GetContractResponse as ProtobufGetContractResponse,
} from "../../../src/transports/grpc/generated/canton/com/daml/ledger/api/v2/contract_service.js";
import {
    GetEventsByContractIdRequest as ProtobufGetEventsByContractIdRequest,
    GetEventsByContractIdResponse as ProtobufGetEventsByContractIdResponse,
} from "../../../src/transports/grpc/generated/canton/com/daml/ledger/api/v2/event_query_service.js";
import {
    GetUserRequest as ProtobufGetUserRequest,
    ListUserRightsRequest as ProtobufListUserRightsRequest,
    ListUsersRequest as ProtobufListUsersRequest,
} from "../../../src/transports/grpc/generated/canton/com/daml/ledger/api/v2/admin/user_management_service.js";

describe("GrpcTransport batch 1 read services", () => {
    it("returns raw generated user-management responses", async () => {
        const getUserResponse = { user: { id: "user-1" } };
        const listUsersResponse = { users: [], nextPageToken: "next" };
        const listUserRightsResponse = { rights: [] };
        const transport = new GrpcTransport({
            getUserAsync: async () => getUserResponse,
            listUsersAsync: async () => listUsersResponse,
            listUserRightsAsync: async () => listUserRightsResponse,
        } as any);
        const client = new UserManagementServiceClient(transport);

        await expect(
            client.getUserAsync(ProtobufGetUserRequest.create({ userId: "user-1" })),
        ).resolves.toBe(getUserResponse);
        await expect(
            client.listUsersAsync(ProtobufListUsersRequest.create()),
        ).resolves.toBe(listUsersResponse);
        await expect(
            client.listUserRightsAsync(
                ProtobufListUserRightsRequest.create({ userId: "user-1" }),
            ),
        ).resolves.toBe(listUserRightsResponse);
    });

    it("maps ledger admin read methods", async () => {
        const transport = new GrpcTransport({
            getHealthAsync: async () => ({ version: "3.4.0", features: {} }),
            checkHealthAsync: async () => ({ status: 1 }),
            createPartyAsync: async () => ({ identifier: "unused" }),
            listPartiesAsync: async () => ({ partyDetails: [], nextPageToken: "" }),
            getParticipantIdAsync: async () => ({ participantId: "participant-1" }),
            getPartiesAsync: async () => ({
                partyDetails: [
                    {
                        party: "Alice",
                        isLocal: true,
                        localMetadata: {
                            annotations: {
                                team: "ops",
                            },
                        },
                        identityProviderId: "idp-1",
                    },
                ],
            }),
            grantUserRightsAsync: async () => ({ rights: [] }),
            getUserAsync: async () => ({
                user: {
                    id: "user-1",
                    primaryParty: "Alice",
                    isDeactivated: false,
                    metadata: {
                        resourceVersion: "42",
                        annotations: {
                            team: "ops",
                        },
                    },
                    identityProviderId: "idp-1",
                    primaryPartyAuthentication: true,
                },
            }),
            listUsersAsync: async () => ({
                users: [
                    {
                        id: "user-1",
                        primaryParty: "Alice",
                        isDeactivated: false,
                        identityProviderId: "idp-1",
                        primaryPartyAuthentication: true,
                    },
                ],
                nextPageToken: "next",
            }),
            listUserRightsAsync: async () => ({
                rights: [
                    {
                        kind: {
                            oneofKind: "participantAdmin",
                            participantAdmin: {},
                        },
                    },
                    {
                        kind: {
                            oneofKind: "canExecuteAs",
                            canExecuteAs: {
                                party: "Alice",
                            },
                        },
                    },
                ],
            }),
            uploadPackageAsync: async () => ({ packageId: "unused" }),
            listKnownPackagesAsync: async () => ({
                packageDetails: [
                    {
                        packageId: "pkg-1",
                        packageSize: "128",
                        knownSince: {
                            seconds: "1710000000",
                            nanos: 0,
                        },
                        name: "Main",
                        version: "1.0.0",
                    },
                ],
            }),
            queryContractsAsync: async () => ({ activeContracts: [] }),
            getUpdatesAsync: async () => [],
            submitCommandAsync: async () => ({ updateId: "unused" }),
        } as any);

        const options = new RequestOptions({
            timeoutMs: 1_000,
        });

        const partyManagement = new PartyManagementServiceClient(transport);

        const userManagement = new UserManagementServiceClient(transport);

        const packageManagement = new PackageManagementServiceClient(transport);

        const participantId = await partyManagement.getParticipantIdAsync(
            new GetParticipantIdRequest(),
            options,
        );

        const parties = await partyManagement.getPartiesAsync(
            new GetPartiesRequest({
                parties: ["Alice"],
            }),
            options,
        );

        const user = await userManagement.getUserAsync(
            new GetUserRequest({
                userId: "user-1",
            }),
            options,
        );

        const users = await userManagement.listUsersAsync(
            new ListUsersRequest(),
            options,
        );

        const rights = await userManagement.listUserRightsAsync(
            new ListUserRightsRequest({
                userId: "user-1",
            }),
            options,
        );

        const packages = await packageManagement.listKnownPackagesAsync(
            new ListKnownPackagesRequest(),
            options,
        );

        expect(participantId.participantId).toBe("participant-1");
        expect(parties.partyDetails[0]).toMatchObject({
            party: "Alice",
            isLocal: true,
            identityProviderId: "idp-1",
        });
        expect(user.user).toMatchObject({
            id: "user-1",
            primaryParty: "Alice",
            primaryPartyAuthentication: true,
        });
        expect(users.nextPageToken).toBe("next");
        expect(rights.rights).toEqual([
            { kind: { oneofKind: "participantAdmin", participantAdmin: {} } },
            {
                kind: {
                    oneofKind: "canExecuteAs",
                    canExecuteAs: { party: "Alice" },
                },
            },
        ]);
        expect(packages.packageDetails[0]).toMatchObject({
            packageId: "pkg-1",
            packageSize: "128",
            name: "Main",
            version: "1.0.0",
        });
    });

    it("maps ledger read methods and completion streaming", async () => {
        const contractResponse = ProtobufGetContractResponse.create({
            createdEvent: {
                contractId: "contract-1",
            },
        });
        const eventsResponse = ProtobufGetEventsByContractIdResponse.create({
            created: {
                createdEvent: {
                    contractId: "contract-1",
                },
                synchronizerId: "sync-1",
            },
            archived: {
                archivedEvent: {
                    contractId: "contract-1",
                },
                synchronizerId: "sync-2",
            },
        });
        const getUpdateByOffsetAsync = vi.fn(async () => ({
            update: {
                oneofKind: "transaction",
                transaction: {
                    updateId: "tx-1",
                },
            },
        }));

        const getUpdateByIdAsync = vi.fn(async () => ({
            update: {
                oneofKind: "topologyTransaction",
                topologyTransaction: {
                    updateId: "topo-1",
                },
            },
        }));

        const getUpdateByHashAsync = vi.fn(async () => ({
            update: {
                oneofKind: "reassignment",
                reassignment: {
                    updateId: "reassign-1",
                },
            },
        }));

        const getUpdatesPageAsync = vi.fn(async () => ({
            updates: [
                {
                    update: {
                        oneofKind: "transaction",
                        transaction: {
                            updateId: "tx-2",
                        },
                    },
                },
            ],
            lowestPageOffsetExclusive: "10",
            highestPageOffsetInclusive: "11",
            nextPageToken: new Uint8Array([9]),
        }));

        const getCompletionsAsync = vi.fn(async function* () {
            yield {
                completionResponse: {
                    oneofKind: "completion",
                    completion: {
                        commandId: "cmd-1",
                        updateId: "tx-1",
                        userId: "user-1",
                        actAs: ["Alice"],
                        submissionId: "sub-1",
                        deduplicationPeriod: {
                            oneofKind: "deduplicationOffset",
                            deduplicationOffset: "7",
                        },
                        offset: "9",
                        paidTrafficCost: "0",
                    },
                },
            };
            yield {
                completionResponse: {
                    oneofKind: "offsetCheckpoint",
                    offsetCheckpoint: {
                        offset: "10",
                        synchronizerTimes: [],
                    },
                },
            };
        });

        const transport = new GrpcTransport({
            getHealthAsync: async () => ({ version: "3.4.0", features: {} }),
            checkHealthAsync: async () => ({ status: 1 }),
            createPartyAsync: async () => ({ identifier: "unused" }),
            listPartiesAsync: async () => ({ partyDetails: [], nextPageToken: "" }),
            grantUserRightsAsync: async () => ({ rights: [] }),
            uploadPackageAsync: async () => ({ packageId: "unused" }),
            getContractAsync: async (request: unknown) => {
                expect(request).toEqual(
                    ProtobufGetContractRequest.create({
                        contractId: "contract-1",
                        queryingParties: ["Alice"],
                    }),
                );
                return contractResponse;
            },
            getEventsByContractIdAsync: async (request: unknown) => {
                expect(request).toEqual(
                    ProtobufGetEventsByContractIdRequest.create({
                        contractId: "contract-1",
                    }),
                );
                return eventsResponse;
            },
            queryContractsAsync: async () => ({ activeContracts: [] }),
            getConnectedSynchronizersAsync: async () => ({
                connectedSynchronizers: [
                    {
                        synchronizerAlias: "sandbox",
                        synchronizerId: "sync-1",
                        permission: 1,
                    },
                ],
            }),
            getLedgerEndAsync: async () => ({
                offset: "17",
                synchronizerTimes: [
                    {
                        synchronizerId: "sync-1",
                        recordTime: {
                            seconds: "1710000000",
                            nanos: 0,
                        },
                    },
                ],
            }),
            getLatestPrunedOffsetsAsync: async () => ({
                participantPrunedUpToInclusive: "3",
                allDivulgedContractsPrunedUpToInclusive: "2",
            }),
            getUpdatesAsync: async () => [],
            getUpdateByOffsetAsync,
            getUpdateByIdAsync,
            getUpdateByHashAsync,
            getUpdatesPageAsync,
            getCompletionsAsync,
            submitCommandAsync: async () => ({ updateId: "unused" }),
        } as any);

        const options = new RequestOptions({
            timeoutMs: 1_000,
        });

        const contractService = new ContractServiceClient(transport);

        const eventQueryService = new EventQueryServiceClient(transport);

        const stateService = new StateServiceClient(transport);

        const updateService = new UpdateServiceClient(transport);

        const commandCompletionService =
            new CommandCompletionServiceClient(transport);

        const contract = await contractService.getContractAsync(
            ProtobufGetContractRequest.create({
                contractId: "contract-1",
                queryingParties: ["Alice"],
            }),
            options,
        );

        const events = await eventQueryService.getEventsByContractIdAsync(
            ProtobufGetEventsByContractIdRequest.create({
                contractId: "contract-1",
            }),
            options,
        );

        expect(contract).toBe(contractResponse);
        expect(events).toBe(eventsResponse);

        const connectedSynchronizers =
            await stateService.getConnectedSynchronizersAsync(
                new GetConnectedSynchronizersRequest(),
                options,
            );

        const ledgerEnd = await stateService.getLedgerEndAsync(
            new GetLedgerEndRequest(),
            options,
        );

        const prunedOffsets = await stateService.getLatestPrunedOffsetsAsync(
            new GetLatestPrunedOffsetsRequest(),
            options,
        );

        const byOffset = await updateService.getUpdateByOffsetAsync(
            GetUpdateByOffsetRequest.create({
                offset: "11",
            }),
            options,
        );

        const byId = await updateService.getUpdateByIdAsync(
            GetUpdateByIdRequest.create({
                updateId: "tx-2",
            }),
            options,
        );

        const byHash = await updateService.getUpdateByHashAsync(
            GetUpdateByHashRequest.create({
                transactionHash: new Uint8Array([1]),
            }),
            options,
        );

        const page = await updateService.getUpdatesPageAsync(
            GetUpdatesPageRequest.create(),
            options,
        );

        const completionEvents = await Array.fromAsync(
            commandCompletionService.getCompletionsAsync(
                GetCompletionsRequest.create({
                beginExclusive: "0",
                parties: ["Alice"],
                }),
                options,
            ),
        );

        expect(contract.createdEvent).toMatchObject({
            contractId: "contract-1",
        });
        expect(events.created?.synchronizerId).toBe("sync-1");
        expect(events.archived?.synchronizerId).toBe("sync-2");
        expect(connectedSynchronizers.connectedSynchronizers[0].permission).toBe(
            ParticipantPermission.submission,
        );
        expect(ledgerEnd.offset).toBe("17");
        expect(prunedOffsets.allDivulgedContractsPrunedUpToInclusive).toBe("2");
        expect(byOffset.update).toMatchObject({ oneofKind: "transaction", transaction: { updateId: "tx-1" } });
        expect(byId.update).toMatchObject({ oneofKind: "topologyTransaction", topologyTransaction: { updateId: "topo-1" } });
        expect(byHash.update).toMatchObject({ oneofKind: "reassignment", reassignment: { updateId: "reassign-1" } });
        expect(page.nextPageToken).toEqual(new Uint8Array([9]));
        expect(completionEvents).toHaveLength(2);
        expect(completionEvents[0].completionResponse).toMatchObject({
            oneofKind: "completion",
            completion: { commandId: "cmd-1" },
        });
        expect(completionEvents[1].completionResponse).toMatchObject({
            oneofKind: "offsetCheckpoint",
            offsetCheckpoint: { offset: "10" },
        });
    });
});
