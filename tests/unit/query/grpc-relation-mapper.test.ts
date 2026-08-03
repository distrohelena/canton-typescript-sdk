import { describe, expect, it } from "vitest";
import { ValidationError } from "../../../src/core/errors/validation-error.js";
import { mapGrpcQueryRelationFragment } from "../../../src/query/grpc/grpc-relation-mapper.js";
import { Event, CreatedEvent, ExercisedEvent } from "../../../src/transports/grpc/generated/canton/com/daml/ledger/api/v2/event.js";
import { Transaction } from "../../../src/transports/grpc/generated/canton/com/daml/ledger/api/v2/transaction.js";
import { Value } from "../../../src/transports/grpc/generated/canton/com/daml/ledger/api/v2/value.js";
import { GetActiveContractsResponse } from "../../../src/transports/grpc/generated/canton/com/daml/ledger/api/v2/state_service.js";

const template = { packageId: "pkg-id", moduleName: "Main", entityName: "Asset" };

const create = (contractId = "C1") => CreatedEvent.create({ offset: "10", nodeId: 1, contractId, templateId: template, packageName: "app", witnessParties: ["Alice"], createdAt: { seconds: "1700000000", nanos: 123_000_000 }, createArguments: { fields: [{ label: "owner", value: Value.create({ sum: { oneofKind: "party", party: "Alice" } }) }] } });

const exercise = (consuming = true) => ExercisedEvent.create({ offset: "20", nodeId: 2, contractId: "C1", templateId: template, packageName: "app", choice: "Archive", choiceArgument: Value.create({ sum: { oneofKind: "record", record: { fields: [{ label: "by", value: Value.create({ sum: { oneofKind: "party", party: "Alice" } }) }] } } }), exerciseResult: Value.create({ sum: { oneofKind: "unit", unit: {} } }), actingParties: ["Alice"], witnessParties: ["Alice"], consuming, lastDescendantNodeId: 2 });

const transaction = (offset: string, events: Event[]) => Transaction.create({ offset, updateId: `update-${offset}`, effectiveAt: { seconds: "1700000100", nanos: 456_000_000 }, workflowId: "workflow", synchronizerId: "sync", traceContext: { traceId: "trace", spanId: "span", traceFlags: 1 }, externalTransactionHash: new Uint8Array([1, 2]), paidTrafficCost: "9007199254740993", events });

describe("mapGrpcQueryRelationFragment", () => {
    it("materializes transaction, event, contract, and exercise rows without package/type fabrication", () => {
        const fragment = mapGrpcQueryRelationFragment([
            transaction("20", [Event.create({ event: { oneofKind: "exercised", exercised: exercise() } })]),
            transaction("10", [Event.create({ event: { oneofKind: "created", created: create() } })]),
        ]);

        expect(fragment.transactions).toEqual([expect.objectContaining({ ix: "10", offset: "10", transactionId: "update-10", effectiveAt: new Date("2023-11-14T22:15:00.456Z"), workflowId: "workflow", domainId: "sync", paidTrafficCost: "9007199254740993" }), expect.objectContaining({ ix: "20" })]);
        expect(fragment.events.map(row => [row.txIx, row.eventId, row.type])).toEqual([["10", "10:1", "created"], ["20", "20:2", "exercised"]]);
        expect(fragment.contracts).toEqual([expect.objectContaining({ contractId: "C1", payload: { owner: "Alice" }, createdEventOffset: "10", archivedEventOffset: "20", active: false, archivedAt: new Date("2023-11-14T22:15:00.456Z") })]);
        expect(fragment.exercises).toEqual([expect.objectContaining({ contractId: "C1", argument: { by: "Alice" }, result: null, controllers: ["Alice"], witnesses: ["Alice"], redactionId: null, exercisedAtIx: "20" })]);
        expect(fragment.typeIdentities).toContainEqual(expect.objectContaining({ templateId: template, packageId: "pkg-id", choice: "Archive", consuming: true }));
        expect(Object.keys(fragment.contracts[0]!)).not.toContain("tpePk");
        expect(Object.isFrozen(fragment.contracts)).toBe(true);
    });

    it("rejects contradictory lifecycle data instead of overwriting it", () => {
        expect(() => mapGrpcQueryRelationFragment([transaction("10", [Event.create({ event: { oneofKind: "created", created: create() } })]), transaction("11", [Event.create({ event: { oneofKind: "created", created: CreatedEvent.create({ ...create(), offset: "11" }) } })])])).toThrow(/duplicate contract/i);
        expect(() => mapGrpcQueryRelationFragment([transaction("20", [Event.create({ event: { oneofKind: "exercised", exercised: exercise() } })])])).toThrow(/unknown contract/i);
        expect(() => mapGrpcQueryRelationFragment([Transaction.create({ ...transaction("10", []), paidTrafficCost: "9223372036854775808" })])).toThrow(/traffic cost/i);
    });

    it("links an exercise to its target contract type even when the exercised template was upgraded", () => {
        const upgraded = ExercisedEvent.create({ ...exercise(false), templateId: { packageId: "pkg-upgrade", moduleName: "Main", entityName: "Asset" } });

        const fragment = mapGrpcQueryRelationFragment([
            transaction("10", [Event.create({ event: { oneofKind: "created", created: create() } })]),
            transaction("20", [Event.create({ event: { oneofKind: "exercised", exercised: upgraded } })]),
        ]);

        const contractType = fragment.typeIdentities.find((identity) => identity.choice === undefined && identity.templateId.packageId === "pkg-id")!;

        const exerciseType = fragment.typeIdentities.find((identity) => identity.choice === "Archive")!;

        expect(fragment.exercises[0]).toMatchObject({ contractTpePk: contractType.pk, tpePk: exerciseType.pk });
    });

    it("rejects ACS data that conflicts with the complete history", () => {
        const contradictoryAcs = GetActiveContractsResponse.create({ contractEntry: { oneofKind: "activeContract", activeContract: { createdEvent: CreatedEvent.create({ ...create(), offset: "99" }) } } });

        expect(() => mapGrpcQueryRelationFragment([transaction("10", [Event.create({ event: { oneofKind: "created", created: create() } })])], [contradictoryAcs])).toThrow(/ACS.*conflicts/i);
    });

    it("has deterministic registry keys and rejects duplicate ledger node identities", () => {
        const first = mapGrpcQueryRelationFragment([
            transaction("20", [Event.create({ event: { oneofKind: "exercised", exercised: exercise(false) } })]),
            transaction("10", [Event.create({ event: { oneofKind: "created", created: create() } })]),
        ]);

        const second = mapGrpcQueryRelationFragment([
            transaction("10", [Event.create({ event: { oneofKind: "created", created: create() } })]),
            transaction("20", [Event.create({ event: { oneofKind: "exercised", exercised: exercise(false) } })]),
        ]);

        const duplicateNode = CreatedEvent.create({ ...create("C2") });

        expect(second.events).toEqual(first.events);
        expect(second.exercises).toEqual(first.exercises);
        expect(second.typeIdentities).toEqual(first.typeIdentities);
        expect(second.packageIdentities).toEqual(first.packageIdentities);
        expect(() => mapGrpcQueryRelationFragment([transaction("10", [Event.create({ event: { oneofKind: "created", created: create() } }), Event.create({ event: { oneofKind: "created", created: duplicateNode } })])])).toThrow(/duplicate event/i);
    });
});
