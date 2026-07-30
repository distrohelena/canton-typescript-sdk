import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { SampleLfPackageFixture } from "../../fixtures/daml-lf/sample-lf-package-fixture.js";
import {
    generateTsNodeTemporaryProjectAsync,
    generateTsNodeTemporaryProjectFromDarAsync,
} from "./generated-project-test-helper.js";

const VAULT_BASE_DAR = process.env.DAML_INTERFACE_VAULT_BASE_DAR;

describe("generated DAML project ts-node imports", () => {
    it("loads materialization fixture source and executes every generated source spec in CommonJS ts-node", async () => {
        const temporaryProject = await generateTsNodeTemporaryProjectAsync(
            SampleLfPackageFixture.createLf2ArchiveBytes(),
        );

        try {
            expect(temporaryProject.executedSpecPaths).toEqual(
                temporaryProject.project.specFiles.map((file) =>
                    join(temporaryProject.directory, file.path),
                ).sort(),
            );
            await expectNoRelativeJavaScriptImportsAsync(temporaryProject.directory);
        } finally {
            await temporaryProject.disposeAsync();
        }
    }, 60_000);

    it.skipIf(VAULT_BASE_DAR === undefined)(
        "loads configured Vault Base source and executes every generated source spec in CommonJS ts-node",
        async () => {
            if (VAULT_BASE_DAR === undefined) {
                throw new Error("DAML_INTERFACE_VAULT_BASE_DAR must be set to run this external integration test");
            } else if (!existsSync(VAULT_BASE_DAR)) {
                throw new Error(`DAML_INTERFACE_VAULT_BASE_DAR does not exist: ${VAULT_BASE_DAR}`);
            }

            const temporaryProject = await generateTsNodeTemporaryProjectFromDarAsync(VAULT_BASE_DAR);

            try {
                expect(temporaryProject.executedSpecPaths).toEqual(
                    temporaryProject.project.specFiles.map((file) =>
                        join(temporaryProject.directory, file.path),
                    ).sort(),
                );
                await expectNoRelativeJavaScriptImportsAsync(temporaryProject.directory);
            } finally {
                await temporaryProject.disposeAsync();
            }
        },
        120_000,
    );
});

async function expectNoRelativeJavaScriptImportsAsync(directory: string): Promise<void> {
    const generatedSources = await readGeneratedSourcesAsync(`${directory}/generated`);

    for (const source of generatedSources) {
        expect(source).not.toMatch(/(?:from|import)\s*["'][.]{1,2}\/[^"']+\.js["']/);
    }
}

async function readGeneratedSourcesAsync(directory: string): Promise<readonly string[]> {
    const { readdir } = await import("node:fs/promises");

    const entries = await readdir(directory, { withFileTypes: true });

    const sources = await Promise.all(entries.map(async (entry) => {
        const path = `${directory}/${entry.name}`;

        return entry.isDirectory()
            ? readGeneratedSourcesAsync(path)
            : [await readFile(path, "utf8")];
    }));

    return sources.flat();
}
