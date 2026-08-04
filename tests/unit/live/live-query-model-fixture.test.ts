import { readFile } from "node:fs/promises";
import { describe, expect, it, vi } from "vitest";
import type { CantonManager } from "../../../src/index.js";
import { SubmitCommandsRequest } from "../../../src/index.js";
import {
    DamlLfBuiltinType,
    DamlLfNodeKind,
    DamlLfPackageLoader,
    DarArchiveLoader,
} from "../../../src/daml-lf/index.js";
import { mapGrpcSubmitCommandsForTransactionRequest } from "../../../src/transports/grpc/mappers/commands-mapper.js";
import {
    CreatedEvent,
    Event,
} from "../../../src/transports/grpc/generated/canton/com/daml/ledger/api/v2/event.js";
import { createLiveIouAsync } from "../../live/runtime/live-query-manager-factory.js";
import { getLiveQueryModelFixtureAsync } from "../../live/runtime/live-query-model-fixture.js";

const queryModelDarUrl = new URL(
    "../../live/assets/sdk-query-live-model.dar",
    import.meta.url,
);

describe("live query DAML fixture", () => {
    it("maps the Iou helper payload as Party, Party, and Numeric", async () => {
        const submit = vi.fn().mockResolvedValue({
            events: [{ created: { contractId: "00-query-iou" } }],
        });

        const manager = {
            grpc: {
                commandService: {
                    submitAndWaitForTransactionAsync: submit,
                },
            },
        } as unknown as CantonManager;

        await expect(createLiveIouAsync(
            manager,
            "Issuer::1220",
            "Owner::1220",
            "package-id",
        )).resolves.toBe("00-query-iou");

        const request = submit.mock.calls[0]?.[0] as SubmitCommandsRequest;

        const mapped = mapGrpcSubmitCommandsForTransactionRequest(request);

        expect(mapped.commands.commands[0]).toMatchObject({
            command: {
                oneofKind: "create",
                create: {
                    createArguments: {
                        fields: [
                            {
                                label: "issuer",
                                value: {
                                    sum: {
                                        oneofKind: "party",
                                        party: "Issuer::1220",
                                    },
                                },
                            },
                            {
                                label: "owner",
                                value: {
                                    sum: {
                                        oneofKind: "party",
                                        party: "Owner::1220",
                                    },
                                },
                            },
                            {
                                label: "amount",
                                value: {
                                    sum: {
                                        oneofKind: "numeric",
                                        numeric: "1.0",
                                    },
                                },
                            },
                        ],
                    },
                },
            },
        });
    });

    it("extracts the created contract id from a generated Event", async () => {
        const submit = vi.fn().mockResolvedValue({
            events: [Event.create({
                event: {
                    oneofKind: "created",
                    created: CreatedEvent.create({ contractId: "00-query-iou" }),
                },
            })],
        });

        const manager = {
            grpc: {
                commandService: {
                    submitAndWaitForTransactionAsync: submit,
                },
            },
        } as unknown as CantonManager;

        await expect(createLiveIouAsync(
            manager,
            "Issuer::1220",
            "Owner::1220",
            "package-id",
        )).resolves.toBe("00-query-iou");
    });

    it("resolves the exact main package id from the committed DAR", async () => {
        const fixture = await getLiveQueryModelFixtureAsync();

        const archive = await new DarArchiveLoader().loadDarOrThrowAsync(
            fixture.darBytes,
        );

        const mainPackage = new DamlLfPackageLoader().loadRawPackageOrThrow(
            archive.mainPackageEntry.bytes,
        );

        expect(fixture.packageId).toBe(mainPackage.packageId);
        expect(fixture.templateId).toEqual({
            packageId: mainPackage.packageId,
            moduleName: "Main",
            entityName: "Iou",
        });
    });

    it("contains the typed Main:Iou template and its issuer-controlled Archive", async () => {
        const archive = await new DarArchiveLoader().loadDarOrThrowAsync(
            new Uint8Array(await readFile(queryModelDarUrl)),
        );

        const packageModel = new DamlLfPackageLoader().loadPackageOrThrow(
            archive.mainPackageEntry.bytes,
        );

        const mainModule = packageModel.modules.find((module) =>
            module.name === "Main"
        );

        const iouTemplate = mainModule?.definitions.find((definition) =>
            definition.nodeKind === DamlLfNodeKind.template
            && definition.name === "Iou"
        );

        expect(iouTemplate).toBeDefined();

        if (iouTemplate?.nodeKind !== DamlLfNodeKind.template) {
            throw new Error("Dedicated live query DAR does not contain Main:Iou.");
        }

        expect(iouTemplate.fields.map((field) => [
            field.name,
            field.type.builtinType,
            field.type.numericScale,
        ])).toEqual([
            ["issuer", DamlLfBuiltinType.party, undefined],
            ["owner", DamlLfBuiltinType.party, undefined],
            ["amount", DamlLfBuiltinType.numeric, 10],
        ]);

        const archiveChoice = iouTemplate.choices.find((choice) =>
            choice.name === "Archive"
        );

        expect(archiveChoice).toMatchObject({
            consuming: true,
            returnType: { builtinType: DamlLfBuiltinType.unit },
        });

        const mainSource = archive.sourceFiles.find((entry) =>
            entry.path.endsWith("/Main.daml") || entry.path === "Main.daml"
        )?.content;

        expect(mainSource).toMatch(/signatory\s+issuer/u);
        expect(mainSource).toMatch(/observer\s+owner/u);
    });
});
