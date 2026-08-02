import { ledgerApiV2 } from "@distrohelena/canton-typescript-sdk/protobuf";
import { describe, expect, it } from "vitest";
import * as ledgerRequests from "../../../examples/shared/ledger-requests.js";
import {
    assertAtomicMessageTerminalState,
    assertExactlyOneActiveMessage,
    assertMessageContractAbsent,
    buildActiveContractsRequest,
    buildUpdatesRequest,
    findActiveMessage,
    matchCreatedMessageUpdate,
} from "../../../examples/shared/ledger-requests.js";

const templateId = {
    packageId: "package",
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
        createArguments: ledgerApiV2.Record.create({
            fields: [
                { label: "sender", value: { sum: { oneofKind: "party", party: "Alice::1" } } },
                { label: "recipient", value: { sum: { oneofKind: "party", party: "Alice::1" } } },
                { label: "text", value: { sum: { oneofKind: "text", text } } },
            ],
        }),
    });
}
