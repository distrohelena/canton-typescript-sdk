import { ledgerApiV2 } from "@distrohelena/canton-typescript-sdk/protobuf";
import { describe, expect, it } from "vitest";
import {
    assertAtomicMessageTerminalState,
    buildActiveContractsRequest,
    buildUpdatesRequest,
    assertExactlyOneActiveMessage,
    assertMessageContractAbsent,
    collectActiveMessagesAcrossPagesAsync,
    findActiveMessage,
    findActiveMessageAcrossPagesAsync,
    matchCreatedMessageUpdate,
} from "../../../examples/shared/ledger-requests.js";

const templateId = {
    packageId: "package",
    packageName: "package-name",
    moduleName: "DebugPlayground",
    entityName: "Message",
};

describe("application example ledger requests", () => {
    it("builds a generated active-contract request for one party and template", () => {
        const request = buildActiveContractsRequest({
            party: "Alice::1",
            templateId,
        });

        expect(ledgerApiV2.GetActiveContractsPageRequest.is(request)).toBe(true);
        expect(request.eventFormat?.filtersByParty["Alice::1"]?.cumulative[0])
            .toMatchObject({
                identifierFilter: {
                    oneofKind: "templateFilter",
                    templateFilter: {
                        templateId: {
                            packageId: "#package-name",
                            moduleName: "DebugPlayground",
                            entityName: "Message",
                        },
                        includeCreatedEventBlob: false,
                    },
                },
            });
        expect(request.eventFormat?.verbose).toBe(true);
        expect(request.activeAtOffset).toBeUndefined();
        expect(request.maxPageSize).toBeUndefined();
        expect(request.pageToken).toBeUndefined();
    });

    it("finds only the exact created event from an active contract", () => {
        const createdEvent = ledgerApiV2.CreatedEvent.create({
            contractId: "#message",
            templateId,
            createArguments: ledgerApiV2.Record.create({}),
        });

        expect(
            findActiveMessage(
                [
                    ledgerApiV2.GetActiveContractsResponse.create({
                        contractEntry: {
                            oneofKind: "activeContract",
                            activeContract: ledgerApiV2.ActiveContract.create({
                                createdEvent,
                            }),
                        },
                    }),
                ],
                "#message",
            ),
        ).toEqual(createdEvent);
    });

    it("does not match whitespace-only requested or created contract IDs", () => {
        const createdEvent = ledgerApiV2.CreatedEvent.create({
            contractId: "#message",
        });

        const whitespaceCreatedEvent = ledgerApiV2.CreatedEvent.create({
            contractId: " \t ",
        });

        const activeContracts = [
            ledgerApiV2.GetActiveContractsResponse.create({
                contractEntry: {
                    oneofKind: "activeContract",
                    activeContract: ledgerApiV2.ActiveContract.create({
                        createdEvent,
                    }),
                },
            }),
            ledgerApiV2.GetActiveContractsResponse.create({
                contractEntry: {
                    oneofKind: "activeContract",
                    activeContract: ledgerApiV2.ActiveContract.create({
                        createdEvent: whitespaceCreatedEvent,
                    }),
                },
            }),
        ];

        expect(findActiveMessage(activeContracts, "  ")).toBeUndefined();
        expect(findActiveMessage(activeContracts, " \t ")).toBeUndefined();
    });

    it("finds an active Message on a later page from the first snapshot", async () => {
        const request = buildActiveContractsRequest({
            party: "Alice::1",
            templateId,
        });

        const nextPageToken = new Uint8Array([7, 9]);

        const target = ledgerApiV2.CreatedEvent.create({
            contractId: "#target",
        });

        const calls: Array<{
            request: ledgerApiV2.GetActiveContractsPageRequest;
            remainingTimeoutMs: number;
        }> = [];

        let now = 100;

        const result = await findActiveMessageAcrossPagesAsync({
            request: ledgerApiV2.GetActiveContractsPageRequest.create({
                ...request,
                maxPageSize: 10,
            }),
            contractId: "#target",
            timeoutMs: 1_000,
            readPageAsync: async (pageRequest, remainingTimeoutMs) => {
                calls.push({ request: pageRequest, remainingTimeoutMs });

                if (calls.length !== 1) {
                    return ledgerApiV2.GetActiveContractsPageResponse.create({
                        activeAtOffset: "42",
                        activeContracts: [activeContractResponse(target)],
                    });
                }

                now = 101;

                return ledgerApiV2.GetActiveContractsPageResponse.create({
                    activeAtOffset: "42",
                    nextPageToken,
                    activeContracts: [activeContractResponse("#other")],
                });
            },
            now: () => now,
        });

        expect(result).toEqual(target);
        expect(calls).toHaveLength(2);
        expect(calls[0]?.remainingTimeoutMs).toBeGreaterThan(0);
        expect(calls[1]?.request.pageToken).toEqual(nextPageToken);
        expect(calls[1]?.request.activeAtOffset).toBe("42");
        expect(calls[1]?.request.maxPageSize).toBe(10);
        expect(calls[1]?.request.eventFormat).toEqual(request.eventFormat);
        expect(calls[1]?.remainingTimeoutMs).toBeLessThan(1_000);
        expect(calls[1]?.remainingTimeoutMs).toBeGreaterThan(0);
    });

    it("stops after the first page when it finds the active Message", async () => {
        let calls = 0;

        const result = await findActiveMessageAcrossPagesAsync({
            request: buildActiveContractsRequest({
                party: "Alice::1",
                templateId,
            }),
            contractId: "#target",
            timeoutMs: 1_000,
            readPageAsync: async () => {
                calls += 1;

                return ledgerApiV2.GetActiveContractsPageResponse.create({
                    activeContracts: [activeContractResponse("#target")],
                    activeAtOffset: "42",
                    nextPageToken: new Uint8Array([1]),
                });
            },
            now: () => 100,
        });

        expect(result?.contractId).toBe("#target");
        expect(calls).toBe(1);
    });

    it("rejects a paginated first page without a stable active-contract snapshot", async () => {
        let calls = 0;

        await expect(
            findActiveMessageAcrossPagesAsync({
                request: buildActiveContractsRequest({ party: "Alice::1", templateId }),
                contractId: "#target",
                timeoutMs: 1_000,
                readPageAsync: async () => {
                    calls += 1;

                    return {
                        activeContracts: [],
                        nextPageToken: new Uint8Array([1]),
                    } as never;
                },
                now: () => 100,
            }),
        ).rejects.toThrow(/non-empty.*snapshot/i);
        expect(calls).toBe(1);
    });

    it("rejects a paginated matching page with a whitespace snapshot offset", async () => {
        let calls = 0;

        await expect(
            findActiveMessageAcrossPagesAsync({
                request: buildActiveContractsRequest({ party: "Alice::1", templateId }),
                contractId: "#target",
                timeoutMs: 1_000,
                readPageAsync: async () => {
                    calls += 1;

                    return {
                        activeAtOffset: " \t ",
                        activeContracts: [activeContractResponse("#target")],
                        nextPageToken: new Uint8Array([1]),
                    } as never;
                },
                now: () => 100,
            }),
        ).rejects.toThrow(/non-empty.*snapshot/i);
        expect(calls).toBe(1);
    });

    it("rejects a later active-contract page without the first snapshot offset", async () => {
        let page = 0;

        await expect(
            findActiveMessageAcrossPagesAsync({
                request: buildActiveContractsRequest({ party: "Alice::1", templateId }),
                contractId: "#target",
                timeoutMs: 1_000,
                readPageAsync: async () => {
                    page += 1;

                    return page === 1
                        ? ledgerApiV2.GetActiveContractsPageResponse.create({
                              activeAtOffset: "42",
                              nextPageToken: new Uint8Array([1]),
                          })
                        : { activeContracts: [] } as never;
                },
                now: () => 100,
            }),
        ).rejects.toThrow(/different snapshot/i);
    });

    it("returns undefined after exhausting active-contract pages", async () => {
        let calls = 0;

        await expect(
            findActiveMessageAcrossPagesAsync({
                request: buildActiveContractsRequest({
                    party: "Alice::1",
                    templateId,
                }),
                contractId: "#target",
                timeoutMs: 1_000,
                readPageAsync: async () => {
                    calls += 1;

                    return ledgerApiV2.GetActiveContractsPageResponse.create({
                        activeContracts: [activeContractResponse("#other")],
                        activeAtOffset: "42",
                    });
                },
                now: () => 100,
            }),
        ).resolves.toBeUndefined();
        expect(calls).toBe(1);
    });

    it("does not issue a page read after the overall deadline expires", async () => {
        let now = 100;

        let calls = 0;

        await expect(
            findActiveMessageAcrossPagesAsync({
                request: buildActiveContractsRequest({
                    party: "Alice::1",
                    templateId,
                }),
                contractId: "#target",
                timeoutMs: 10,
                readPageAsync: async () => {
                    calls += 1;
                    now = 110;

                    return ledgerApiV2.GetActiveContractsPageResponse.create({
                        activeContracts: [activeContractResponse("#other")],
                        activeAtOffset: "42",
                        nextPageToken: new Uint8Array([1]),
                    });
                },
                now: () => now,
            }),
        ).rejects.toThrow(/SDK_EXAMPLE_TIMEOUT_MS/);
        expect(calls).toBe(1);
    });

    it("collects every active Message with an exact unique text marker across a stable snapshot", async () => {
        const calls: ledgerApiV2.GetActiveContractsPageRequest[] = [];

        const matchingOne = activeMessage("#one", "run-marker");

        const matchingTwo = activeMessage("#two", "run-marker");

        const messages = await collectActiveMessagesAcrossPagesAsync({
            request: buildActiveContractsRequest({ party: "Alice::1", templateId }),
            textMarker: "run-marker",
            timeoutMs: 1_000,
            readPageAsync: async request => {
                calls.push(request);

                return ledgerApiV2.GetActiveContractsPageResponse.create(
                    calls.length === 1
                        ? {
                              activeAtOffset: "42",
                              nextPageToken: new Uint8Array([1]),
                              activeContracts: [
                                  activeContractResponse(matchingOne),
                                  activeContractResponse(activeMessage("#other", "other")),
                              ],
                          }
                        : {
                              activeAtOffset: "42",
                              activeContracts: [activeContractResponse(matchingTwo)],
                          },
                );
            },
            now: () => 100,
        });

        expect(messages.map(message => message.contractId)).toEqual(["#one", "#two"]);
        expect(calls).toHaveLength(2);
        expect(calls[1]?.activeAtOffset).toBe("42");
    });

    it("asserts exactly one valid active Message and rejects an absent contract", () => {
        const message = activeMessage("#message", "run-marker");

        expect(
            assertExactlyOneActiveMessage({
                messages: [message],
                textMarker: "run-marker",
            }),
        ).toBe(message);
        expect(() =>
            assertExactlyOneActiveMessage({
                messages: [message, activeMessage("#second", "run-marker")],
                textMarker: "run-marker",
            }),
        ).toThrow(/exactly one/i);
        expect(() =>
            assertExactlyOneActiveMessage({
                messages: [ledgerApiV2.CreatedEvent.create({ contractId: " " })],
                textMarker: "run-marker",
            }),
        ).toThrow(/contract ID/i);
        expect(() =>
            assertMessageContractAbsent({ messages: [message], contractId: "#message" }),
        ).toThrow(/still active/i);
        expect(() =>
            assertMessageContractAbsent({ messages: [message], contractId: " " }),
        ).toThrow(/contract ID/i);
        expect(() =>
            assertMessageContractAbsent({ messages: [message], contractId: "#archived" }),
        ).not.toThrow();
    });

    it("proves the exact atomic terminal Message state", () => {
        const replacement = exactActiveMessage(
            "#replacement",
            "Alice::1",
            "Alice::1",
            "atomic-replacement",
        );

        expect(
            assertAtomicMessageTerminalState({
                messages: [replacement],
                initialText: "atomic-initial",
                replacementText: "atomic-replacement",
                responseContractId: "#replacement",
                party: "Alice::1",
            }),
        ).toBe(replacement);

        expect(() =>
            assertAtomicMessageTerminalState({
                messages: [
                    exactActiveMessage(
                        "#initial",
                        "Alice::1",
                        "Alice::1",
                        "atomic-initial",
                    ),
                    replacement,
                ],
                initialText: "atomic-initial",
                replacementText: "atomic-replacement",
                responseContractId: "#replacement",
                party: "Alice::1",
            }),
        ).toThrow(/initial Message.*active/i);

        expect(() =>
            assertAtomicMessageTerminalState({
                messages: [
                    replacement,
                    exactActiveMessage(
                        "#duplicate",
                        "Alice::1",
                        "Alice::1",
                        "atomic-replacement",
                    ),
                ],
                initialText: "atomic-initial",
                replacementText: "atomic-replacement",
                responseContractId: "#replacement",
                party: "Alice::1",
            }),
        ).toThrow(/exactly one active Message/i);

        expect(() =>
            assertAtomicMessageTerminalState({
                messages: [replacement],
                initialText: "atomic-initial",
                replacementText: "atomic-replacement",
                responseContractId: "#different",
                party: "Alice::1",
            }),
        ).toThrow(/response.*contract ID/i);
    });

    it.each([
        ["sender", "Bob::1", "Alice::1", "atomic-replacement"],
        ["recipient", "Alice::1", "Bob::1", "atomic-replacement"],
        ["text", "Alice::1", "Alice::1", "wrong"],
    ] as const)(
        "rejects an atomic replacement with the wrong %s",
        (_field, sender, recipient, text) => {
            expect(() =>
                assertAtomicMessageTerminalState({
                    messages: [
                        exactActiveMessage(
                            "#replacement",
                            sender,
                            recipient,
                            text,
                        ),
                    ],
                    initialText: "atomic-initial",
                    replacementText: "atomic-replacement",
                    responseContractId: "#replacement",
                    party: "Alice::1",
                }),
            ).toThrow();
        },
    );

    it("rejects a changed active-contract snapshot while collecting messages", async () => {
        let page = 0;

        await expect(
            collectActiveMessagesAcrossPagesAsync({
                request: buildActiveContractsRequest({ party: "Alice::1", templateId }),
                predicate: () => false,
                timeoutMs: 1_000,
                readPageAsync: async () => {
                    page += 1;

                    return ledgerApiV2.GetActiveContractsPageResponse.create({
                        activeAtOffset: page === 1 ? "42" : "43",
                        nextPageToken: new Uint8Array([1]),
                    });
                },
                now: () => 100,
            }),
        ).rejects.toThrow(/different snapshot/i);
    });

    it("rejects a paginated first page without a stable active-contract snapshot", async () => {
        let calls = 0;

        await expect(
            collectActiveMessagesAcrossPagesAsync({
                request: buildActiveContractsRequest({ party: "Alice::1", templateId }),
                predicate: () => false,
                timeoutMs: 1_000,
                readPageAsync: async () => {
                    calls += 1;

                    return {
                        activeContracts: [],
                        nextPageToken: new Uint8Array([1]),
                    } as never;
                },
                now: () => 100,
            }),
        ).rejects.toThrow(/non-empty.*snapshot/i);
        expect(calls).toBe(1);
    });

    it("rejects a later active-contract page without the first snapshot offset", async () => {
        let page = 0;

        await expect(
            collectActiveMessagesAcrossPagesAsync({
                request: buildActiveContractsRequest({ party: "Alice::1", templateId }),
                predicate: () => false,
                timeoutMs: 1_000,
                readPageAsync: async () => {
                    page += 1;

                    return ledgerApiV2.GetActiveContractsPageResponse.create(
                        page === 1
                            ? {
                                  activeAtOffset: "42",
                                  nextPageToken: new Uint8Array([1]),
                              }
                            : {},
                    );
                },
                now: () => 100,
            }),
        ).rejects.toThrow(/different snapshot/i);
    });

    it("rejects a repeated page token while collecting messages", async () => {
        await expect(
            collectActiveMessagesAcrossPagesAsync({
                request: buildActiveContractsRequest({ party: "Alice::1", templateId }),
                predicate: () => false,
                timeoutMs: 1_000,
                readPageAsync: async () =>
                    ledgerApiV2.GetActiveContractsPageResponse.create({
                        activeAtOffset: "42",
                        nextPageToken: new Uint8Array([1]),
                    }),
                now: () => 100,
            }),
        ).rejects.toThrow(/repeated a page token/i);
    });

    it("does not reset the shared deadline while collecting messages", async () => {
        let now = 100;

        let calls = 0;

        await expect(
            collectActiveMessagesAcrossPagesAsync({
                request: buildActiveContractsRequest({ party: "Alice::1", templateId }),
                predicate: () => false,
                timeoutMs: 10,
                readPageAsync: async () => {
                    calls += 1;
                    now = 110;

                    return ledgerApiV2.GetActiveContractsPageResponse.create({
                        activeAtOffset: "42",
                        nextPageToken: new Uint8Array([1]),
                    });
                },
                now: () => now,
            }),
        ).rejects.toThrow(/SDK_EXAMPLE_TIMEOUT_MS/);
        expect(calls).toBe(1);
    });

    it("returns undefined for absent, non-active, incomplete, empty, and different contracts", () => {
        const otherCreatedEvent = ledgerApiV2.CreatedEvent.create({
            contractId: "#other",
        });

        const malformedEntries: readonly unknown[] = [
            undefined,
            {},
            { contractEntry: { oneofKind: "incompleteAssigned" } },
            { contractEntry: { oneofKind: "activeContract" } },
            {
                contractEntry: {
                    oneofKind: "activeContract",
                    activeContract: {},
                },
            },
            {
                contractEntry: {
                    oneofKind: "activeContract",
                    activeContract: {
                        createdEvent: { contractId: "" },
                    },
                },
            },
            {
                contractEntry: {
                    oneofKind: "activeContract",
                    activeContract: { createdEvent: otherCreatedEvent },
                },
            },
        ];

        expect(findActiveMessage([], "#missing")).toBeUndefined();
        expect(findActiveMessage(malformedEntries, "#message")).toBeUndefined();
        expect(findActiveMessage(malformedEntries, "")).toBeUndefined();
    });

    it("rejects an empty party or incomplete template identifier", () => {
        expect(() =>
            buildActiveContractsRequest({ party: " ", templateId }),
        ).toThrow(/party/i);
        expect(() =>
            buildActiveContractsRequest({
                party: "Alice::1",
                templateId: { ...templateId, entityName: "" },
            }),
        ).toThrow(/template.*entity/i);
    });

    it("builds an ACS-delta update stream request for one party and template", () => {
        const request = buildUpdatesRequest({
            beginExclusive: "42",
            party: "Alice::1",
            templateId,
        });

        expect(ledgerApiV2.GetUpdatesRequest.is(request)).toBe(true);
        expect(request).toMatchObject({
            beginExclusive: "42",
            descendingOrder: false,
            updateFormat: {
                includeTransactions: {
                    transactionShape: ledgerApiV2.TransactionShape.ACS_DELTA,
                    eventFormat: {
                        filtersByParty: {
                            "Alice::1": {
                                cumulative: [{
                                    identifierFilter: {
                                        oneofKind: "templateFilter",
                                        templateFilter: {
                                            templateId: {
                                                packageId: "#package-name",
                                                moduleName: "DebugPlayground",
                                                entityName: "Message",
                                            },
                                            includeCreatedEventBlob: false,
                                        },
                                    },
                                }],
                            },
                        },
                        verbose: true,
                    },
                },
            },
        });
    });

    it("rejects empty update stream offsets, parties, and template identifiers", () => {
        expect(() =>
            buildUpdatesRequest({
                beginExclusive: " ",
                party: "Alice::1",
                templateId,
            }),
        ).toThrow(/begin.*exclusive/i);
        expect(() =>
            buildUpdatesRequest({
                beginExclusive: "42",
                party: " ",
                templateId,
            }),
        ).toThrow(/party/i);
        expect(() =>
            buildUpdatesRequest({
                beginExclusive: "42",
                party: "Alice::1",
                templateId: { ...templateId, packageId: "" },
            }),
        ).toThrow(/template.*package/i);
    });

    it("matches an exact created contract in a later transaction event", () => {
        const response = transactionUpdate({
            updateId: "update-17",
            offset: "73",
            eventContractIds: ["#other", "#message"],
        });

        expect(
            matchCreatedMessageUpdate({ response, contractId: "#message" }),
        ).toEqual({
            updateId: "update-17",
            offset: "73",
            contractId: "#message",
        });
    });

    it("ignores malformed, non-transaction, and non-matching stream updates", () => {
        const archived = ledgerApiV2.Event.create({
            event: {
                oneofKind: "archived",
                archived: ledgerApiV2.ArchivedEvent.create({ contractId: "#message" }),
            },
        });

        const exercised = ledgerApiV2.Event.create({
            event: {
                oneofKind: "exercised",
                exercised: ledgerApiV2.ExercisedEvent.create({ contractId: "#message" }),
            },
        });

        const rejected: readonly unknown[] = [
            undefined,
            {},
            ledgerApiV2.GetUpdatesResponse.create({
                update: { oneofKind: "offsetCheckpoint", offsetCheckpoint: { offset: "73", synchronizerTimes: [] } },
            }),
            ledgerApiV2.GetUpdatesResponse.create({
                update: { oneofKind: "reassignment", reassignment: ledgerApiV2.Reassignment.create({}) },
            }),
            ledgerApiV2.GetUpdatesResponse.create({
                update: { oneofKind: "topologyTransaction", topologyTransaction: ledgerApiV2.TopologyTransaction.create({}) },
            }),
            transactionUpdate({ updateId: "", offset: "73", eventContractIds: ["#message"] }),
            transactionUpdate({ updateId: "update-17", offset: "", eventContractIds: ["#message"] }),
            transactionUpdate({ updateId: "update-17", offset: "73", eventContractIds: [" "] }),
            transactionUpdate({ updateId: "update-17", offset: "73", eventContractIds: ["#other"] }),
            ledgerApiV2.GetUpdatesResponse.create({
                update: {
                    oneofKind: "transaction",
                    transaction: ledgerApiV2.Transaction.create({
                        updateId: "update-17",
                        offset: "73",
                        events: [archived, exercised],
                    }),
                },
            }),
            { update: { oneofKind: "transaction", transaction: { updateId: "update-17", offset: "73", events: [{}] } } },
        ];

        for (const response of rejected) {
            expect(
                matchCreatedMessageUpdate({ response, contractId: "#message" }),
            ).toBeUndefined();
        }

        expect(
            matchCreatedMessageUpdate({
                response: transactionUpdate({
                    updateId: "update-17",
                    offset: "73",
                    eventContractIds: ["#message"],
                }),
                contractId: " ",
            }),
        ).toBeUndefined();
    });
});

function transactionUpdate(init: {
    updateId: string;
    offset: string;
    eventContractIds: readonly string[];
}): ledgerApiV2.GetUpdatesResponse {
    return ledgerApiV2.GetUpdatesResponse.create({
        update: {
            oneofKind: "transaction",
            transaction: ledgerApiV2.Transaction.create({
                updateId: init.updateId,
                offset: init.offset,
                events: init.eventContractIds.map(contractId =>
                    ledgerApiV2.Event.create({
                        event: {
                            oneofKind: "created",
                            created: ledgerApiV2.CreatedEvent.create({ contractId }),
                        },
                    }),
                ),
            }),
        },
    });
}

function activeContractResponse(
    createdEvent: string | ledgerApiV2.CreatedEvent,
): ledgerApiV2.GetActiveContractsResponse {
    return ledgerApiV2.GetActiveContractsResponse.create({
        contractEntry: {
            oneofKind: "activeContract",
            activeContract: ledgerApiV2.ActiveContract.create({
                createdEvent:
                    typeof createdEvent === "string"
                        ? ledgerApiV2.CreatedEvent.create({
                              contractId: createdEvent,
                          })
                        : createdEvent,
            }),
        },
    });
}

function activeMessage(
    contractId: string,
    text: string,
): ledgerApiV2.CreatedEvent {
    return ledgerApiV2.CreatedEvent.create({
        contractId,
        createArguments: ledgerApiV2.Record.create({
            fields: [{
                label: "text",
                value: { sum: { oneofKind: "text", text } },
            }],
        }),
    });
}

function exactActiveMessage(
    contractId: string,
    sender: string,
    recipient: string,
    text: string,
): ledgerApiV2.CreatedEvent {
    return ledgerApiV2.CreatedEvent.create({
        contractId,
        createArguments: ledgerApiV2.Record.create({
            fields: [
                {
                    label: "sender",
                    value: { sum: { oneofKind: "party", party: sender } },
                },
                {
                    label: "recipient",
                    value: { sum: { oneofKind: "party", party: recipient } },
                },
                {
                    label: "text",
                    value: { sum: { oneofKind: "text", text } },
                },
            ],
        }),
    });
}
