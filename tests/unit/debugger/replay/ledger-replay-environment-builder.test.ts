import { describe, expect, it } from "vitest";
import { ContractCreated } from "../../../../src/core/types/contract-created.js";
import { GetContractRequest } from "../../../../src/core/types/requests/get-contract-request.js";
import { GetEventsByContractIdRequest } from "../../../../src/core/types/requests/get-events-by-contract-id-request.js";
import { GetContractResponse } from "../../../../src/core/types/responses/get-contract-response.js";
import { GetEventsByContractIdResponse } from "../../../../src/core/types/responses/get-events-by-contract-id-response.js";
import { ReplayStateHydrationException } from "../../../../src/debugger/index.js";
import { LedgerReplayEnvironmentBuilder } from "../../../../src/debugger/replay/ledger-replay-environment-builder.js";
import { ReplayEntrypoint } from "../../../../src/debugger/replay/replay-entrypoint.js";

describe("LedgerReplayEnvironmentBuilder", () => {
    it("hydrates exercised contract payloads and transaction metadata", async () => {
        const contractRequests: GetContractRequest[] = [];
        const eventRequests: GetEventsByContractIdRequest[] = [];
        const builder = new LedgerReplayEnvironmentBuilder({
            contractService: {
                async getContractAsync(
                    request: GetContractRequest,
                ): Promise<GetContractResponse> {
                    contractRequests.push(request);

                    return new GetContractResponse({
                        createdEvent: {
                            contractId: "00abc",
                            templateId: {
                                packageId: "pkg-main",
                                moduleName: "Main",
                                entityName: "Vault",
                            },
                            createArguments: {
                                owner: "Alice",
                            },
                        },
                    });
                },
            },
            eventQueryService: {
                async getEventsByContractIdAsync(
                    request: GetEventsByContractIdRequest,
                ): Promise<GetEventsByContractIdResponse> {
                    eventRequests.push(request);

                    return new GetEventsByContractIdResponse({
                        created: new ContractCreated({
                            createdEvent: {
                                contractId: "00abc",
                                templateId: {
                                    packageId: "pkg-main",
                                    moduleName: "Main",
                                    entityName: "Vault",
                                },
                                createArguments: {
                                    owner: "Alice",
                                },
                            },
                            synchronizerId: "sync-1",
                        }),
                    });
                },
            },
        });

        const environment = await builder.buildOrThrowAsync({
            kind: "transaction",
            offset: "42",
            updateId: "tx-1",
            actAs: ["Alice"],
            events: [
                {
                    event: {
                        oneofKind: "exercised",
                        exercised: {
                            contractId: "00abc",
                            templateId: {
                                packageId: "pkg-main",
                                moduleName: "Main",
                                entityName: "Vault",
                            },
                            choice: "Archive",
                            choiceArgument: {
                                reason: "cleanup",
                            },
                        },
                    },
                },
                {
                    event: {
                        oneofKind: "created",
                        created: {
                            contractId: "00def",
                            templateId: {
                                packageId: "pkg-child",
                                moduleName: "Main",
                                entityName: "AuditLog",
                            },
                            createArguments: {
                                message: "archived",
                            },
                        },
                    },
                },
            ],
            entrypoint: new ReplayEntrypoint({
                kind: "exercise",
                templateId: {
                    packageId: "pkg-main",
                    moduleName: "Main",
                    entityName: "Vault",
                },
                contractId: "00abc",
                choice: "Archive",
                argument: {
                    reason: "cleanup",
                },
            }),
        });

        expect(contractRequests).toHaveLength(1);
        expect(contractRequests[0]?.contractId).toBe("00abc");
        expect(contractRequests[0]?.queryingParties).toEqual(["Alice"]);
        expect(eventRequests).toHaveLength(1);
        expect(eventRequests[0]?.contractId).toBe("00abc");
        expect(environment.contracts.get("00abc")?.payload).toEqual({
            owner: "Alice",
        });
        expect(environment.contracts.get("00abc")?.history.created?.payload).toEqual({
            owner: "Alice",
        });
        expect(environment.contracts.get("00abc")?.synchronizerId).toBe("sync-1");
        expect(environment.actAs).toEqual(["Alice"]);
        expect(environment.packageIds).toEqual(["pkg-child", "pkg-main"]);
    });

    it("fails when a required contract cannot be hydrated", async () => {
        const builder = new LedgerReplayEnvironmentBuilder({
            contractService: {
                async getContractAsync(): Promise<GetContractResponse> {
                    return new GetContractResponse({});
                },
            },
            eventQueryService: {
                async getEventsByContractIdAsync(): Promise<GetEventsByContractIdResponse> {
                    return new GetEventsByContractIdResponse({});
                },
            },
        });

        await expect(
            builder.buildOrThrowAsync({
                kind: "transaction",
                offset: "42",
                actAs: ["Alice"],
                events: [
                    {
                        event: {
                            oneofKind: "exercised",
                            exercised: {
                                contractId: "00abc",
                                templateId: {
                                    packageId: "pkg-main",
                                    moduleName: "Main",
                                    entityName: "Vault",
                                },
                                choice: "Archive",
                                choiceArgument: {},
                            },
                        },
                    },
                ],
                entrypoint: new ReplayEntrypoint({
                    kind: "exercise",
                    templateId: {
                        packageId: "pkg-main",
                        moduleName: "Main",
                        entityName: "Vault",
                    },
                    contractId: "00abc",
                    choice: "Archive",
                    argument: {},
                }),
            }),
        ).rejects.toThrow(ReplayStateHydrationException);
    });
});
