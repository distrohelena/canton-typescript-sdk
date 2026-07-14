import { describe, expect, it } from "vitest";
import { ContractCreated } from "../../../../src/core/types/contract-created.js";
import { GetContractRequest } from "../../../../src/core/types/requests/get-contract-request.js";
import { GetEventsByContractIdRequest } from "../../../../src/core/types/requests/get-events-by-contract-id-request.js";
import { GetContractResponse } from "../../../../src/core/types/responses/get-contract-response.js";
import { GetEventsByContractIdResponse } from "../../../../src/core/types/responses/get-events-by-contract-id-response.js";
import {
    DAML_LF_CONTRACT_ID_MARKER_KEY,
    DAML_LF_NUMERIC_MARKER_KEY,
    DAML_LF_RECORD_ID_MARKER_KEY,
} from "../../../../src/daml-lf/interpreter/daml-lf-runtime-value.js";
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
            [DAML_LF_RECORD_ID_MARKER_KEY]: {
                packageId: "pkg-main",
                moduleName: "Main",
                entityName: "Vault",
            },
        });
        expect(environment.contracts.get("00abc")?.history.created?.payload).toEqual({
            owner: "Alice",
            [DAML_LF_RECORD_ID_MARKER_KEY]: {
                packageId: "pkg-main",
                moduleName: "Main",
                entityName: "Vault",
            },
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

    it("falls back to contract event history when getContract hides the payload", async () => {
        const builder = new LedgerReplayEnvironmentBuilder({
            contractService: {
                async getContractAsync(): Promise<GetContractResponse> {
                    throw new Error(
                        "CONTRACT_PAYLOAD_NOT_FOUND(11,f5ebb004): Contract payload not found, or not visible.",
                    );
                },
            },
            eventQueryService: {
                async getEventsByContractIdAsync(
                    request: GetEventsByContractIdRequest,
                ): Promise<GetEventsByContractIdResponse> {
                    expect(request.contractId).toBe("00abc");

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
        });

        expect(environment.contracts.get("00abc")?.payload).toEqual({
            owner: "Alice",
            [DAML_LF_RECORD_ID_MARKER_KEY]: {
                packageId: "pkg-main",
                moduleName: "Main",
                entityName: "Vault",
            },
        });
        expect(environment.contracts.get("00abc")?.synchronizerId).toBe("sync-1");
    });

    it("preserves contract-id values inside hydrated payloads", async () => {
        const builder = new LedgerReplayEnvironmentBuilder({
            contractService: {
                async getContractAsync(): Promise<GetContractResponse> {
                    return new GetContractResponse({
                        createdEvent: {
                            contractId: "00abc",
                            templateId: {
                                packageId: "pkg-main",
                                moduleName: "Main",
                                entityName: "Vault",
                            },
                            createArguments: {
                                sum: {
                                    oneofKind: "record",
                                    record: {
                                        fields: [
                                            {
                                                label: "linkedCid",
                                                value: {
                                                    sum: {
                                                        oneofKind: "contractId",
                                                        contractId: "00def",
                                                    },
                                                },
                                            },
                                        ],
                                    },
                                },
                            },
                        },
                    });
                },
            },
            eventQueryService: {
                async getEventsByContractIdAsync(): Promise<GetEventsByContractIdResponse> {
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
                                    sum: {
                                        oneofKind: "record",
                                        record: {
                                            fields: [
                                                {
                                                    label: "linkedCid",
                                                    value: {
                                                        sum: {
                                                            oneofKind: "contractId",
                                                            contractId: "00def",
                                                        },
                                                    },
                                                },
                                            ],
                                        },
                                    },
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
        });

        expect(environment.contracts.get("00abc")?.payload).toEqual({
            linkedCid: {
                [DAML_LF_CONTRACT_ID_MARKER_KEY]: "00def",
            },
            [DAML_LF_RECORD_ID_MARKER_KEY]: {
                packageId: "pkg-main",
                moduleName: "Main",
                entityName: "Vault",
            },
        });
        expect(environment.contracts.get("00abc")?.history.created?.payload).toEqual({
            linkedCid: {
                [DAML_LF_CONTRACT_ID_MARKER_KEY]: "00def",
            },
            [DAML_LF_RECORD_ID_MARKER_KEY]: {
                packageId: "pkg-main",
                moduleName: "Main",
                entityName: "Vault",
            },
        });
    });

    it("normalizes raw ledger-api exercise arguments on the replay entrypoint", async () => {
        const builder = new LedgerReplayEnvironmentBuilder({
            contractService: {
                async getContractAsync(): Promise<GetContractResponse> {
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
                async getEventsByContractIdAsync(): Promise<GetEventsByContractIdResponse> {
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
                                sum: {
                                    oneofKind: "record",
                                    record: {
                                        fields: [
                                            {
                                                label: "amount",
                                                value: {
                                                    sum: {
                                                        oneofKind: "numeric",
                                                        numeric: "1.5000000000",
                                                    },
                                                },
                                            },
                                            {
                                                label: "linkedCid",
                                                value: {
                                                    sum: {
                                                        oneofKind: "contractId",
                                                        contractId: "00def",
                                                    },
                                                },
                                            },
                                        ],
                                    },
                                },
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
                    sum: {
                        oneofKind: "record",
                        record: {
                            fields: [
                                {
                                    label: "amount",
                                    value: {
                                        sum: {
                                            oneofKind: "numeric",
                                            numeric: "1.5000000000",
                                        },
                                    },
                                },
                                {
                                    label: "linkedCid",
                                    value: {
                                        sum: {
                                            oneofKind: "contractId",
                                            contractId: "00def",
                                        },
                                    },
                                },
                            ],
                        },
                    },
                },
            }),
        });

        expect(environment.entrypoint.argument).toEqual({
            amount: {
                [DAML_LF_NUMERIC_MARKER_KEY]: "1.5000000000",
            },
            linkedCid: {
                [DAML_LF_CONTRACT_ID_MARKER_KEY]: "00def",
            },
        });
    });

    it("hydrates contracts referenced from normalized replay entrypoint arguments", async () => {
        const contractRequests: string[] = [];
        const eventRequests: string[] = [];
        const builder = new LedgerReplayEnvironmentBuilder({
            contractService: {
                async getContractAsync(
                    request: GetContractRequest,
                ): Promise<GetContractResponse> {
                    contractRequests.push(request.contractId);

                    if (request.contractId === "00snapshot") {
                        return new GetContractResponse({
                            createdEvent: {
                                contractId: "00snapshot",
                                templateId: {
                                    packageId: "pkg-child",
                                    moduleName: "Main",
                                    entityName: "Snapshot",
                                },
                                createArguments: {
                                    totalAssets: "10.0000000000",
                                },
                            },
                        });
                    }

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
                    eventRequests.push(request.contractId);

                    if (request.contractId === "00snapshot") {
                        return new GetEventsByContractIdResponse({
                            created: new ContractCreated({
                                createdEvent: {
                                    contractId: "00snapshot",
                                    templateId: {
                                        packageId: "pkg-child",
                                        moduleName: "Main",
                                        entityName: "Snapshot",
                                    },
                                    createArguments: {
                                        totalAssets: "10.0000000000",
                                    },
                                },
                                synchronizerId: "sync-snapshot",
                            }),
                        });
                    }

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
                argument: {
                    sum: {
                        oneofKind: "record",
                        record: {
                            fields: [
                                {
                                    label: "snapshotCid",
                                    value: {
                                        sum: {
                                            oneofKind: "contractId",
                                            contractId: "00snapshot",
                                        },
                                    },
                                },
                            ],
                        },
                    },
                },
            }),
        });

        expect(contractRequests).toEqual(["00abc", "00snapshot"]);
        expect(eventRequests).toEqual(["00abc", "00snapshot"]);
        expect(environment.contracts.get("00snapshot")?.payload).toEqual({
            totalAssets: "10.0000000000",
            [DAML_LF_RECORD_ID_MARKER_KEY]: {
                packageId: "pkg-child",
                moduleName: "Main",
                entityName: "Snapshot",
            },
        });
        expect(environment.packageIds).toEqual(["pkg-child", "pkg-main"]);
    });

    it("attaches template record metadata to unlabeled hydrated contract payloads", async () => {
        const builder = new LedgerReplayEnvironmentBuilder({
            contractService: {
                async getContractAsync(): Promise<GetContractResponse> {
                    return new GetContractResponse({
                        createdEvent: {
                            contractId: "00abc",
                            templateId: {
                                packageId: "pkg-main",
                                moduleName: "Main",
                                entityName: "VaultSnapshot",
                            },
                            createArguments: {
                                sum: {
                                    oneofKind: "record",
                                    record: {
                                        fields: [
                                            {
                                                value: {
                                                    sum: {
                                                        oneofKind: "text",
                                                        text: "Alice",
                                                    },
                                                },
                                            },
                                        ],
                                    },
                                },
                            },
                        },
                    });
                },
            },
            eventQueryService: {
                async getEventsByContractIdAsync(): Promise<GetEventsByContractIdResponse> {
                    return new GetEventsByContractIdResponse({
                        created: new ContractCreated({
                            createdEvent: {
                                contractId: "00abc",
                                templateId: {
                                    packageId: "pkg-main",
                                    moduleName: "Main",
                                    entityName: "VaultSnapshot",
                                },
                                createArguments: {
                                    sum: {
                                        oneofKind: "record",
                                        record: {
                                            fields: [
                                                {
                                                    value: {
                                                        sum: {
                                                            oneofKind: "text",
                                                            text: "Alice",
                                                        },
                                                    },
                                                },
                                            ],
                                        },
                                    },
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
                                entityName: "VaultSnapshot",
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
                    entityName: "VaultSnapshot",
                },
                contractId: "00abc",
                choice: "Archive",
                argument: {},
            }),
        });

        expect(environment.contracts.get("00abc")?.payload).toEqual({
            0: "Alice",
            [DAML_LF_RECORD_ID_MARKER_KEY]: {
                packageId: "pkg-main",
                moduleName: "Main",
                entityName: "VaultSnapshot",
            },
        });
    });
});
