import { describe, expect, it } from "vitest";
import {
    DamlCreatedEventSource,
    DamlMaterializationError,
    normalizeDamlCreatedEventSource,
    normalizeDamlExercisedEventSource,
} from "../../../src/daml-interface/index.js";
import { GetContractResponse } from "../../../src/transports/grpc/generated/canton/com/daml/ledger/api/v2/contract_service.js";
import { CreatedEvent, Event, ExercisedEvent } from "../../../src/transports/grpc/generated/canton/com/daml/ledger/api/v2/event.js";
import { ActiveContract } from "../../../src/transports/grpc/generated/canton/com/daml/ledger/api/v2/state_service.js";
import { Record, Value } from "../../../src/transports/grpc/generated/canton/com/daml/ledger/api/v2/value.js";

const templateId = {
    packageId: "pkg-id",
    moduleName: "Main.Module",
    entityName: "Iou",
} as const;

const createdEvent = CreatedEvent.create({
    offset: "17",
    nodeId: 3,
    contractId: "#cid",
    templateId,
    createArguments: Record.create({
        fields: [{ label: "owner", value: Value.create({ sum: { oneofKind: "party", party: "Alice" } }) }],
    }),
    witnessParties: ["Alice", "Bob"],
    signatories: ["Alice"],
    observers: ["Bob"],
});

const exercisedEvent = ExercisedEvent.create({
    offset: "18",
    nodeId: 4,
    contractId: "#cid",
    templateId,
    choice: "Transfer",
    choiceArgument: Value.create({ sum: { oneofKind: "party", party: "Bob" } }),
    exerciseResult: Value.create({ sum: { oneofKind: "text", text: "accepted" } }),
    actingParties: ["Alice"],
    consuming: true,
    witnessParties: ["Alice", "Bob"],
    lastDescendantNodeId: 5,
});

describe("normalizeDamlCreatedEventSource", () => {
    it("normalizes generated created events and gRPC wrappers as protobuf sources", () => {
        const direct = normalizeDamlCreatedEventSource(createdEvent);

        const response = normalizeDamlCreatedEventSource(GetContractResponse.create({ createdEvent }));

        const active = normalizeDamlCreatedEventSource(ActiveContract.create({ createdEvent }));

        expect(direct).toEqual(response);
        expect(direct).toEqual(active);
        expect(direct).toMatchObject({
            contractId: "#cid",
            payload: { kind: "protobuf" },
            metadata: {
                templateId,
                offset: "17",
                nodeId: 3,
                witnessParties: ["Alice", "Bob"],
                signatories: ["Alice"],
                observers: ["Bob"],
            },
        });
        expect(Object.isFrozen(direct)).toBe(true);
        expect(Object.isFrozen(direct.metadata)).toBe(true);
    });

    it("accepts a generated Event envelope as a declared created-event source", () => {
        const source: DamlCreatedEventSource = Event.create({ event: { oneofKind: "created", created: createdEvent } });

        expect(normalizeDamlCreatedEventSource(source).payload.kind).toBe("protobuf");
    });

    it("keeps empty generated record payloads on the protobuf path", () => {
        const normalized = normalizeDamlCreatedEventSource(CreatedEvent.create({
            contractId: "#empty",
            templateId,
            createArguments: Record.create({ fields: [] }),
        }));

        expect(normalized.payload.kind).toBe("protobuf");
    });

    it("normalizes PQS contract rows and camel/snake JSON envelopes as JSON sources", () => {
        const pqs = normalizeDamlCreatedEventSource({
            contractId: "#cid",
            templateId,
            payload: { owner: "Alice" },
            witnesses: ["Alice", "Bob"],
            createdEventOffset: "17",
        });

        const camel = normalizeDamlCreatedEventSource({
            contractId: "#cid",
            templateId,
            createArguments: { owner: "Alice" },
            offset: "17",
            nodeId: 3,
            witnessParties: ["Alice", "Bob"],
        });

        const snake = normalizeDamlCreatedEventSource({
            contract_id: "#cid",
            template_id: {
                package_id: "pkg-id",
                module_name: "Main.Module",
                entity_name: "Iou",
            },
            create_arguments: { owner: "Alice" },
            offset: "17",
            node_id: 3,
            witness_parties: ["Alice", "Bob"],
        });

        for (const normalized of [pqs, camel, snake]) {
            expect(normalized.contractId).toBe("#cid");
            expect(normalized.metadata.templateId).toEqual(templateId);
            expect(normalized.payload.kind).toBe("json");
        }

        expect(camel.metadata).toEqual(snake.metadata);
        expect(pqs.metadata).toMatchObject({ offset: "17", witnessParties: ["Alice", "Bob"] });
    });
});

describe("normalizeDamlExercisedEventSource", () => {
    it("normalizes generated exercised events as protobuf sources", () => {
        const normalized = normalizeDamlExercisedEventSource(exercisedEvent);

        expect(normalized).toMatchObject({
            contractId: "#cid",
            choice: "Transfer",
            consuming: true,
            argument: { kind: "protobuf" },
            result: { kind: "protobuf" },
            metadata: {
                templateId,
                offset: "18",
                nodeId: 4,
                actingParties: ["Alice"],
                witnessParties: ["Alice", "Bob"],
                lastDescendantNodeId: 5,
            },
        });
        expect(Object.isFrozen(normalized)).toBe(true);
        expect(Object.isFrozen(normalized.metadata)).toBe(true);
    });

    it("gets exercised identity and metadata from PQS relations and JSON aliases", () => {
        const pqs = normalizeDamlExercisedEventSource({
            contractId: "#cid",
            argument: "Bob",
            result: "accepted",
            controllers: ["Alice"],
            witnesses: ["Alice", "Bob"],
            lastDescendantNodeId: "5",
            contract: { contractId: "#cid", templateId },
            exerciseType: { choice: "Transfer", consuming: true },
            transaction: { offset: "18" },
        });

        const camel = normalizeDamlExercisedEventSource({
            contractId: "#cid",
            templateId,
            choice: "Transfer",
            choiceArgument: "Bob",
            exerciseResult: "accepted",
            actingParties: ["Alice"],
            consuming: true,
            witnessParties: ["Alice", "Bob"],
            lastDescendantNodeId: 5,
            offset: "18",
        });

        const snake = normalizeDamlExercisedEventSource({
            contract_id: "#cid",
            template_id: {
                package_id: "pkg-id",
                module_name: "Main.Module",
                entity_name: "Iou",
            },
            choice: "Transfer",
            choice_argument: "Bob",
            exercise_result: "accepted",
            acting_parties: ["Alice"],
            consuming: true,
            witness_parties: ["Alice", "Bob"],
            last_descendant_node_id: 5,
            offset: "18",
        });

        for (const normalized of [pqs, camel, snake]) {
            expect(normalized.contractId).toBe("#cid");
            expect(normalized.choice).toBe("Transfer");
            expect(normalized.consuming).toBe(true);
            expect(normalized.metadata.templateId).toEqual(templateId);
            expect(normalized.argument.kind).toBe("json");
            expect(normalized.result.kind).toBe("json");
        }

        expect(pqs.metadata).toMatchObject({
            offset: "18",
            actingParties: ["Alice"],
            witnessParties: ["Alice", "Bob"],
            lastDescendantNodeId: 5,
        });
        expect(camel.metadata).toEqual(snake.metadata);
    });

    it("falls back to PQS exercise-type and package relations for identity", () => {
        const normalized = normalizeDamlExercisedEventSource({
            contractId: "#cid",
            argument: "Bob",
            result: "accepted",
            exerciseType: {
                choice: "Transfer",
                consuming: true,
                moduleName: "Main.Module",
                entityName: "Iou",
            },
            package: { id: "pkg-id" },
        });

        expect(normalized.metadata.templateId).toEqual(templateId);
    });
});

describe("source envelope encoding", () => {
    it("keeps the same logical events equivalent across gRPC, PQS, and JSON sources", () => {
        const createdSources = [
            normalizeDamlCreatedEventSource(createdEvent),
            normalizeDamlCreatedEventSource(GetContractResponse.create({ createdEvent })),
            normalizeDamlCreatedEventSource(ActiveContract.create({ createdEvent })),
            normalizeDamlCreatedEventSource({
                contractId: "#cid",
                templateId,
                payload: { owner: "Alice" },
                witnesses: ["Alice", "Bob"],
                createdEventOffset: "17",
            }),
            normalizeDamlCreatedEventSource({
                contractId: "#cid",
                templateId,
                payload: { owner: "Alice" },
                witnessParties: ["Alice", "Bob"],
                offset: "17",
            }),
            normalizeDamlCreatedEventSource({
                contract_id: "#cid",
                template_id: { package_id: "pkg-id", module_name: "Main.Module", entity_name: "Iou" },
                payload: { owner: "Alice" },
                witness_parties: ["Alice", "Bob"],
                offset: "17",
            }),
        ];

        const exercisedSources = [
            normalizeDamlExercisedEventSource(exercisedEvent),
            normalizeDamlExercisedEventSource({
                contractId: "#cid",
                argument: "Bob",
                result: "accepted",
                controllers: ["Alice"],
                witnesses: ["Alice", "Bob"],
                lastDescendantNodeId: 5,
                contract: { contractId: "#cid", templateId },
                exerciseType: { choice: "Transfer", consuming: true },
                transaction: { offset: "18" },
            }),
            normalizeDamlExercisedEventSource({
                contractId: "#cid",
                templateId,
                choice: "Transfer",
                argument: "Bob",
                result: "accepted",
                actingParties: ["Alice"],
                consuming: true,
                witnessParties: ["Alice", "Bob"],
                lastDescendantNodeId: 5,
                offset: "18",
            }),
            normalizeDamlExercisedEventSource({
                contract_id: "#cid",
                template_id: { package_id: "pkg-id", module_name: "Main.Module", entity_name: "Iou" },
                choice: "Transfer",
                argument: "Bob",
                result: "accepted",
                acting_parties: ["Alice"],
                consuming: true,
                witness_parties: ["Alice", "Bob"],
                last_descendant_node_id: 5,
                offset: "18",
            }),
        ];

        expect(createdSources.map(createdIdentityAndMetadata)).toEqual(Array(6).fill({
            contractId: "#cid",
            templateId,
            offset: "17",
            witnessParties: ["Alice", "Bob"],
        }));
        expect(exercisedSources.map(exercisedIdentityAndMetadata)).toEqual(Array(4).fill({
            contractId: "#cid",
            templateId,
            offset: "18",
            actingParties: ["Alice"],
            witnessParties: ["Alice", "Bob"],
            lastDescendantNodeId: 5,
        }));
        expect(createdSources.slice(0, 3).every(({ payload }) => payload.kind === "protobuf")).toBe(true);
        expect(createdSources.slice(3).every(({ payload }) => payload.kind === "json")).toBe(true);
        expect(exercisedSources[0]?.argument.kind).toBe("protobuf");
        expect(exercisedSources.slice(1).every(({ argument, result }) => argument.kind === "json" && result.kind === "json")).toBe(true);
    });

    it("uses the recognized envelope rather than nested value validity", () => {
        const malformedCreated = CreatedEvent.create({
            contractId: "#cid",
            templateId,
            createArguments: Record.create({ fields: [{ label: "owner" }] }),
        });

        const malformedExercised = ExercisedEvent.create({
            contractId: "#cid",
            templateId,
            choice: "Transfer",
            choiceArgument: Value.create({ sum: { oneofKind: undefined } }),
            exerciseResult: Value.create({ sum: { oneofKind: undefined } }),
            consuming: true,
        });

        const createdJsonLookalike = {
            contractId: "#cid",
            templateId,
            payload: { fields: [{ value: { sum: { oneofKind: "text", text: "not protobuf" } } }] },
        };

        const exercisedJsonLookalike = {
            contractId: "#cid",
            templateId,
            choice: "Transfer",
            choiceArgument: { sum: { oneofKind: "text", text: "not protobuf" } },
            exerciseResult: { sum: { oneofKind: "text", text: "not protobuf" } },
            consuming: true,
        };

        expect(normalizeDamlCreatedEventSource(malformedCreated).payload.kind).toBe("protobuf");
        expect(normalizeDamlExercisedEventSource(malformedExercised).argument.kind).toBe("protobuf");
        expect(normalizeDamlCreatedEventSource(createdJsonLookalike).payload.kind).toBe("json");
        expect(normalizeDamlExercisedEventSource(exercisedJsonLookalike).argument.kind).toBe("json");
    });
});

describe("DAML event source validation", () => {
    it("rejects absent payloads, incomplete identities, contract IDs, exercise results, and ambiguous envelopes", () => {
        expect(() => normalizeDamlCreatedEventSource({})).toThrow(DamlMaterializationError);
        expect(() => normalizeDamlCreatedEventSource({ contractId: "#cid", templateId, payload: undefined })).toThrow(/created event source/);
        expect(() => normalizeDamlCreatedEventSource({ contractId: "#cid", templateId: { packageId: "pkg-id" }, payload: {} })).toThrow(/template identity/);
        expect(() => normalizeDamlCreatedEventSource({ templateId, payload: {} })).toThrow(/contract ID/);
        expect(() => normalizeDamlExercisedEventSource({ contractId: "#cid", templateId, choice: "Transfer", choiceArgument: {}, consuming: false })).toThrow(/exercise result/);
        expect(() => normalizeDamlCreatedEventSource({
            createdEvent: { contractId: "#cid", templateId, payload: {} },
            created_event: { contractId: "#other", templateId, payload: {} },
        })).toThrow(/created event source/);
    });

    it("rejects corrupt optional metadata instead of coercing it", () => {
        expect(() => normalizeDamlCreatedEventSource({
            contractId: "#cid",
            templateId,
            payload: {},
            witnessParties: ["Alice", 42],
        })).toThrow(DamlMaterializationError);
        expect(() => normalizeDamlCreatedEventSource({
            contractId: "#cid",
            templateId,
            payload: {},
            nodeId: "-1",
        })).toThrow(/node ID/);
        expect(() => normalizeDamlExercisedEventSource({
            contractId: "#cid",
            templateId,
            choice: "Transfer",
            argument: {},
            result: {},
            consuming: false,
            lastDescendantNodeId: "9007199254740992",
        })).toThrow(/last descendant node ID/);
        expect(() => normalizeDamlCreatedEventSource({
            contractId: "#cid",
            templateId,
            payload: {},
            offset: 17,
        })).toThrow(/offset/);
        expect(() => normalizeDamlCreatedEventSource({
            contractId: "#cid",
            templateId,
            payload: {},
            createdAt: "not-a-timestamp",
        })).toThrow(/created at/);
        expect(() => normalizeDamlCreatedEventSource({
            contractId: "#cid",
            templateId,
            payload: {},
            createdAt: new Date("not-a-date"),
        })).toThrow(/created at/);
    });
});

describe("canonical source isolation", () => {
    it("deep clones and freezes JSON payloads, metadata arrays, and dates", () => {
        const payload = { nested: { items: [{ owner: "Alice" }] } };

        const witnesses = ["Alice"];

        const createdAt = new Date("2026-01-02T03:04:05.000Z");

        const normalized = normalizeDamlCreatedEventSource({
            contractId: "#cid",
            templateId,
            payload,
            witnesses,
            createdAt,
        });

        payload.nested.items[0]!.owner = "Bob";
        witnesses.push("Bob");
        createdAt.setUTCFullYear(2027);

        const canonicalPayload = normalized.payload.value as { nested: { items: { owner: string }[] } };

        expect(canonicalPayload.nested.items[0]?.owner).toBe("Alice");
        expect(normalized.metadata.witnessParties).toEqual(["Alice"]);
        expect(normalized.metadata.createdAt).toBe("2026-01-02T03:04:05.000000000Z");
        expect(Object.isFrozen(canonicalPayload)).toBe(true);
        expect(Object.isFrozen(canonicalPayload.nested)).toBe(true);
        expect(Object.isFrozen(canonicalPayload.nested.items)).toBe(true);
        expect(Object.isFrozen(canonicalPayload.nested.items[0])).toBe(true);
        expect(Object.isFrozen(normalized.metadata.witnessParties)).toBe(true);
        expect(typeof normalized.metadata.createdAt).toBe("string");
        expect(() => Date.prototype.setUTCFullYear.call(normalized.metadata.createdAt, 2028)).toThrow();
    });

    it("deep clones and freezes protobuf values before sources can mutate them", () => {
        const source = CreatedEvent.create({
            contractId: "#cid",
            templateId,
            createArguments: Record.create({
                fields: [{ label: "owner", value: Value.create({ sum: { oneofKind: "party", party: "Alice" } }) }],
            }),
        });

        const normalized = normalizeDamlCreatedEventSource(source);

        source.createArguments!.fields[0]!.value!.sum = { oneofKind: "party", party: "Bob" };

        const value = normalized.payload.value;

        expect(value.sum.oneofKind).toBe("record");
        expect(value.sum.record.fields[0]?.value?.sum).toMatchObject({ party: "Alice" });
        expect(Object.isFrozen(value)).toBe(true);
        expect(Object.isFrozen(value.sum.record)).toBe(true);
        expect(Object.isFrozen(value.sum.record.fields)).toBe(true);
        expect(Object.isFrozen(value.sum.record.fields[0]?.value)).toBe(true);
    });
});

describe("created-at canonicalization", () => {
    it("uses one nine-digit UTC ISO representation for Date, JSON, and protobuf timestamps", () => {
        const date = normalizeDamlCreatedEventSource({
            contractId: "#cid",
            templateId,
            payload: {},
            createdAt: new Date("2026-01-02T03:04:05.123Z"),
        });

        const json = normalizeDamlCreatedEventSource({
            contractId: "#cid",
            templateId,
            payload: {},
            createdAt: "2026-01-02T03:04:05.123Z",
        });

        const protobuf = normalizeDamlCreatedEventSource(CreatedEvent.create({
            contractId: "#cid",
            templateId,
            createArguments: Record.create({ fields: [] }),
            createdAt: { seconds: "1767323045", nanos: 123000000 },
        }));

        expect([date.metadata.createdAt, json.metadata.createdAt, protobuf.metadata.createdAt]).toEqual([
            "2026-01-02T03:04:05.123000000Z",
            "2026-01-02T03:04:05.123000000Z",
            "2026-01-02T03:04:05.123000000Z",
        ]);
    });

    it("accepts only ledger timestamp bounds across Date, JSON, and protobuf sources", () => {
        expect(normalizeDamlCreatedEventSource({
            contractId: "#min",
            templateId,
            payload: {},
            createdAt: new Date(-62135596800000),
        }).metadata.createdAt).toBe("0001-01-01T00:00:00.000000000Z");
        expect(normalizeDamlCreatedEventSource({
            contractId: "#max",
            templateId,
            payload: {},
            createdAt: "9999-12-31T23:59:59.999999999Z",
        }).metadata.createdAt).toBe("9999-12-31T23:59:59.999999999Z");
        expect(normalizeDamlCreatedEventSource(CreatedEvent.create({
            contractId: "#max",
            templateId,
            createArguments: Record.create({ fields: [] }),
            createdAt: { seconds: "253402300799", nanos: 999999999 },
        })).metadata.createdAt).toBe("9999-12-31T23:59:59.999999999Z");

        for (const createdAt of [new Date(-62135596800001), new Date(253402300800000), "0000-01-01T00:00:00Z", "10000-01-01T00:00:00Z"]) {
            expect(() => normalizeDamlCreatedEventSource({ contractId: "#invalid", templateId, payload: {}, createdAt })).toThrow(/created at/);
        }

        for (const seconds of ["-62135596801", "253402300800"]) {
            expect(() => normalizeDamlCreatedEventSource(CreatedEvent.create({
                contractId: "#invalid",
                templateId,
                createArguments: Record.create({ fields: [] }),
                createdAt: { seconds, nanos: 0 },
            }))).toThrow(/created at/);
        }
    });
});

function createdIdentityAndMetadata(source: ReturnType<typeof normalizeDamlCreatedEventSource>): unknown {
    return {
        contractId: source.contractId,
        templateId: source.metadata.templateId,
        offset: source.metadata.offset,
        witnessParties: source.metadata.witnessParties,
    };
}

function exercisedIdentityAndMetadata(source: ReturnType<typeof normalizeDamlExercisedEventSource>): unknown {
    return {
        contractId: source.contractId,
        templateId: source.metadata.templateId,
        offset: source.metadata.offset,
        actingParties: source.metadata.actingParties,
        witnessParties: source.metadata.witnessParties,
        lastDescendantNodeId: source.metadata.lastDescendantNodeId,
    };
}
