import { describe, expect, it } from "vitest";
import {
    DamlMaterializationError,
    normalizeDamlCreatedEventSource,
    normalizeDamlExercisedEventSource,
} from "../../../src/daml-interface/index.js";
import { GetContractResponse } from "../../../src/transports/grpc/generated/canton/com/daml/ledger/api/v2/contract_service.js";
import { CreatedEvent, ExercisedEvent } from "../../../src/transports/grpc/generated/canton/com/daml/ledger/api/v2/event.js";
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
});
