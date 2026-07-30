import { pathToFileURL } from "node:url";
import { describe, expect, it } from "vitest";
import type { ContractResult } from "../../../src/query/model-types.js";
import { PqsQueryClient } from "../../../src/query/pqs/pqs-query-client.js";
import { PqsSchemaProfileV1 } from "../../../src/query/pqs/pqs-schema-profile.js";
import { SampleLfPackageFixture } from "../../fixtures/daml-lf/sample-lf-package-fixture.js";
import { generateTemporaryProjectAsync } from "./generated-project-test-helper.js";

describe("generated DAML template materialization", () => {
    it("executes every generated spec for materialization and generic-recursive projects", async () => {
        const archives = [
            SampleLfPackageFixture.createMaterializationLf2ArchiveBytes(),
            SampleLfPackageFixture.createGenericRecursiveLf2ArchiveBytes(),
        ];

        for (const archiveBytes of archives) {
            const temporaryProject = await generateTemporaryProjectAsync(archiveBytes);

            try {
                expect(temporaryProject.executedSpecPaths).toEqual(
                    temporaryProject.project.specFiles.map((file) =>
                        `${temporaryProject.directory}/dist/${file.path.replace(/\.ts$/, ".js")}`,
                    ).sort(),
                );
            } finally {
                await temporaryProject.disposeAsync();
            }
        }
    });

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
                contractId: iou.contractId,
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

    it("materializes opaque external ContractId values from protobuf and JSON events", async () => {
        const temporaryProject = await generateTemporaryProjectAsync(
            SampleLfPackageFixture.createOpaqueContractIdLf2ArchiveBytes(),
        );

        try {
            const file = temporaryProject.project.templateFiles[0]!;

            const grpc = await importGeneratedGrpcBindingsAsync();

            const generated = await import(pathToFileURL(
                `${temporaryProject.directory}/dist/${file.path.replace(/\.ts$/, ".js")}`,
            ).href) as GeneratedOpaqueModule;

            const protobufCreated = generated.Opaque.fromCreatedEvent(grpc.CreatedEvent.create({
                contractId: "#opaque-1",
                templateId: opaqueTemplateId(),
                createArguments: grpc.Record.create({
                    fields: [{ label: "holding", value: contractIdValue(grpc, "#holding-protobuf") }],
                }),
            }));

            const jsonCreated = generated.Opaque.fromCreatedEvent({
                contract_id: "#opaque-2",
                template_id: {
                    package_id: "sample-hash",
                    module_name: "Sample.Opaque",
                    entity_name: "Opaque",
                },
                create_arguments: { holding: "#holding-json" },
            });

            const protobufExercise = generated.Opaque.fromExercisedEvent(grpc.ExercisedEvent.create({
                contractId: "#opaque-1",
                templateId: opaqueTemplateId(),
                choice: "Transfer",
                choiceArgument: contractIdValue(grpc, "#argument-protobuf"),
                exerciseResult: contractIdValue(grpc, "#result-protobuf"),
                consuming: false,
            }));

            const jsonExercise = generated.Opaque.fromExercisedEvent({
                contract_id: "#opaque-2",
                template_id: {
                    package_id: "sample-hash",
                    module_name: "Sample.Opaque",
                    entity_name: "Opaque",
                },
                choice: "Transfer",
                choice_argument: "#argument-json",
                exercise_result: "#result-json",
                consuming: false,
            });

            expect([protobufCreated.holding, jsonCreated.holding]).toEqual([
                "#holding-protobuf",
                "#holding-json",
            ]);
            expect([
                protobufExercise.argument,
                protobufExercise.result,
                jsonExercise.argument,
                jsonExercise.result,
            ]).toEqual([
                "#argument-protobuf",
                "#result-protobuf",
                "#argument-json",
                "#result-json",
            ]);
        } finally {
            await temporaryProject.disposeAsync();
        }
    });

    it("materializes independently typed self- and mutually-recursive generic values", async () => {
        const temporaryProject = await generateTemporaryProjectAsync(
            SampleLfPackageFixture.createGenericRecursiveLf2ArchiveBytes(),
        );

        try {
            const file = temporaryProject.project.templateFiles[0]!;

            const generated = await import(pathToFileURL(
                `${temporaryProject.directory}/dist/${file.path.replace(/\.ts$/, ".js")}`,
            ).href) as GeneratedGenericModule;

            const materialized = generated.GenericIou.fromCreatedEvent({
                contract_id: "#generic-1",
                template_id: genericTemplateId(),
                create_arguments: {
                    textNode: {
                        label: "root",
                        next: { label: "leaf", next: null },
                    },
                    intNode: {
                        label: "42",
                        next: { label: "7", next: null },
                    },
                    leftText: {
                        right: {
                            label: "right",
                            left: { right: null },
                        },
                    },
                    variant: { tag: "Value", value: "variant text" },
                },
            });

            expect(materialized).toMatchObject({
                contractId: "#generic-1",
                textNode: {
                    label: "root",
                    next: { label: "leaf", next: undefined },
                },
                intNode: {
                    label: 42n,
                    next: { label: 7n, next: undefined },
                },
                leftText: {
                    right: {
                        label: "right",
                        left: { right: undefined },
                    },
                },
                variant: { tag: "Value", value: "variant text" },
            });
        } finally {
            await temporaryProject.disposeAsync();
        }
    });

    it("materializes a template while unrelated unresolved external types are skipped", async () => {
        const temporaryProject = await generateTemporaryProjectAsync(
            SampleLfPackageFixture.createUnusedExternalReferencesLf2ArchiveBytes(),
        );

        try {
            const file = temporaryProject.project.templateFiles[0]!;

            const generated = await import(pathToFileURL(
                `${temporaryProject.directory}/dist/${file.path.replace(/\.ts$/, ".js")}`,
            ).href) as GeneratedLazyModule;

            const materialized = generated.Iou.fromCreatedEvent({
                contract_id: "#lazy-1",
                template_id: lazyTemplateId(),
                create_arguments: { issuer: "Alice" },
            });

            expect(materialized).toMatchObject({
                contractId: "#lazy-1",
                issuer: "Alice",
            });
        } finally {
            await temporaryProject.disposeAsync();
        }
    });

    it("materializes a PQS exercise reached through a nested contract include", async () => {
        const temporaryProject = await generateTemporaryProjectAsync(
            SampleLfPackageFixture.createMaterializationLf2ArchiveBytes(),
        );

        try {
            const file = temporaryProject.project.templateFiles[0];

            const generated = await import(pathToFileURL(
                `${temporaryProject.directory}/dist/${file!.path.replace(/\.ts$/, ".js")}`,
            ).href) as GeneratedIouModule;

            const client = new PqsQueryClient({
                query: async () => ({
                    rows: [{
                        contract_id: "#iou-1",
                        package_id: "sample-hash",
                        payload: iouJsonPayload(),
                        witnesses: ["Alice"],
                        created_event_offset: "7",
                        created_at: null,
                        archived_event_offset: null,
                        archived_at: null,
                        active: true,
                        template_package_id: "sample-hash",
                        template_module_name: "Sample.Module",
                        template_entity_name: "Iou",
                        exercises: [{
                            tpe_pk: "1",
                            contract_tpe_pk: "1",
                            exercise_event_pk: null,
                            exercised_at_ix: "7",
                            contract_id: "#iou-1",
                            argument: "Charlie",
                            result: "transferred",
                            redaction_id: null,
                            package_pk: "1",
                            controllers: ["Alice"],
                            last_descendant_node_id: "0",
                            witnesses: ["Alice"],
                            exerciseType: {
                                pk: "1",
                                choice: "Transfer",
                                consuming: false,
                                aliases: [],
                                package_name: "sample-hash",
                                module_name: "Sample.Module",
                                entity_name: "Iou",
                                template_fqn: "sample-hash:Sample.Module:Iou",
                                choice_fqn: "sample-hash:Sample.Module:Iou:Transfer",
                            },
                            contract: {
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
                            },
                            package: { pk: "1", name: "sample", version: "1.0", id: "sample-hash" },
                        }],
                    }],
                }),
            } as never, new PqsSchemaProfileV1());

            const [contract] = await client.contracts.findMany({
                include: {
                    exercises: { take: 1, include: { exerciseType: true, contract: true, package: true } },
                },
            });

            const [exercise] = contract!.exercises!;

            const materialized = generated.Iou.fromExercisedEvent(exercise);

            expect(materialized).toBeInstanceOf(generated.IouTransferExercisedEvent);
            expect(materialized).toMatchObject({
                choiceName: "Transfer",
                contractId: "#iou-1",
                argument: "Charlie",
                result: "transferred",
                consuming: false,
            });
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
    readonly contractId: string;
    readonly issuer: string;
    readonly details: { readonly owner: string; readonly reference: string };
    readonly tags: readonly string[];
    readonly note: string | undefined;
}

interface GeneratedOpaqueModule {
    readonly Opaque: {
        fromCreatedEvent(source: unknown): GeneratedOpaque;
        fromExercisedEvent(source: unknown): GeneratedOpaqueExercise;
    };
}

interface GeneratedOpaque {
    readonly holding: string;
}

interface GeneratedOpaqueExercise {
    readonly argument: string;
    readonly result: string;
}

interface GeneratedLazyModule {
    readonly Iou: {
        fromCreatedEvent(source: unknown): GeneratedLazyIou;
    };
}

interface GeneratedGenericModule {
    readonly GenericIou: {
        fromCreatedEvent(source: unknown): GeneratedGenericIou;
    };
}

interface GeneratedGenericIou {
    readonly contractId: string;
    readonly textNode: { readonly label: string; readonly next: unknown };
    readonly intNode: { readonly label: bigint; readonly next: unknown };
    readonly leftText: unknown;
    readonly variant: { readonly tag: string; readonly value: string };
}

interface GeneratedLazyIou {
    readonly contractId: string;
    readonly issuer: string;
}

function iouTemplateId() {
    return { packageId: "sample-hash", moduleName: "Sample.Module", entityName: "Iou" };
}

function opaqueTemplateId() {
    return { packageId: "sample-hash", moduleName: "Sample.Opaque", entityName: "Opaque" };
}

function lazyTemplateId() {
    return { packageId: "sample-hash", moduleName: "Sample.Lazy", entityName: "Iou" };
}

function genericTemplateId() {
    return { packageId: "sample-hash", moduleName: "Sample.Generic", entityName: "GenericIou" };
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

function contractIdValue(grpc: GrpcBindings, contractId: string): unknown {
    return grpc.Value.create({ sum: { oneofKind: "contractId", contractId } });
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
