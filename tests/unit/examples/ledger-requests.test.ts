import { ledgerApiV2 } from "@distrohelena/canton-typescript-sdk/protobuf";
import { describe, expect, it } from "vitest";
import {
    buildActiveContractsRequest,
    findActiveMessage,
} from "../../../examples/shared/ledger-requests.js";

const templateId = {
    packageId: "package",
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
                        templateId,
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
});
