import { ledgerApiV2 } from "@distrohelena/canton-typescript-sdk/protobuf";
import { describe, expect, it } from "vitest";
import type { ExampleTemplateId } from "../../../examples/shared/application-fixture.js";
import {
    assertUpdateLookupMatchesCapturedMessageTransaction,
    captureExactMessageTransaction,
} from "../../../examples/shared/update-lookup-reconciliation.js";

const party = "Alice::lookup";

const templateId: ExampleTemplateId = {
    packageId: "raw-package-hash",
    packageName: "debug-playground",
    moduleName: "DebugPlayground",
    entityName: "Message",
};

const contractId = "#lookup-message";

const text = "update lookup reconciliation";

const commandId = "update-lookup-command";

describe("update lookup reconciliation assertions", () => {
    it("skips unrelated updates and captures exactly one complete generated Message transaction", () => {
        const unrelated = streamResponse({
            transaction: transaction({
                updateId: "unrelated-update",
                offset: "41",
                synchronizerId: "synchronizer-unrelated",
                commandId: "unrelated-command",
                events: [createdEvent({ contractId: "#unrelated" })],
            }),
        });

        expect(captureExactMessageTransaction({
            response: unrelated,
            contractId,
            party,
            templateId,
            text,
            commandId,
        })).toBeUndefined();

        const response = streamResponse({ transaction: transaction() });

        const captured = captureExactMessageTransaction({
            response,
            contractId,
            party,
            templateId,
            text,
            commandId,
        });

        expect(captured).toMatchObject({
            updateId: "update-17",
            offset: "73",
            synchronizerId: "synchronizer-1",
            commandId,
            contractId,
            party,
            templateId,
            text,
        });
        expect(captured?.transaction).toBe(response.update.transaction);
        expect(captured?.createdEvent).toBe(response.update.transaction.events[0]?.event.created);
    });

    it.each([
        ["reassignment", streamResponse({ reassignment: ledgerApiV2.Reassignment.create() })],
        ["topology transaction", streamResponse({ topologyTransaction: ledgerApiV2.TopologyTransaction.create() })],
        ["offset checkpoint", streamResponse({ offsetCheckpoint: ledgerApiV2.OffsetCheckpoint.create() })],
        ["empty update", ledgerApiV2.GetUpdatesResponse.create({})],
        ["non-generated object", { update: { oneofKind: "transaction", transaction: {} } }],
    ])("skips a non-matching %s response", (_label, response) => {
        expect(captureExactMessageTransaction({
            response,
            contractId,
            party,
            templateId,
            text,
            commandId,
        })).toBeUndefined();
    });

    it.each([
        ["blank update ID", transaction({ updateId: " " })],
        ["blank offset", transaction({ offset: " " })],
        ["blank synchronizer ID", transaction({ synchronizerId: " " })],
        ["wrong command ID", transaction({ commandId: "other-command" })],
        ["two created events", transaction({ events: [createdEvent(), createdEvent()] })],
        ["a created event plus another event", transaction({
            events: [
                createdEvent(),
                ledgerApiV2.Event.create({ event: { oneofKind: "archived", archived: ledgerApiV2.ArchivedEvent.create() } }),
            ],
        })],
        ["wrong template package", transaction({ events: [createdEvent({ templateId: identifier({ packageId: "other-package" }) })] })],
        ["wrong template module", transaction({ events: [createdEvent({ templateId: identifier({ moduleName: "Other" }) })] })],
        ["wrong template entity", transaction({ events: [createdEvent({ templateId: identifier({ entityName: "Other" }) })] })],
        ["wrong event package name", transaction({ events: [createdEvent({ packageName: "other-package-name" })] })],
        ["blank sender label", transaction({ events: [createdEvent({ createArguments: messageArguments({ labels: ["", "recipient", "text"] }) })] })],
        ["wrong field kind", transaction({ events: [createdEvent({ createArguments: messageArguments({ senderValue: { sum: { oneofKind: "text", text: party } } }) })] })],
        ["wrong text", transaction({ events: [createdEvent({ createArguments: messageArguments({ text: "other text" }) })] })],
        ["wrong witnesses", transaction({ events: [createdEvent({ witnessParties: [] })] })],
        ["wrong signatories", transaction({ events: [createdEvent({ signatories: ["Bob::lookup"] })] })],
        ["unexpected observers", transaction({ events: [createdEvent({ observers: [party] })] })],
    ] as const)("rejects a matching transaction with %s", (_label, malformed) => {
        expect(() => captureExactMessageTransaction({
            response: streamResponse({ transaction: malformed }),
            contractId,
            party,
            templateId,
            text,
            commandId,
        })).toThrow();
    });

    it("requires all extractor inputs to be nonblank", () => {
        for (const invalid of [
            { contractId: " " },
            { party: " " },
            { text: " " },
            { commandId: " " },
            { templateId: { ...templateId, packageId: " " } },
            { templateId: { ...templateId, packageName: " " } },
            { templateId: { ...templateId, moduleName: " " } },
            { templateId: { ...templateId, entityName: " " } },
        ]) {
            expect(() => captureExactMessageTransaction({
                response: streamResponse({ transaction: transaction() }),
                contractId,
                party,
                templateId,
                text,
                commandId,
                ...invalid,
            })).toThrow(/must not be empty/i);
        }
    });

    it("requires each unary lookup to be the exact captured transaction", () => {
        const captured = mustCapture();

        for (const response of [
            lookupResponse({ transaction: transaction() }),
            lookupResponse({ transaction: transaction() }),
        ]) {
            expect(assertUpdateLookupMatchesCapturedMessageTransaction({
                response,
                captured,
            })).toBe(response.update.transaction);
        }
    });

    it.each([
        ["empty update", ledgerApiV2.GetUpdateResponse.create({})],
        ["reassignment", lookupResponse({ reassignment: ledgerApiV2.Reassignment.create() })],
        ["topology transaction", lookupResponse({ topologyTransaction: ledgerApiV2.TopologyTransaction.create() })],
        ["non-generated object", { update: { oneofKind: "transaction", transaction: {} } }],
        ["update ID", lookupResponse({ transaction: transaction({ updateId: "other-update" }) })],
        ["offset", lookupResponse({ transaction: transaction({ offset: "74" }) })],
        ["synchronizer", lookupResponse({ transaction: transaction({ synchronizerId: "synchronizer-other" }) })],
        ["command ID", lookupResponse({ transaction: transaction({ commandId: "other-command" }) })],
        ["contract ID", lookupResponse({ transaction: transaction({ events: [createdEvent({ contractId: "#other" })] }) })],
        ["template", lookupResponse({ transaction: transaction({ events: [createdEvent({ templateId: identifier({ entityName: "Other" }) })] }) })],
        ["package name", lookupResponse({ transaction: transaction({ events: [createdEvent({ packageName: "other-package-name" })] }) })],
        ["field labels", lookupResponse({ transaction: transaction({ events: [createdEvent({ createArguments: messageArguments({ labels: ["", "recipient", "text"] }) })] }) })],
        ["payload", lookupResponse({ transaction: transaction({ events: [createdEvent({ createArguments: messageArguments({ text: "other text" }) })] }) })],
        ["witnesses", lookupResponse({ transaction: transaction({ events: [createdEvent({ witnessParties: [] })] }) })],
        ["signatories", lookupResponse({ transaction: transaction({ events: [createdEvent({ signatories: [] })] }) })],
        ["observers", lookupResponse({ transaction: transaction({ events: [createdEvent({ observers: [party] })] }) })],
        ["extra event", lookupResponse({ transaction: transaction({ events: [createdEvent(), createdEvent({ contractId: "#other" })] }) })],
    ] as const)("rejects a unary lookup mismatch in %s", (_label, response) => {
        expect(() => assertUpdateLookupMatchesCapturedMessageTransaction({
            response,
            captured: mustCapture(),
        })).toThrow();
    });
});

function mustCapture() {
    const captured = captureExactMessageTransaction({
        response: streamResponse({ transaction: transaction() }),
        contractId,
        party,
        templateId,
        text,
        commandId,
    });

    if (captured === undefined) {
        throw new Error("Expected the fixture transaction to be captured.");
    }

    return captured;
}

function streamResponse(init: {
    readonly transaction?: ledgerApiV2.Transaction;
    readonly reassignment?: ledgerApiV2.Reassignment;
    readonly topologyTransaction?: ledgerApiV2.TopologyTransaction;
    readonly offsetCheckpoint?: ledgerApiV2.OffsetCheckpoint;
}): ledgerApiV2.GetUpdatesResponse {
    const update = init.transaction !== undefined
        ? { oneofKind: "transaction" as const, transaction: init.transaction }
        : init.reassignment !== undefined
            ? { oneofKind: "reassignment" as const, reassignment: init.reassignment }
            : init.topologyTransaction !== undefined
                ? { oneofKind: "topologyTransaction" as const, topologyTransaction: init.topologyTransaction }
                : init.offsetCheckpoint !== undefined
                    ? { oneofKind: "offsetCheckpoint" as const, offsetCheckpoint: init.offsetCheckpoint }
                    : { oneofKind: undefined };

    return ledgerApiV2.GetUpdatesResponse.create({ update });
}

function lookupResponse(init: {
    readonly transaction?: ledgerApiV2.Transaction;
    readonly reassignment?: ledgerApiV2.Reassignment;
    readonly topologyTransaction?: ledgerApiV2.TopologyTransaction;
}): ledgerApiV2.GetUpdateResponse {
    const update = init.transaction !== undefined
        ? { oneofKind: "transaction" as const, transaction: init.transaction }
        : init.reassignment !== undefined
            ? { oneofKind: "reassignment" as const, reassignment: init.reassignment }
            : init.topologyTransaction !== undefined
                ? { oneofKind: "topologyTransaction" as const, topologyTransaction: init.topologyTransaction }
                : { oneofKind: undefined };

    return ledgerApiV2.GetUpdateResponse.create({ update });
}

function transaction(
    overrides: Partial<ledgerApiV2.Transaction> = {},
): ledgerApiV2.Transaction {
    return ledgerApiV2.Transaction.create({
        updateId: "update-17",
        offset: "73",
        synchronizerId: "synchronizer-1",
        commandId,
        events: [createdEvent()],
        ...overrides,
    });
}

function createdEvent(
    overrides: Partial<ledgerApiV2.CreatedEvent> = {},
): ledgerApiV2.Event {
    return ledgerApiV2.Event.create({
        event: {
            oneofKind: "created",
            created: ledgerApiV2.CreatedEvent.create({
                contractId,
                templateId: identifier(),
                packageName: templateId.packageName,
                createArguments: messageArguments(),
                witnessParties: [party],
                signatories: [party],
                observers: [],
                ...overrides,
            }),
        },
    });
}

function identifier(
    overrides: Partial<ledgerApiV2.Identifier> = {},
): ledgerApiV2.Identifier {
    return ledgerApiV2.Identifier.create({
        packageId: templateId.packageId,
        moduleName: templateId.moduleName,
        entityName: templateId.entityName,
        ...overrides,
    });
}

function messageArguments(init: {
    readonly labels?: readonly [string, string, string];
    readonly senderValue?: ledgerApiV2.Value;
    readonly recipientValue?: ledgerApiV2.Value;
    readonly text?: string;
} = {}): ledgerApiV2.Record {
    const labels = init.labels ?? ["sender", "recipient", "text"];

    return ledgerApiV2.Record.create({
        fields: [
            {
                label: labels[0],
                value: init.senderValue ?? ledgerApiV2.Value.create({
                    sum: { oneofKind: "party", party },
                }),
            },
            {
                label: labels[1],
                value: init.recipientValue ?? ledgerApiV2.Value.create({
                    sum: { oneofKind: "party", party },
                }),
            },
            {
                label: labels[2],
                value: ledgerApiV2.Value.create({
                    sum: { oneofKind: "text", text: init.text ?? text },
                }),
            },
        ],
    });
}
