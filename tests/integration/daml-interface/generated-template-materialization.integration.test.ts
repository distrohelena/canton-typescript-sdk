import { pathToFileURL } from "node:url";
import { describe, expect, it } from "vitest";
import type { ContractResult } from "../../../src/query/model-types.js";
import { SampleLfPackageFixture } from "../../fixtures/daml-lf/sample-lf-package-fixture.js";
import { generateTemporaryProjectAsync } from "./generated-project-test-helper.js";

describe("generated DAML template materialization", () => {
    it("materializes the same nested contract from gRPC, PQS, and JSON sources", async () => {
        const temporaryProject = await generateTemporaryProjectAsync(
            SampleLfPackageFixture.createMaterializationLf2ArchiveBytes(),
        );

        try {
            const file = temporaryProject.project.templateFiles[0];

            const grpc = await importGeneratedGrpcBindingsAsync();

            const generated = await import(pathToFileURL(
                `${temporaryProject.directory}/dist/${file!.path.replace(/\.ts$/, ".js")}`,
            ).href) as GeneratedIouModule;

            const createdEvent = createCreatedEvent(grpc);

            const contractResult: ContractResult = {
                contractId: "#iou-1",
                templateId: iouTemplateId(),
                packageId: "sample-hash",
                payload: iouJsonPayload(),
                witnesses: ["Alice"],
                createdEventOffset: "7",
                createdAt: null,
                archivedEventOffset: null,
                archivedAt: null,
                active: true,
            };

            const jsonEnvelope = {
                contract_id: "#iou-1",
                template_id: {
                    package_id: "sample-hash",
                    module_name: "Sample.Module",
                    entity_name: "Iou",
                },
                create_arguments: iouJsonPayload(),
            };

            const materialized = [
                generated.Iou.fromCreatedEvent(createdEvent),
                generated.Iou.fromCreatedEvent(grpc.GetContractResponse.create({ createdEvent })),
                generated.Iou.fromCreatedEvent(contractResult),
                generated.Iou.fromCreatedEvent(jsonEnvelope),
            ];

            expect(materialized.map((iou) => ({
                contractId: iou.get(),
                issuer: iou.issuer,
                details: iou.details,
                tags: iou.tags,
                note: iou.note,
            }))).toEqual(Array(4).fill({
                contractId: "#iou-1",
                issuer: "Alice",
                details: { owner: "Bob", reference: "reference-1" },
                tags: ["priority", "settlement"],
                note: "optional note",
            }));
        } finally {
            await temporaryProject.disposeAsync();
        }
    });

    it("returns the exact generated choice event class for every exercised choice", async () => {
        const temporaryProject = await generateTemporaryProjectAsync(
            SampleLfPackageFixture.createMaterializationLf2ArchiveBytes(),
        );

        try {
            const file = temporaryProject.project.templateFiles[0];

            const grpc = await importGeneratedGrpcBindingsAsync();

            const generated = await import(pathToFileURL(
                `${temporaryProject.directory}/dist/${file!.path.replace(/\.ts$/, ".js")}`,
            ).href) as GeneratedIouModule;

            const transfer = generated.Iou.fromExercisedEvent(grpc.ExercisedEvent.create({
                contractId: "#iou-1",
                templateId: iouTemplateId(),
                choice: "Transfer",
                choiceArgument: textValue(grpc, "Charlie"),
                exerciseResult: textValue(grpc, "transferred"),
                consuming: false,
            }));

            const archive = generated.Iou.fromExercisedEvent(grpc.ExercisedEvent.create({
                contractId: "#iou-1",
                templateId: iouTemplateId(),
                choice: "Archive",
                choiceArgument: grpc.Value.create({ sum: { oneofKind: "unit", unit: {} } }),
                exerciseResult: grpc.Value.create({ sum: { oneofKind: "unit", unit: {} } }),
                consuming: true,
            }));

            expect(transfer).toBeInstanceOf(generated.IouTransferExercisedEvent);
            expect(archive).toBeInstanceOf(generated.IouArchiveExercisedEvent);
            expect(transfer).toMatchObject({
                choiceName: "Transfer",
                contractId: "#iou-1",
                argument: "Charlie",
                result: "transferred",
                consuming: false,
            });
            expect(archive).toMatchObject({ choiceName: "Archive", consuming: true });
        } finally {
            await temporaryProject.disposeAsync();
        }
    });
});

interface GeneratedIouModule {
    readonly Iou: {
        fromCreatedEvent(source: unknown): GeneratedIou;
        fromExercisedEvent(source: unknown): unknown;
    };
    readonly IouTransferExercisedEvent: new (...args: readonly unknown[]) => object;
    readonly IouArchiveExercisedEvent: new (...args: readonly unknown[]) => object;
}

interface GeneratedIou {
    get(): string;
    readonly issuer: string;
    readonly details: { readonly owner: string; readonly reference: string };
    readonly tags: readonly string[];
    readonly note: string | undefined;
}

function iouTemplateId() {
    return { packageId: "sample-hash", moduleName: "Sample.Module", entityName: "Iou" };
}

function iouJsonPayload() {
    return {
        issuer: "Alice",
        details: { owner: "Bob", reference: "reference-1" },
        tags: ["priority", "settlement"],
        note: "optional note",
    };
}

async function importGeneratedGrpcBindingsAsync(): Promise<GrpcBindings> {
    const [contractService, event, value] = await Promise.all([
        import("../../../dist/transports/grpc/generated/canton/com/daml/ledger/api/v2/contract_service.js"),
        import("../../../dist/transports/grpc/generated/canton/com/daml/ledger/api/v2/event.js"),
        import("../../../dist/transports/grpc/generated/canton/com/daml/ledger/api/v2/value.js"),
    ]);

    return {
        GetContractResponse: contractService.GetContractResponse,
        ExercisedEvent: event.ExercisedEvent,
        CreatedEvent: event.CreatedEvent,
        Record: value.Record,
        Value: value.Value,
    };
}

function createCreatedEvent(grpc: GrpcBindings): unknown {
    return grpc.CreatedEvent.create({
        contractId: "#iou-1",
        templateId: iouTemplateId(),
        createArguments: grpc.Record.create({
            fields: [
                { label: "issuer", value: textValue(grpc, "Alice") },
                { label: "details", value: recordValue(grpc, { owner: textValue(grpc, "Bob"), reference: textValue(grpc, "reference-1") }) },
                { label: "tags", value: grpc.Value.create({ sum: { oneofKind: "list", list: { elements: [textValue(grpc, "priority"), textValue(grpc, "settlement")] } } }) },
                { label: "note", value: grpc.Value.create({ sum: { oneofKind: "optional", optional: { value: textValue(grpc, "optional note") } } }) },
            ],
        }),
    });
}

function recordValue(grpc: GrpcBindings, fields: Readonly<Record<string, unknown>>): unknown {
    return grpc.Value.create({
        sum: {
            oneofKind: "record",
            record: grpc.Record.create({
                fields: Object.entries(fields).map(([label, value]) => ({ label, value })),
            }),
        },
    });
}

function textValue(grpc: GrpcBindings, text: string): unknown {
    return grpc.Value.create({ sum: { oneofKind: "text", text } });
}

interface MessageFactory {
    create(value: unknown): unknown;
}

interface GrpcBindings {
    readonly GetContractResponse: MessageFactory;
    readonly ExercisedEvent: MessageFactory;
    readonly CreatedEvent: MessageFactory;
    readonly Record: MessageFactory;
    readonly Value: MessageFactory;
}
