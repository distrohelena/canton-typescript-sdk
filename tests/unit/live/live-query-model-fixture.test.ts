import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import {
    DamlLfBuiltinType,
    DamlLfNodeKind,
    DamlLfPackageLoader,
    DarArchiveLoader,
} from "../../../src/daml-lf/index.js";
import { getLiveQueryModelFixtureAsync } from "../../live/runtime/live-query-model-fixture.js";

const queryModelDarUrl = new URL(
    "../../live/assets/sdk-query-live-model.dar",
    import.meta.url,
);

describe("live query DAML fixture", () => {
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
