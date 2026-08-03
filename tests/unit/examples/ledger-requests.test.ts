import { ledgerApiV2 } from "@distrohelena/canton-typescript-sdk/protobuf";
import { describe, expect, it } from "vitest";
import * as ledgerRequests from "../../../examples/shared/ledger-requests.js";
import {
    assertAtomicMessageBatchState,
    assertAtomicMessageTerminalState,
    assertExactlyOneActiveMessage,
    assertMessageContractAbsent,
    buildActiveContractsRequest,
    buildMessageUpdateFormat,
    buildUpdatesRequest,
    extractTwoCreatedContractIds,
    findActiveMessage,
    matchCreatedMessageUpdate,
} from "../../../examples/shared/ledger-requests.js";

const templateId = {
    packageId: "raw-package-hash",
    packageName: "package-name",
    moduleName: "DebugPlayground",
    entityName: "Message",
};

const removedActiveContractsHelpers = [
    "find" + "ActiveMessageAcrossPagesAsync",
    "collect" + "ActiveMessagesAcrossPagesAsync",
];

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
                    },
                },
            });
        expect(request.activeAtOffset).toBeUndefined();
        expect(request.pageToken).toBeUndefined();
    });

    it("keeps only non-pagination Message helpers", () => {
        for (const helper of removedActiveContractsHelpers) {
            expect(ledgerRequests).not.toHaveProperty(helper);
        }
    });

    it("finds only the exact created event from an active contract", () => {
        const message = activeMessage("#message", "text");

        expect(
            findActiveMessage([activeContractResponse(message)], "#message"),
        ).toEqual(message);
        expect(findActiveMessage([activeContractResponse(message)], "#other")).toBeUndefined();
        expect(findActiveMessage([activeContractResponse(message)], " ")).toBeUndefined();
    });

    it("keeps exact active Message assertions", () => {
        const replacement = exactMessage("#replacement", "replacement");

        expect(assertExactlyOneActiveMessage({
            messages: [replacement],
            textMarker: "replacement",
        })).toBe(replacement);
        expect(() => assertExactlyOneActiveMessage({
            messages: [replacement, exactMessage("#second", "replacement")],
            textMarker: "replacement",
        })).toThrow(/exactly one/i);
        expect(() => assertMessageContractAbsent({
            messages: [replacement],
            contractId: "#replacement",
        })).toThrow(/still active/i);
        expect(assertAtomicMessageTerminalState({
            messages: [replacement],
            initialText: "initial",
            replacementText: "replacement",
            responseContractId: "#replacement",
            party: "Alice::1",
        })).toBe(replacement);
    });

    it("proves a rejected first batch create is absent while both atomic batch creates are active", () => {
        const invalidFirstText = "invalid-first";

        const firstText = "valid-first";

        const secondText = "valid-second";

        const first = exactMessage("#first", firstText);

        const second = exactMessage("#second", secondText);

        expect(assertAtomicMessageBatchState({
            messages: [first, second],
            invalidFirstText,
            firstText,
            secondText,
            responseContractIds: ["#first", "#second"],
            party: "Alice::1",
            templateId,
        })).toEqual([first, second]);

        expect(() => assertAtomicMessageBatchState({
            messages: [exactMessage("#invalid", invalidFirstText), first, second],
            invalidFirstText,
            firstText,
            secondText,
            responseContractIds: ["#first", "#second"],
            party: "Alice::1",
            templateId,
        })).toThrow(/absent/i);
        expect(() => assertAtomicMessageBatchState({
            messages: [first, exactMessage("#duplicate", firstText), second],
            invalidFirstText,
            firstText,
            secondText,
            responseContractIds: ["#first", "#second"],
            party: "Alice::1",
            templateId,
        })).toThrow(/exactly one/i);
        expect(() => assertAtomicMessageBatchState({
            messages: [first, second],
            invalidFirstText,
            firstText,
            secondText,
            responseContractIds: ["#first", "#other"],
            party: "Alice::1",
            templateId,
        })).toThrow(/response created contract IDs/i);
    });

    it("extracts exactly two created response IDs in order while ignoring other generated event kinds", () => {
        expect(extractTwoCreatedContractIds({
            events: [
                archivedResponseEvent("#archived"),
                {},
                createdResponseEvent("#first"),
                exercisedResponseEvent("#exercised"),
                createdResponseEvent("#second"),
            ],
        })).toEqual(["#first", "#second"]);
    });

    it.each([
        ["no created events", [], /exactly two created events.*found 0/i],
        ["one created event", [createdResponseEvent("#first")], /exactly two created events.*found 1/i],
        [
            "three created events",
            [
                createdResponseEvent("#first"),
                createdResponseEvent("#second"),
                createdResponseEvent("#third"),
            ],
            /exactly two created events.*found 3/i,
        ],
        [
            "duplicate created IDs",
            [createdResponseEvent("#first"), createdResponseEvent("#first")],
            /must be distinct/i,
        ],
        [
            "empty created ID",
            [createdResponseEvent("#first"), createdResponseEvent(" ")],
            /non-empty created contract ID/i,
        ],
    ])("rejects %s in an atomic batch response", (_description, events, message) => {
        expect(() => extractTwoCreatedContractIds({ events })).toThrow(message);
    });

    it("builds and matches the generated ACS-delta update request", () => {
        const request = buildUpdatesRequest({
            beginExclusive: "42",
            party: "Alice::1",
            templateId,
        });

        const response = ledgerApiV2.GetUpdatesResponse.create({
            update: {
                oneofKind: "transaction",
                transaction: ledgerApiV2.Transaction.create({
                    updateId: "update-17",
                    offset: "73",
                    events: [ledgerApiV2.Event.create({
                        event: {
                            oneofKind: "created",
                            created: ledgerApiV2.CreatedEvent.create({ contractId: "#message" }),
                        },
                    })],
                }),
            },
        });

        expect(request.updateFormat?.includeTransactions?.transactionShape)
            .toBe(ledgerApiV2.TransactionShape.ACS_DELTA);
        expect(matchCreatedMessageUpdate({ response, contractId: "#message" }))
            .toEqual({ updateId: "update-17", offset: "73", contractId: "#message" });
    });

    it("builds a generated verbose ACS-delta Message update format", () => {
        const updateFormat = buildMessageUpdateFormat({
            party: "Alice::1",
            templateId,
        });

        expect(ledgerApiV2.UpdateFormat.is(updateFormat)).toBe(true);
        expect(ledgerApiV2.TransactionFormat.is(updateFormat.includeTransactions))
            .toBe(true);
        expect(ledgerApiV2.EventFormat.is(
            updateFormat.includeTransactions?.eventFormat,
        )).toBe(true);
        expect(updateFormat).toMatchObject({
            includeTransactions: {
                transactionShape: ledgerApiV2.TransactionShape.ACS_DELTA,
                eventFormat: {
                    verbose: true,
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
                },
            },
        });
        expect(JSON.stringify(updateFormat)).not.toContain(templateId.packageId);
    });

    it.each([
        ["party", { ...templateId }, " "],
        ["template package ID", { ...templateId, packageId: " " }, "Alice::1"],
        ["template package name", { ...templateId, packageName: " " }, "Alice::1"],
        ["template module name", { ...templateId, moduleName: " " }, "Alice::1"],
        ["template entity name", { ...templateId, entityName: " " }, "Alice::1"],
    ])("rejects an empty %s when building the Message update format", (
        label,
        invalidTemplateId,
        party,
    ) => {
        expect(() => buildMessageUpdateFormat({
            party,
            templateId: invalidTemplateId,
        })).toThrow(`${label} must not be empty`);
    });
});

function activeContractResponse(
    createdEvent: ledgerApiV2.CreatedEvent,
): ledgerApiV2.GetActiveContractsResponse {
    return ledgerApiV2.GetActiveContractsResponse.create({
        contractEntry: {
            oneofKind: "activeContract",
            activeContract: ledgerApiV2.ActiveContract.create({ createdEvent }),
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

function exactMessage(
    contractId: string,
    text: string,
): ledgerApiV2.CreatedEvent {
    return ledgerApiV2.CreatedEvent.create({
        contractId,
        templateId: ledgerApiV2.Identifier.create({
            packageId: templateId.packageId,
            moduleName: templateId.moduleName,
            entityName: templateId.entityName,
        }),
        createArguments: ledgerApiV2.Record.create({
            fields: [
                { label: "sender", value: { sum: { oneofKind: "party", party: "Alice::1" } } },
                { label: "recipient", value: { sum: { oneofKind: "party", party: "Alice::1" } } },
                { label: "text", value: { sum: { oneofKind: "text", text } } },
            ],
        }),
    });
}

function createdResponseEvent(contractId: string): ledgerApiV2.Event {
    return ledgerApiV2.Event.create({
        event: {
            oneofKind: "created",
            created: ledgerApiV2.CreatedEvent.create({ contractId }),
        },
    });
}

function archivedResponseEvent(contractId: string): ledgerApiV2.Event {
    return ledgerApiV2.Event.create({
        event: {
            oneofKind: "archived",
            archived: ledgerApiV2.ArchivedEvent.create({ contractId }),
        },
    });
}

function exercisedResponseEvent(contractId: string): ledgerApiV2.Event {
    return ledgerApiV2.Event.create({
        event: {
            oneofKind: "exercised",
            exercised: ledgerApiV2.ExercisedEvent.create({ contractId }),
        },
    });
}
