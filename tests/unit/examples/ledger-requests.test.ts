import { ledgerApiV2 } from "@distrohelena/canton-typescript-sdk/protobuf";
import { describe, expect, it } from "vitest";
import {
    buildActiveContractsRequest,
    findActiveMessage,
    findActiveMessageAcrossPagesAsync,
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
