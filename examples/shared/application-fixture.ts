import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import {
    DamlLfNodeKind,
    DamlLfPackageLoader,
    DarArchiveLoader,
} from "@distrohelena/canton-typescript-sdk/daml-lf";

export const EXAMPLE_DAR_SHA256 =
    "307cf7c52ac2770d1d1a2c5e1ec56a78ab7c70e7809c0cfb419abadb93cc6e29";

export interface ExampleTemplateId {
    readonly packageId: string;
    readonly moduleName: string;
    readonly entityName: string;
}

export interface ExampleApplicationFixture {
    readonly darBytes: Uint8Array;
    readonly mainPackageId: string;
    readonly packageIds: readonly string[];
    readonly templateId: ExampleTemplateId;
}

export async function loadExampleApplicationFixtureAsync(
    darUrl = new URL(
        "../assets/canton-explorer-debug-playground-0.1.0.dar",
        import.meta.url,
    ),
): Promise<ExampleApplicationFixture> {
    const darBytes = new Uint8Array(await readFile(fileURLToPath(darUrl)));

    const archive = await new DarArchiveLoader().loadDarOrThrowAsync(darBytes);

    const packageLoader = new DamlLfPackageLoader();

    const packageIds = [
        ...new Set(
            archive.packageEntries.map(
                (entry) =>
                    packageLoader.loadRawPackageOrThrow(entry.bytes).packageId,
            ),
        ),
    ];

    const mainPackage = packageLoader.loadPackageOrThrow(
        archive.mainPackageEntry.bytes,
    );

    const mainPackageId = mainPackage.packageId;

    const templateId: ExampleTemplateId = {
        packageId: mainPackageId,
        moduleName: "DebugPlayground",
        entityName: "Message",
    };

    const containsMessageTemplate = mainPackage.modules.some(
        (module) =>
            module.name === templateId.moduleName
            && module.definitions.some(
                (definition) =>
                    isDamlLfTemplateDefinition(definition)
                    && definition.templateId.moduleName === templateId.moduleName
                    && definition.templateId.templateName === templateId.entityName,
            ),
    );

    if (!containsMessageTemplate) {
        throw new Error(
            `Canton Explorer Debug Playground main package '${mainPackageId}' does not contain template '${templateId.moduleName}:${templateId.entityName}'.`,
        );
    }

    return {
        darBytes,
        mainPackageId,
        packageIds,
        templateId,
    };
}

function isDamlLfTemplateDefinition(
    definition: unknown,
): definition is {
    readonly nodeKind: DamlLfNodeKind.template;
    readonly templateId: {
        readonly moduleName: string;
        readonly templateName: string;
    };
} {
    if (typeof definition !== "object" || definition === null) {
        return false;
    }

    const candidate = definition as {
        readonly nodeKind?: unknown;
        readonly templateId?: unknown;
    };

    return (
        candidate.nodeKind === DamlLfNodeKind.template
        && typeof candidate.templateId === "object"
        && candidate.templateId !== null
        && "moduleName" in candidate.templateId
        && "templateName" in candidate.templateId
        && typeof candidate.templateId.moduleName === "string"
        && typeof candidate.templateId.templateName === "string"
    );
}
