import { describe, expect, it } from "vitest";
import { ValidationError } from "../../../src/core/errors/validation-error.js";
import { createGrpcQueryDataset, mapGrpcQueryRelationFragment, referencedGrpcPackageIds } from "../../../src/query/grpc/grpc-relation-mapper.js";
import { relatedQueryRows } from "../../../src/query/canonical/query-dataset.js";
import { InMemoryQueryEvaluator } from "../../../src/query/canonical/in-memory-query-evaluator.js";
import { normalizeFindMany } from "../../../src/query/canonical/query-normalizer.js";
import type { GrpcPackageMetadata } from "../../../src/query/grpc/grpc-package-relation-reader.js";
import { Event, CreatedEvent, ExercisedEvent } from "../../../src/transports/grpc/generated/canton/com/daml/ledger/api/v2/event.js";
import { Transaction } from "../../../src/transports/grpc/generated/canton/com/daml/ledger/api/v2/transaction.js";
import { Value } from "../../../src/transports/grpc/generated/canton/com/daml/ledger/api/v2/value.js";
import { GetActiveContractsResponse } from "../../../src/transports/grpc/generated/canton/com/daml/ledger/api/v2/state_service.js";

const template = { packageId: "pkg-id", moduleName: "Main", entityName: "Asset" };

const create = (contractId = "C1") => CreatedEvent.create({ offset: "10", nodeId: 1, contractId, templateId: template, packageName: "app", representativePackageId: "pkg-id", witnessParties: ["Alice"], signatories: ["Alice"], createdAt: { seconds: "1700000000", nanos: 123_000_000 }, createArguments: { fields: [{ label: "owner", value: Value.create({ sum: { oneofKind: "party", party: "Alice" } }) }] } });

const exercise = (consuming = true) => ExercisedEvent.create({ offset: "20", nodeId: 2, contractId: "C1", templateId: template, packageName: "app", choice: "Archive", choiceArgument: Value.create({ sum: { oneofKind: "record", record: { fields: [{ label: "by", value: Value.create({ sum: { oneofKind: "party", party: "Alice" } }) }] } } }), exerciseResult: Value.create({ sum: { oneofKind: "unit", unit: {} } }), actingParties: ["Alice"], witnessParties: ["Alice"], consuming, lastDescendantNodeId: 2 });

const transaction = (offset: string, events: Event[]) => Transaction.create({ offset, updateId: `update-${offset}`, effectiveAt: { seconds: "1700000100", nanos: 456_000_000 }, recordTime: { seconds: "1700000101", nanos: 0 }, workflowId: "workflow", synchronizerId: "sync", traceContext: { traceparent: "00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-00", tracestate: "vendor=value" }, externalTransactionHash: new Uint8Array([1, 2]), paidTrafficCost: "9007199254740993", events });

const active = (created: CreatedEvent) => GetActiveContractsResponse.create({ contractEntry: { oneofKind: "activeContract", activeContract: { createdEvent: created, synchronizerId: "sync", reassignmentCounter: "0" } } });

const activeOn = (created: CreatedEvent, synchronizerId: string, reassignmentCounter: string) => GetActiveContractsResponse.create({ contractEntry: { oneofKind: "activeContract", activeContract: { createdEvent: created, synchronizerId, reassignmentCounter } } });

describe("mapGrpcQueryRelationFragment", () => {
    it("materializes transaction, event, contract, and exercise rows without package/type fabrication", () => {
        const fragment = mapGrpcQueryRelationFragment([
            transaction("20", [Event.create({ event: { oneofKind: "exercised", exercised: exercise() } })]),
            transaction("10", [Event.create({ event: { oneofKind: "created", created: create() } })]),
        ]);

        expect(fragment.transactions).toEqual([expect.objectContaining({ ix: "10", offset: "10", transactionId: "update-10", effectiveAt: new Date("2023-11-14T22:15:00.456Z"), workflowId: "workflow", domainId: "sync", paidTrafficCost: "9007199254740993" }), expect.objectContaining({ ix: "20" })]);
        expect(fragment.events.map(row => [row.txIx, row.eventId, row.type])).toEqual([["10", "10:1", "created"], ["20", "20:2", "exercised"]]);
        expect(fragment.contracts).toEqual([expect.objectContaining({ contractId: "C1", payload: { owner: "Alice" }, createdEventOffset: "10", archivedEventOffset: "20", active: false, archivedAt: new Date("2023-11-14T22:15:00.456Z") })]);
        expect(fragment.exercises).toEqual([expect.objectContaining({ contractId: "C1", argument: { by: "Alice" }, result: {}, controllers: ["Alice"], witnesses: ["Alice"], redactionId: null, exercisedAtIx: "20" })]);
        expect(fragment.typeIdentities).toContainEqual(expect.objectContaining({ templateId: template, packageId: "pkg-id", choice: "Archive", consuming: true }));
        expect(fragment.transactions[0]?.traceContext).toEqual({ traceparent: "00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-00", tracestate: "vendor=value" });
        expect(Object.keys(fragment.contracts[0]!)).not.toContain("tpePk");
        expect(Object.isFrozen(fragment.contracts)).toBe(true);
    });

    it("rejects contradictory lifecycle data instead of overwriting it", () => {
        const secondArchive = ExercisedEvent.create({
            ...exercise(),
            offset: "30",
            nodeId: 3,
            lastDescendantNodeId: 3,
        });

        expect(() => mapGrpcQueryRelationFragment([transaction("10", [Event.create({ event: { oneofKind: "created", created: create() } })]), transaction("11", [Event.create({ event: { oneofKind: "created", created: CreatedEvent.create({ ...create(), offset: "11" }) } })])])).toThrow(/duplicate contract/i);
        expect(() => mapGrpcQueryRelationFragment([
            transaction("10", [Event.create({ event: { oneofKind: "created", created: create() } })]),
            transaction("20", [Event.create({ event: { oneofKind: "exercised", exercised: exercise() } })]),
            transaction("30", [Event.create({ event: { oneofKind: "exercised", exercised: secondArchive } })]),
        ])).toThrow(/already archived contract/i);
        expect(() => mapGrpcQueryRelationFragment([Transaction.create({ ...transaction("10", [Event.create({ event: { oneofKind: "created", created: create() } })]), paidTrafficCost: "9223372036854775808" })])).toThrow(/traffic cost/i);
    });

    it("materializes a consuming orphan exercise without fabricating contract lifecycle", () => {
        const orphanTemplate = {
            packageId: "pkg-orphan",
            moduleName: "Projected",
            entityName: "Asset",
        };

        const orphan = ExercisedEvent.create({
            ...exercise(),
            contractId: "orphan-contract",
            templateId: orphanTemplate,
        });

        const fragment = mapGrpcQueryRelationFragment([
            transaction("20", [Event.create({ event: { oneofKind: "exercised", exercised: orphan } })]),
        ]);

        const contractType = fragment.typeIdentities.find((identity) =>
            identity.choice === undefined
            && identity.templateId.packageId === orphanTemplate.packageId
        )!;

        const exerciseType = fragment.typeIdentities.find((identity) =>
            identity.choice === orphan.choice
        )!;

        expect(fragment.transactions).toHaveLength(1);
        expect(fragment.events).toEqual([
            expect.objectContaining({ txIx: "20", type: "exercised" }),
        ]);
        expect(fragment.exercises).toEqual([
            expect.objectContaining({
                contractId: "orphan-contract",
                contractTpePk: contractType.pk,
                tpePk: exerciseType.pk,
                exercisedAtIx: "20",
            }),
        ]);
        expect(fragment.contracts).toEqual([]);
        expect(fragment.creationIdentities).toEqual([]);
        expect(fragment.activeContractIdentities).toEqual([]);
        expect(fragment.packageIdentities).toContainEqual(
            expect.objectContaining({ id: orphanTemplate.packageId }),
        );
        expect(contractType.templateId).toEqual(orphanTemplate);
        expect(exerciseType.templateId).toEqual(orphanTemplate);
    });

    it("materializes multiple consuming orphans independently", () => {
        const second = ExercisedEvent.create({
            ...exercise(),
            offset: "30",
            nodeId: 3,
            lastDescendantNodeId: 3,
        });

        const fragment = mapGrpcQueryRelationFragment([
            transaction("20", [Event.create({ event: { oneofKind: "exercised", exercised: exercise() } })]),
            transaction("30", [Event.create({ event: { oneofKind: "exercised", exercised: second } })]),
        ]);

        expect(fragment.exercises).toHaveLength(2);
        expect(fragment.contracts).toEqual([]);
        expect(fragment.creationIdentities).toEqual([]);
        expect(fragment.activeContractIdentities).toEqual([]);
    });

    it("prefers the current transaction hash and preserves detached immutable bytes", () => {
        const current = new Uint8Array([3, 4]);

        const legacy = new Uint8Array([1, 2]);

        const newOnly = Transaction.create({ ...transaction("10", [Event.create({ event: { oneofKind: "created", created: create() } })]), externalTransactionHash: undefined, transactionHash: current });

        const both = Transaction.create({ ...transaction("11", [Event.create({ event: { oneofKind: "created", created: CreatedEvent.create({ ...create("C2"), offset: "11" }) } })]), externalTransactionHash: legacy, transactionHash: current });

        const oldOnly = Transaction.create({ ...transaction("12", [Event.create({ event: { oneofKind: "created", created: CreatedEvent.create({ ...create("C3"), offset: "12" }) } })]), transactionHash: undefined });

        const empty = Transaction.create({ ...transaction("13", [Event.create({ event: { oneofKind: "created", created: CreatedEvent.create({ ...create("C4"), offset: "13" }) } })]), externalTransactionHash: legacy, transactionHash: new Uint8Array() });

        const neither = Transaction.create({ ...transaction("14", [Event.create({ event: { oneofKind: "created", created: CreatedEvent.create({ ...create("C5"), offset: "14" }) } })]), externalTransactionHash: undefined, transactionHash: undefined });

        const rows = mapGrpcQueryRelationFragment([newOnly, both, oldOnly, empty, neither]).transactions;

        current[0] = 9;
        legacy[0] = 9;

        expect(rows.map((row) => row.externalTransactionHash === null ? null : [...row.externalTransactionHash])).toEqual([[3, 4], [3, 4], [1, 2], [], null]);
        expect(() => (rows[0]!.externalTransactionHash as Uint8Array)[0] = 7).toThrow();
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

    it("maps an inherited exercise to its interface while retaining concrete target and package semantics", () => {
        const creationTemplate = { packageId: "pkg-creation", moduleName: "Main", entityName: "Asset" };

        const concreteTemplate = { packageId: "pkg-concrete", moduleName: "Main", entityName: "Asset" };

        const interfaceId = { packageId: "pkg-interface", moduleName: "Api", entityName: "EventLog" };

        const created = CreatedEvent.create({
            ...create(),
            templateId: creationTemplate,
            representativePackageId: "pkg-representative",
        });

        const inherited = ExercisedEvent.create({
            ...exercise(false),
            templateId: concreteTemplate,
            interfaceId,
            choice: "EventLog_HoldingsChange",
        });

        const fragment = mapGrpcQueryRelationFragment([
            transaction("10", [Event.create({ event: { oneofKind: "created", created } })]),
            transaction("20", [Event.create({ event: { oneofKind: "exercised", exercised: inherited } })]),
        ]);

        const exerciseType = fragment.typeIdentities.find((identity) => identity.choice === inherited.choice)!;

        expect(exerciseType).toMatchObject({ templateId: interfaceId, packageId: interfaceId.packageId });
        expect(fragment.packageIdentities).toEqual(expect.arrayContaining([
            expect.objectContaining({ id: concreteTemplate.packageId }),
            expect.objectContaining({ id: interfaceId.packageId }),
        ]));
        expect(referencedGrpcPackageIds(fragment)).toEqual(["pkg-concrete", "pkg-interface", "pkg-representative"]);

        const interfacePackage: GrpcPackageMetadata = {
            id: interfaceId.packageId,
            name: "events",
            version: "1.0.0",
            templates: [{
                moduleName: interfaceId.moduleName,
                entityName: interfaceId.entityName,
                payloadType: "interface",
                aliases: ["events:Api:EventLog", "Api:EventLog", "EventLog"],
                templateFqn: "events:Api:EventLog",
                choices: [{
                    choice: inherited.choice,
                    consuming: inherited.consuming,
                    aliases: ["events:Api:EventLog:EventLog_HoldingsChange", "Api:EventLog:EventLog_HoldingsChange", "EventLog:EventLog_HoldingsChange", "EventLog_HoldingsChange"],
                    choiceFqn: "events:Api:EventLog:EventLog_HoldingsChange",
                }],
            }],
        };

        const dataset = createGrpcQueryDataset(fragment, [
            packageMetadata(concreteTemplate.packageId, "concrete", false),
            interfacePackage,
            packageMetadata("pkg-representative", "representative", false),
        ], "20", "grpc://participant");

        const exerciseRow = dataset.rows.exercises[0]!;

        expect(relatedQueryRows(dataset, "exercises", exerciseRow, "exerciseType")).toEqual([expect.objectContaining({ packageName: "events", entityName: "EventLog", choice: "EventLog_HoldingsChange" })]);
        expect(relatedQueryRows(dataset, "exercises", exerciseRow, "contractType")).toEqual([expect.objectContaining({ packageName: "representative", entityName: "Asset", payloadType: "template" })]);
        expect(relatedQueryRows(dataset, "exercises", exerciseRow, "package")).toEqual([expect.objectContaining({ id: concreteTemplate.packageId, name: "concrete" })]);
    });

    it("rejects ACS data that conflicts with creation facts", () => {
        const contradictoryAcs = active(CreatedEvent.create({ ...create(), createArguments: { fields: [{ label: "owner", value: Value.create({ sum: { oneofKind: "party", party: "Bob" } }) }] } }));

        expect(() => mapGrpcQueryRelationFragment([transaction("10", [Event.create({ event: { oneofKind: "created", created: create() } })])], [contradictoryAcs])).toThrow(/ACS.*conflicts/i);
    });

    it("reconciles multi-synchronizer ACS activations deterministically", () => {
        const first = activeOn(CreatedEvent.create({ ...create(), offset: "20", nodeId: 4, witnessParties: ["Bob", "Alice"] }), "sync-b", "2");

        const second = activeOn(CreatedEvent.create({ ...create(), offset: "15", nodeId: 3, witnessParties: ["Carol", "Alice"] }), "sync-a", "1");

        const forward = mapGrpcQueryRelationFragment([], [first, second]);

        const reverse = mapGrpcQueryRelationFragment([], [second, first]);

        expect(reverse).toEqual(forward);
        expect(forward.contracts).toEqual([expect.objectContaining({ contractId: "C1", createdEventOffset: "15", witnesses: ["Alice", "Bob", "Carol"] })]);
        expect(forward.activeContractIdentities).toEqual([
            { contractId: "C1", synchronizerId: "sync-a", reassignmentCounter: "1", activationOffset: "15", activationNodeId: 3 },
            { contractId: "C1", synchronizerId: "sync-b", reassignmentCounter: "2", activationOffset: "20", activationNodeId: 4 },
        ]);
    });

    it("reconciles ACS activation offsets with history while retaining history creation", () => {
        const history = [transaction("10", [Event.create({ event: { oneofKind: "created", created: create() } })])];

        const snapshot = activeOn(CreatedEvent.create({ ...create(), offset: "20", nodeId: 2, witnessParties: ["Bob", "Alice"] }), "sync-a", "1");

        expect(mapGrpcQueryRelationFragment(history, [snapshot]).contracts[0]).toMatchObject({ createdEventOffset: "10", witnesses: ["Alice", "Bob"] });
    });

    it("rejects duplicate ACS activations on the same synchronizer", () => {
        expect(() => mapGrpcQueryRelationFragment([], [activeOn(create(), "sync", "0"), activeOn(CreatedEvent.create({ ...create(), offset: "20", nodeId: 2 }), "sync", "1")])).toThrow(/duplicate ACS/i);
    });

    it("canonicalizes party sets and rejects malformed party and contract identifiers", () => {
        const created = CreatedEvent.create({ ...create(), witnessParties: ["Bob", "Alice", "Bob"], signatories: ["Bob", "Alice", "Bob"], observers: ["Carol", "Carol"] });

        const exercised = ExercisedEvent.create({ ...exercise(false), actingParties: ["Bob", "Alice", "Bob"], witnessParties: ["Bob", "Alice", "Bob"] });

        const fragment = mapGrpcQueryRelationFragment([transaction("10", [Event.create({ event: { oneofKind: "created", created } })]), transaction("20", [Event.create({ event: { oneofKind: "exercised", exercised } })])]);

        expect(fragment.contracts[0]?.witnesses).toEqual(["Alice", "Bob"]);
        expect(fragment.exercises[0]).toMatchObject({ controllers: ["Alice", "Bob"], witnesses: ["Alice", "Bob"] });
        expect(() => mapGrpcQueryRelationFragment([transaction("10", [Event.create({ event: { oneofKind: "created", created: CreatedEvent.create({ ...create(), contractId: "bad!" }) } })])])).toThrow(ValidationError);
        expect(() => mapGrpcQueryRelationFragment([transaction("10", [Event.create({ event: { oneofKind: "created", created: CreatedEvent.create({ ...create(), witnessParties: ["bad!"] }) } })])])).toThrow(ValidationError);
        expect(() => mapGrpcQueryRelationFragment([transaction("10", [Event.create({ event: { oneofKind: "created", created: CreatedEvent.create({ ...create(), contractId: "c".repeat(256) }) } })])])).toThrow(ValidationError);
    });

    it("validates generated relation names, package IDs, and transaction LedgerStrings", () => {
        const valid = CreatedEvent.create({ ...create(), templateId: { packageId: "p".repeat(64), moduleName: "Sample.Module", entityName: "Outer.Inner" }, representativePackageId: "r".repeat(64) });

        expect(mapGrpcQueryRelationFragment([transaction("10", [Event.create({ event: { oneofKind: "created", created: valid } })])]).contracts).toHaveLength(1);
        for (const moduleName of [".A", "A.", "A..B", "A.bad-name", `A.${"A".repeat(1001)}`]) {
            expect(() => mapGrpcQueryRelationFragment([transaction("10", [Event.create({ event: { oneofKind: "created", created: CreatedEvent.create({ ...create(), templateId: { ...template, moduleName } }) } })])])).toThrow(ValidationError);
        }

        expect(() => mapGrpcQueryRelationFragment([transaction("10", [Event.create({ event: { oneofKind: "created", created: CreatedEvent.create({ ...create(), templateId: { ...template, entityName: "Outer..Inner" } }) } })])])).toThrow(ValidationError);
        expect(() => mapGrpcQueryRelationFragment([transaction("10", [Event.create({ event: { oneofKind: "created", created: CreatedEvent.create({ ...create(), templateId: { ...template, moduleName: "1Bad" } }) } })])])).toThrow(ValidationError);
        expect(() => mapGrpcQueryRelationFragment([transaction("10", [Event.create({ event: { oneofKind: "created", created: CreatedEvent.create({ ...create(), representativePackageId: "bad!" }) } })])])).toThrow(ValidationError);
        expect(() => mapGrpcQueryRelationFragment([transaction("10", [Event.create({ event: { oneofKind: "created", created: create() } })]), transaction("20", [Event.create({ event: { oneofKind: "exercised", exercised: ExercisedEvent.create({ ...exercise(), choice: "bad-name" }) } })])])).toThrow(ValidationError);
        expect(() => mapGrpcQueryRelationFragment([Transaction.create({ ...transaction("10", [Event.create({ event: { oneofKind: "created", created: create() } })]), updateId: "bad!" })])).toThrow(ValidationError);
        expect(() => mapGrpcQueryRelationFragment([Transaction.create({ ...transaction("10", [Event.create({ event: { oneofKind: "created", created: create() } })]), workflowId: "bad!" })])).toThrow(ValidationError);
    });

    it("orders exercise offsets numerically rather than lexicographically", () => {
        const first = ExercisedEvent.create({ ...exercise(false), offset: "2", nodeId: 2 });

        const second = ExercisedEvent.create({ ...exercise(false), offset: "10", nodeId: 3, lastDescendantNodeId: 3 });

        const created = CreatedEvent.create({ ...create(), offset: "1" });

        const fragment = mapGrpcQueryRelationFragment([
            transaction("10", [Event.create({ event: { oneofKind: "exercised", exercised: second } })]),
            transaction("2", [Event.create({ event: { oneofKind: "exercised", exercised: first } })]),
            transaction("1", [Event.create({ event: { oneofKind: "created", created } })]),
        ]);

        expect(fragment.exercises.map((item) => item.exercisedAtIx)).toEqual(["2", "10"]);
    });

    it("has deterministic full fragments for permuted transaction and event input without mutating sources", () => {
        const history = (reverseTransactions: boolean, reverseEvents: boolean) => {
            const firstCreate = Event.create({ event: { oneofKind: "created", created: create() } });

            const secondCreate = Event.create({ event: { oneofKind: "created", created: CreatedEvent.create({ ...create("C2"), nodeId: 2 }) } });

            const archive = Event.create({ event: { oneofKind: "exercised", exercised: ExercisedEvent.create({ ...exercise(), nodeId: 3, lastDescendantNodeId: 3 }) } });

            const creates = reverseEvents ? [secondCreate, firstCreate] : [firstCreate, secondCreate];

            const transactions = [transaction("10", creates), transaction("20", [archive])];

            for (const entry of transactions) {
                entry.externalTransactionHash = undefined;
            }

            return reverseTransactions ? transactions.reverse() : transactions;
        };

        const firstSource = history(true, true);

        const secondSource = history(false, false);

        const first = mapGrpcQueryRelationFragment(firstSource);

        const second = mapGrpcQueryRelationFragment(secondSource);

        const duplicateNode = CreatedEvent.create({ ...create("C2") });

        expect(firstSource.map((entry) => entry.offset)).toEqual(["20", "10"]);
        expect(firstSource[1]?.events.map((entry) => entry.event.oneofKind === "created" ? entry.event.created.nodeId : -1)).toEqual([2, 1]);
        expect(second).toEqual(first);
        expect(() => mapGrpcQueryRelationFragment([transaction("10", [Event.create({ event: { oneofKind: "created", created: create() } }), Event.create({ event: { oneofKind: "created", created: duplicateNode } })])])).toThrow(/duplicate event/i);
    });

    it("keeps a contract active after a non-consuming exercise", () => {
        const fragment = mapGrpcQueryRelationFragment([
            transaction("10", [Event.create({ event: { oneofKind: "created", created: create() } })]),
            transaction("20", [Event.create({ event: { oneofKind: "exercised", exercised: exercise(false) } })]),
        ]);

        expect(fragment.contracts[0]).toMatchObject({ contractId: "C1", active: true, archivedEventOffset: null, archivedAt: null });
    });

    it("detaches and freezes trace context from the generated transaction", () => {
        const source = transaction("10", [Event.create({ event: { oneofKind: "created", created: create() } })]);

        const fragment = mapGrpcQueryRelationFragment([source]);

        const traceContext = fragment.transactions[0]?.traceContext as { traceparent: string };

        source.traceContext!.traceparent = "changed";

        expect(traceContext).toEqual({ traceparent: "00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-00", tracestate: "vendor=value" });
        expect(() => traceContext.traceparent = "changed").toThrow();
    });

    it("uses the creation package publicly and preserves representative packages only for Task 6", () => {
        const created = CreatedEvent.create({ ...create(), representativePackageId: "representative-package" });

        const fragment = mapGrpcQueryRelationFragment([transaction("10", [Event.create({ event: { oneofKind: "created", created } })])]);

        expect(fragment.contracts[0]).toMatchObject({ packageId: "pkg-id" });
        expect(fragment.packageIdentities.map((identity) => identity.id)).toEqual(["pkg-id", "representative-package"]);
        expect(fragment.creationIdentities).toEqual([expect.objectContaining({ contractId: "C1", creationPackageId: "pkg-id", representativePackageId: "representative-package" })]);
    });

    it.each([
        ["payload", CreatedEvent.create({ ...create(), createArguments: { fields: [{ label: "owner", value: Value.create({ sum: { oneofKind: "party", party: "Bob" } }) }] } })],
        ["timestamp", CreatedEvent.create({ ...create(), createdAt: { seconds: "1700000001", nanos: 123_000_000 } })],
        ["representative package", CreatedEvent.create({ ...create(), representativePackageId: "different" })],
    ])("rejects ACS conflicts in creation %s facts", (_name, conflict) => {
        const history = [transaction("10", [Event.create({ event: { oneofKind: "created", created: create() } })])];

        const snapshot = active(conflict);

        expect(() => mapGrpcQueryRelationFragment(history, [snapshot])).toThrow(/ACS.*conflicts/i);
    });

    it("accepts one exact ACS/history duplicate but rejects duplicate ACS contract entries", () => {
        const history = [transaction("10", [Event.create({ event: { oneofKind: "created", created: create() } })])];

        const snapshot = active(create());

        expect(mapGrpcQueryRelationFragment(history, [snapshot]).contracts).toHaveLength(1);
        expect(() => mapGrpcQueryRelationFragment([], [snapshot, snapshot])).toThrow(/duplicate ACS/i);
    });

    it.each([
        ["empty transaction events", () => mapGrpcQueryRelationFragment([transaction("10", [])])],
        ["missing effective time", () => mapGrpcQueryRelationFragment([Transaction.create({ ...transaction("10", [Event.create({ event: { oneofKind: "created", created: create() } })]), effectiveAt: undefined })])],
        ["missing record time", () => mapGrpcQueryRelationFragment([Transaction.create({ ...transaction("10", [Event.create({ event: { oneofKind: "created", created: create() } })]), recordTime: undefined })])],
        ["blank update id", () => mapGrpcQueryRelationFragment([Transaction.create({ ...transaction("10", [Event.create({ event: { oneofKind: "created", created: create() } })]), updateId: "" })])],
        ["blank synchronizer", () => mapGrpcQueryRelationFragment([Transaction.create({ ...transaction("10", [Event.create({ event: { oneofKind: "created", created: create() } })]), synchronizerId: "" })])],
        ["blank created package name", () => mapGrpcQueryRelationFragment([transaction("10", [Event.create({ event: { oneofKind: "created", created: CreatedEvent.create({ ...create(), packageName: "" }) } })])])],
        ["missing created template", () => mapGrpcQueryRelationFragment([transaction("10", [Event.create({ event: { oneofKind: "created", created: CreatedEvent.create({ ...create(), templateId: undefined }) } })])])],
        ["blank created contract id", () => mapGrpcQueryRelationFragment([transaction("10", [Event.create({ event: { oneofKind: "created", created: CreatedEvent.create({ ...create(), contractId: "" }) } })])])],
        ["missing created time", () => mapGrpcQueryRelationFragment([transaction("10", [Event.create({ event: { oneofKind: "created", created: CreatedEvent.create({ ...create(), createdAt: undefined }) } })])])],
        ["empty created witnesses", () => mapGrpcQueryRelationFragment([transaction("10", [Event.create({ event: { oneofKind: "created", created: CreatedEvent.create({ ...create(), witnessParties: [] }) } })])])],
        ["blank created witness", () => mapGrpcQueryRelationFragment([transaction("10", [Event.create({ event: { oneofKind: "created", created: CreatedEvent.create({ ...create(), witnessParties: [""] }) } })])])],
        ["empty created signatories", () => mapGrpcQueryRelationFragment([transaction("10", [Event.create({ event: { oneofKind: "created", created: CreatedEvent.create({ ...create(), signatories: [] }) } })])])],
        ["blank created observer", () => mapGrpcQueryRelationFragment([transaction("10", [Event.create({ event: { oneofKind: "created", created: CreatedEvent.create({ ...create(), observers: [""] }) } })])])],
        ["blank representative package", () => mapGrpcQueryRelationFragment([transaction("10", [Event.create({ event: { oneofKind: "created", created: CreatedEvent.create({ ...create(), representativePackageId: "" }) } })])])],
        ["empty exercise choice", () => mapGrpcQueryRelationFragment([transaction("10", [Event.create({ event: { oneofKind: "created", created: create() } })]), transaction("20", [Event.create({ event: { oneofKind: "exercised", exercised: ExercisedEvent.create({ ...exercise(), choice: "" }) } })])])],
        ["empty exercise actors", () => mapGrpcQueryRelationFragment([transaction("10", [Event.create({ event: { oneofKind: "created", created: create() } })]), transaction("20", [Event.create({ event: { oneofKind: "exercised", exercised: ExercisedEvent.create({ ...exercise(), actingParties: [] }) } })])])],
        ["empty exercise witnesses", () => mapGrpcQueryRelationFragment([transaction("10", [Event.create({ event: { oneofKind: "created", created: create() } })]), transaction("20", [Event.create({ event: { oneofKind: "exercised", exercised: ExercisedEvent.create({ ...exercise(), witnessParties: [] }) } })])])],
        ["exercise descendant below node", () => mapGrpcQueryRelationFragment([transaction("10", [Event.create({ event: { oneofKind: "created", created: create() } })]), transaction("20", [Event.create({ event: { oneofKind: "exercised", exercised: ExercisedEvent.create({ ...exercise(), lastDescendantNodeId: 1 }) } })])])],
        ["zero transaction offset", () => mapGrpcQueryRelationFragment([Transaction.create({ ...transaction("10", [Event.create({ event: { oneofKind: "created", created: CreatedEvent.create({ ...create(), offset: "0" }) } })]), offset: "0" })])],
    ])("rejects malformed required gRPC data: %s", (_name, invoke) => {
        expect(invoke).toThrow(ValidationError);
    });

    it.each([
        ["blank synchronizer", GetActiveContractsResponse.create({ contractEntry: { oneofKind: "activeContract", activeContract: { createdEvent: create(), synchronizerId: "", reassignmentCounter: "0" } } })],
        ["blank reassignment counter", GetActiveContractsResponse.create({ contractEntry: { oneofKind: "activeContract", activeContract: { createdEvent: create(), synchronizerId: "sync", reassignmentCounter: "" } } })],
        ["signed reassignment counter", GetActiveContractsResponse.create({ contractEntry: { oneofKind: "activeContract", activeContract: { createdEvent: create(), synchronizerId: "sync", reassignmentCounter: "-1" } } })],
        ["leading-zero reassignment counter", GetActiveContractsResponse.create({ contractEntry: { oneofKind: "activeContract", activeContract: { createdEvent: create(), synchronizerId: "sync", reassignmentCounter: "01" } } })],
        ["overflow reassignment counter", GetActiveContractsResponse.create({ contractEntry: { oneofKind: "activeContract", activeContract: { createdEvent: create(), synchronizerId: "sync", reassignmentCounter: "18446744073709551616" } } })],
    ])("rejects malformed ActiveContract %s", (_name, snapshot) => {
        expect(() => mapGrpcQueryRelationFragment([], [snapshot])).toThrow(ValidationError);
    });

    it("accepts the uint64 reassignment counter boundary", () => {
        const snapshot = GetActiveContractsResponse.create({ contractEntry: { oneofKind: "activeContract", activeContract: { createdEvent: create(), synchronizerId: "sync", reassignmentCounter: "18446744073709551615" } } });

        expect(mapGrpcQueryRelationFragment([], [snapshot]).contracts).toHaveLength(1);
    });

    it("assembles all eight immutable relations with private creation/type joins and a snapshot watermark", () => {
        const upgraded = ExercisedEvent.create({ ...exercise(false), templateId: { packageId: "pkg-upgrade", moduleName: "Main", entityName: "Asset" } });

        const fragment = mapGrpcQueryRelationFragment([
            transaction("10", [Event.create({ event: { oneofKind: "created", created: CreatedEvent.create({ ...create(), representativePackageId: "pkg-representative" }) } })]),
            transaction("20", [Event.create({ event: { oneofKind: "exercised", exercised: upgraded } })]),
        ]);

        const packages: readonly GrpcPackageMetadata[] = [
            packageMetadata("pkg-upgrade", "upgrade", false),
            packageMetadata("pkg-representative", "representative", true),
        ];

        const first = createGrpcQueryDataset(fragment, packages, "20", "grpc://participant");

        const second = createGrpcQueryDataset(fragment, [...packages].reverse(), "20", "grpc://participant");

        expect(second.rows.packages.map((row) => [row.id, row.pk])).toEqual(first.rows.packages.map((row) => [row.id, row.pk]));
        expect(second.rows.contractTypes.map((row) => [row.templateFqn, row.pk])).toEqual(first.rows.contractTypes.map((row) => [row.templateFqn, row.pk]));
        expect(second.rows.exerciseTypes.map((row) => [row.choiceFqn, row.pk])).toEqual(first.rows.exerciseTypes.map((row) => [row.choiceFqn, row.pk]));
        expect(first.rows.watermark).toEqual([{ singleton: true, ix: "20", offset: "20", instanceId: "grpc://participant" }]);
        expect(first.rows.packages.map((row) => row.id)).toEqual(["pkg-representative", "pkg-upgrade"]);
        expect(first.rows.contracts[0]).toMatchObject({ packageId: "pkg-id", templateId: { packageId: "pkg-id" } });
        expect(first.rows.contractTypes).toContainEqual(expect.objectContaining({ packageName: "representative", payloadType: "template", templateFqn: "representative:Main:Asset" }));
        expect(first.rows.exerciseTypes).toContainEqual(expect.objectContaining({ packageName: "upgrade", choice: "Archive", consuming: false, aliases: ["upgrade:Main:Asset:Archive", "Main:Asset:Archive", "Asset:Archive", "Archive"], choiceFqn: "upgrade:Main:Asset:Archive" }));
        expect(relatedQueryRows(first, "contracts", first.rows.contracts[0]!, "contractType")).toEqual([expect.objectContaining({ packageName: "representative" })]);
        expect(relatedQueryRows(first, "exercises", first.rows.exercises[0]!, "contractType")).toEqual([expect.objectContaining({ packageName: "representative" })]);
        expect(relatedQueryRows(first, "exercises", first.rows.exercises[0]!, "exerciseType")).toEqual([expect.objectContaining({ packageName: "upgrade" })]);
        expect(Object.keys(first.rows.contracts[0]!)).toEqual(["contractId", "templateId", "packageId", "payload", "witnesses", "createdEventOffset", "createdAt", "archivedEventOffset", "archivedAt", "active"]);
        expect(Object.keys(first.edges.contracts!.contractType!)).toEqual(["privateKeys"]);
        expect(first.edges.contracts!.createdTransaction!.complete).not.toBe(false);
        expect(relatedQueryRows(first, "contracts", first.rows.contracts[0]!, "createdTransaction")).toEqual([expect.objectContaining({ ix: "10" })]);
        expect(Object.keys(first.edges.watermark!)).toEqual([]);
    });

    it("selects representative and exercised packages without requesting unavailable creation-package provenance", () => {
        const upgraded = ExercisedEvent.create({ ...exercise(false), templateId: { packageId: "pkg-upgrade", moduleName: "Main", entityName: "Asset" } });

        const fragment = mapGrpcQueryRelationFragment([
            transaction("10", [Event.create({ event: { oneofKind: "created", created: CreatedEvent.create({ ...create(), representativePackageId: "pkg-representative" }) } })]),
            transaction("20", [Event.create({ event: { oneofKind: "exercised", exercised: upgraded } })]),
        ]);

        expect(referencedGrpcPackageIds(fragment)).toEqual(["pkg-representative", "pkg-upgrade"]);
    });

    it("creates a complete empty snapshot at ledger offset zero with canonical exercise keys", () => {
        const dataset = createGrpcQueryDataset(mapGrpcQueryRelationFragment([]), [], "0", "grpc://participant");

        expect(dataset.rows.watermark).toEqual([{ singleton: true, ix: "0", offset: "0", instanceId: "grpc://participant" }]);
        expect(dataset.rows.contracts).toEqual([]);
        expect(dataset.edges.contracts!.contractType!.privateKeys).toEqual({ source: [], target: [] });
        expect(dataset.sourceLocalKeys.exercises).toEqual([["tpePk", "contractTpePk", "exerciseEventPk", "contractId"]]);
    });

    it("materializes unobserved interface metadata as canonical type rows", () => {
        const source = packageMetadata("pkg-id", "app", true);

        const interfaceType: GrpcPackageMetadata["templates"][number] = {
            moduleName: "Api",
            entityName: "EventLog",
            payloadType: "interface",
            aliases: ["app:Api:EventLog", "Api:EventLog", "EventLog"],
            templateFqn: "app:Api:EventLog",
            choices: [{
                choice: "EventLog_HoldingsChange",
                consuming: false,
                aliases: ["app:Api:EventLog:EventLog_HoldingsChange", "Api:EventLog:EventLog_HoldingsChange", "EventLog:EventLog_HoldingsChange", "EventLog_HoldingsChange"],
                choiceFqn: "app:Api:EventLog:EventLog_HoldingsChange",
            }],
        };

        const dataset = createGrpcQueryDataset(mapGrpcQueryRelationFragment([]), [{ ...source, templates: [...source.templates, interfaceType] }], "0", "grpc://participant");

        expect(dataset.rows.contractTypes).toContainEqual(expect.objectContaining({ entityName: "EventLog", payloadType: "interface", aliases: interfaceType.aliases }));
        expect(dataset.rows.exerciseTypes).toContainEqual(expect.objectContaining({ entityName: "EventLog", choice: "EventLog_HoldingsChange", aliases: interfaceType.choices[0]!.aliases }));
    });

    it.each([
        ["invalid package id", { id: "bad!" }],
        ["colon in package name", { name: "bad:name" }],
        ["control in package version", { version: "1\n0" }],
        ["missing templates", { templates: undefined }],
        ["non-template payload", { templates: [{ ...packageMetadata("pkg-id", "app", true).templates[0]!, payloadType: "record" }] }],
        ["wrong template alias", { templates: [{ ...packageMetadata("pkg-id", "app", true).templates[0]!, aliases: ["wrong"] }] }],
        ["package-id qualified template FQN", { templates: [{ ...packageMetadata("pkg-id", "app", true).templates[0]!, templateFqn: "pkg-id:Main:Asset" }] }],
        ["missing choice consuming flag", { templates: [{ ...packageMetadata("pkg-id", "app", true).templates[0]!, choices: [{ ...packageMetadata("pkg-id", "app", true).templates[0]!.choices[0]!, consuming: undefined }] }] }],
        ["wrong choice alias", { templates: [{ ...packageMetadata("pkg-id", "app", true).templates[0]!, choices: [{ ...packageMetadata("pkg-id", "app", true).templates[0]!.choices[0]!, aliases: ["wrong"] }] }] }],
        ["duplicate template", { templates: [packageMetadata("pkg-id", "app", true).templates[0]!, packageMetadata("pkg-id", "app", true).templates[0]!] }],
        ["duplicate choice despite consuming change", { templates: [{ ...packageMetadata("pkg-id", "app", true).templates[0]!, choices: [packageMetadata("pkg-id", "app", true).templates[0]!.choices[0]!, { ...packageMetadata("pkg-id", "app", true).templates[0]!.choices[0]!, consuming: false }] }] }],
    ])("rejects malformed caller package metadata: %s", (_name, patch) => {
        const metadata = { ...packageMetadata("pkg-id", "app", true), ...patch } as unknown as GrpcPackageMetadata;

        expect(() => createGrpcQueryDataset(mapGrpcQueryRelationFragment([]), [metadata], "0", "grpc://participant")).toThrow(ValidationError);
    });

    it("translates a throwing package metadata getter to ValidationError", () => {
        const metadata = Object.defineProperty(packageMetadata("pkg-id", "app", true), "id", { get: () => {
            throw new TypeError("id trap");
        } });

        expect(() => createGrpcQueryDataset(mapGrpcQueryRelationFragment([]), [metadata], "0", "grpc://participant")).toThrow(ValidationError);
    });

    it.each([
        ["package array", () => {
            const value = Proxy.revocable<GrpcPackageMetadata[]>([], {});

            value.revoke();

            return value.proxy;
        }],
        ["package", () => {
            const value = Proxy.revocable(packageMetadata("pkg-id", "app", true), {});

            value.revoke();

            return [value.proxy];
        }],
        ["template array", () => {
            const value = Proxy.revocable<GrpcPackageMetadata["templates"][number][]>([], {});

            value.revoke();

            return [{ ...packageMetadata("pkg-id", "app", true), templates: value.proxy }];
        }],
        ["template", () => {
            const value = Proxy.revocable(packageMetadata("pkg-id", "app", true).templates[0]!, {});

            value.revoke();

            return [{ ...packageMetadata("pkg-id", "app", true), templates: [value.proxy] }];
        }],
        ["choice array", () => {
            const value = Proxy.revocable<GrpcPackageMetadata["templates"][number]["choices"][number][]>([], {});

            value.revoke();

            const template = { ...packageMetadata("pkg-id", "app", true).templates[0]!, choices: value.proxy };

            return [{ ...packageMetadata("pkg-id", "app", true), templates: [template] }];
        }],
        ["choice", () => {
            const value = Proxy.revocable(packageMetadata("pkg-id", "app", true).templates[0]!.choices[0]!, {});

            value.revoke();

            const template = { ...packageMetadata("pkg-id", "app", true).templates[0]!, choices: [value.proxy] };

            return [{ ...packageMetadata("pkg-id", "app", true), templates: [template] }];
        }],
    ])("translates revoked %s metadata proxies to ValidationError", (_name, makePackages) => {
        expect(() => createGrpcQueryDataset(mapGrpcQueryRelationFragment([]), makePackages() as readonly GrpcPackageMetadata[], "0", "grpc://participant")).toThrow(ValidationError);
    });

    it("reads stateful package, template, and choice metadata exactly once into an immutable snapshot", () => {
        const source = packageMetadata("pkg-id", "app", true);

        const reads = { name: 0, templates: 0, aliases: 0, templateFqn: 0, choices: 0, choice: 0, choiceAliases: 0, choiceFqn: 0 };

        const choice = Object.defineProperties({ ...source.templates[0]!.choices[0]! }, {
            choice: { enumerable: true, get: () => ++reads.choice === 1 ? "Archive" : "Different" },
            aliases: { enumerable: true, get: () => ++reads.choiceAliases === 1 ? ["app:Main:Asset:Archive", "Main:Asset:Archive", "Asset:Archive", "Archive"] : ["wrong"] },
            choiceFqn: { enumerable: true, get: () => ++reads.choiceFqn === 1 ? "app:Main:Asset:Archive" : "wrong" },
        });

        const template = Object.defineProperties({ ...source.templates[0]! }, {
            aliases: { enumerable: true, get: () => ++reads.aliases === 1 ? ["app:Main:Asset", "Main:Asset", "Asset"] : ["wrong"] },
            templateFqn: { enumerable: true, get: () => ++reads.templateFqn === 1 ? "app:Main:Asset" : "wrong" },
            choices: { enumerable: true, get: () => {
                ++reads.choices;

                return reads.choices === 1 ? [choice] : [];
            } },
        });

        const metadata = Object.defineProperties({ ...source }, {
            name: { enumerable: true, get: () => ++reads.name === 1 ? "app" : "different" },
            templates: { enumerable: true, get: () => {
                ++reads.templates;

                return reads.templates === 1 ? [template] : [];
            } },
        });

        const dataset = createGrpcQueryDataset(mapGrpcQueryRelationFragment([]), [metadata], "0", "grpc://participant");

        expect(reads).toEqual({ name: 1, templates: 1, aliases: 1, templateFqn: 1, choices: 1, choice: 1, choiceAliases: 1, choiceFqn: 1 });
        expect(dataset.rows.packages).toEqual([expect.objectContaining({ id: "pkg-id", name: "app" })]);
        expect(dataset.rows.contractTypes).toEqual([expect.objectContaining({ packageName: "app", aliases: ["app:Main:Asset", "Main:Asset", "Asset"], templateFqn: "app:Main:Asset" })]);
        expect(dataset.rows.exerciseTypes).toEqual([expect.objectContaining({ choice: "Archive", aliases: ["app:Main:Asset:Archive", "Main:Asset:Archive", "Asset:Archive", "Archive"], choiceFqn: "app:Main:Asset:Archive" })]);
        expect(Object.isFrozen(dataset.rows.contractTypes[0]!.aliases)).toBe(true);
        expect(Object.isFrozen(dataset.rows.exerciseTypes[0]!.aliases)).toBe(true);
    });

    it("accepts same-name packages at different versions and marks ACS-only creation transactions incomplete", () => {
        const older = packageMetadata("pkg-old", "app", true, "1.0.0");

        const representative = packageMetadata("pkg-id", "app", true, "2.0.0");

        const duplicateVersion = packageMetadata("pkg-duplicate", "app", true, "2.0.0");

        expect(createGrpcQueryDataset(mapGrpcQueryRelationFragment([]), [older, representative], "0", "grpc://participant").rows.packages).toHaveLength(2);
        expect(() => createGrpcQueryDataset(mapGrpcQueryRelationFragment([]), [representative, duplicateVersion], "0", "grpc://participant")).toThrow(ValidationError);

        const history = mapGrpcQueryRelationFragment([transaction("10", [Event.create({ event: { oneofKind: "created", created: create() } })])], [active(create())]);

        expect(() => createGrpcQueryDataset({ ...history, transactions: [] }, [representative], "10", "grpc://participant")).toThrow("has no target");

        const activeOnly = createGrpcQueryDataset(mapGrpcQueryRelationFragment([], [active(create())]), [representative], "10", "grpc://participant");

        expect(new InMemoryQueryEvaluator().execute(activeOnly, normalizeFindMany("contracts", { select: { contractId: true } }))).toEqual([{ contractId: "C1" }]);
        expect(activeOnly.rows.contracts[0]).not.toHaveProperty("createdTransactionComplete");
        expect(activeOnly.edges.contracts!.createdTransaction!.complete).toBe(false);
        expect(() => relatedQueryRows(activeOnly, "contracts", activeOnly.rows.contracts[0]!, "createdTransaction")).toThrow("Dataset edge contracts.createdTransaction is incomplete");
        expect(() => new InMemoryQueryEvaluator().execute(activeOnly, normalizeFindMany("contracts", { include: { createdTransaction: true } }))).toThrow("Dataset edge contracts.createdTransaction is incomplete");
        expect(() => new InMemoryQueryEvaluator().execute(activeOnly, normalizeFindMany("contracts", { where: { createdTransaction: { transactionId: { equals: "update-10" } } } }))).toThrow("Dataset edge contracts.createdTransaction is incomplete");
    });
});

function packageMetadata(id: string, name: string, consuming: boolean, version = "1.0.0"): GrpcPackageMetadata {
    return {
        id,
        name,
        version,
        templates: [{
            moduleName: "Main",
            entityName: "Asset",
            payloadType: "template",
            aliases: [`${name}:Main:Asset`, "Main:Asset", "Asset"],
            templateFqn: `${name}:Main:Asset`,
            choices: [{ choice: "Archive", consuming, aliases: [`${name}:Main:Asset:Archive`, "Main:Asset:Archive", "Asset:Archive", "Archive"], choiceFqn: `${name}:Main:Asset:Archive` }],
        }],
    };
}
