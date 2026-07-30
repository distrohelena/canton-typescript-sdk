import { describe, expect, it, vi } from "vitest";
import { GeneratedDamlInterfaceProject } from "../../../src/daml-interface/emission-model/generated-daml-interface-project.js";
import { DamlInterfaceCli } from "../../../src/daml-interface/cli/daml-interface-cli.js";
import { DamlInterfaceCliOptions } from "../../../src/daml-interface/cli/daml-interface-cli-options.js";
import { DamlInterfaceGenerator } from "../../../src/daml-interface/daml-interface-generator.js";
import { DamlInterfaceWriter } from "../../../src/daml-interface/writing/daml-interface-writer.js";
import { DamlInterfaceGenerationException } from "../../../src/daml-interface/errors/daml-interface-generation.exception.js";
import { SampleLfPackageFixture } from "../../fixtures/daml-lf/sample-lf-package-fixture.js";

describe("DamlInterfaceCli", () => {
    it("parses input and output options", () => {
        const options = DamlInterfaceCliOptions.parseOrThrow([
            "--input",
            "sample.dalf",
            "--output",
            "generated",
        ]);

        expect(options.inputPath).toBe("sample.dalf");
        expect(options.outputDirectory).toBe("generated");
        expect(options.moduleImportStyle).toBe("esm");
    });

    it("parses the supported module import styles", () => {
        expect(DamlInterfaceCliOptions.parseOrThrow([
            "--input",
            "sample.dalf",
            "--output",
            "generated",
            "--module-import-style",
            "esm",
        ]).moduleImportStyle).toBe("esm");
        expect(DamlInterfaceCliOptions.parseOrThrow([
            "--input",
            "sample.dalf",
            "--output",
            "generated",
            "--module-import-style",
            "ts-node",
        ]).moduleImportStyle).toBe("ts-node");
    });

    it("rejects a missing or unsupported module import style", () => {
        expect(() => DamlInterfaceCliOptions.parseOrThrow([
            "--input",
            "sample.dalf",
            "--output",
            "generated",
            "--module-import-style",
        ])).toThrow(DamlInterfaceGenerationException);
        expect(() => DamlInterfaceCliOptions.parseOrThrow([
            "--input",
            "sample.dalf",
            "--output",
            "generated",
            "--module-import-style",
            "commonjs",
        ])).toThrow(DamlInterfaceGenerationException);
    });

    it("delegates generation and writing for dalf input", async () => {
        const project = new GeneratedDamlInterfaceProject({
            templateFiles: [],
        });

        const generator = {
            generateFromDalfOrThrowAsync: vi.fn(async () => project),
        } as unknown as DamlInterfaceGenerator;

        const writer = {
            writeProjectAsync: vi.fn(async () => undefined),
        } as unknown as DamlInterfaceWriter;

        const archiveBytes = SampleLfPackageFixture.createLf2ArchiveBytes();

        const readFileAsync = vi.fn(async () => archiveBytes);

        const createGenerator = vi.fn();

        const exitCode = await new DamlInterfaceCli(
            generator,
            writer,
            readFileAsync,
            createGenerator,
        ).runAsync([
            "--input",
            "sample.dalf",
            "--output",
            "generated",
        ]);

        expect(exitCode).toBe(0);
        expect(readFileAsync).toHaveBeenCalledWith("sample.dalf");
        expect(generator.generateFromDalfOrThrowAsync).toHaveBeenCalled();
        expect(createGenerator).not.toHaveBeenCalled();
        expect(writer.writeProjectAsync).toHaveBeenCalledWith(
            project,
            "generated",
        );
    });

    it("constructs a configured generator when one is not injected", async () => {
        const project = new GeneratedDamlInterfaceProject({ templateFiles: [] });

        const generator = {
            generateFromDalfOrThrowAsync: vi.fn(async () => project),
        } as unknown as DamlInterfaceGenerator;

        const createGenerator = vi.fn(() => generator);

        const writer = {
            writeProjectAsync: vi.fn(async () => undefined),
        } as unknown as DamlInterfaceWriter;

        const archiveBytes = SampleLfPackageFixture.createLf2ArchiveBytes();

        const readFileAsync = vi.fn(async () => archiveBytes);

        await new DamlInterfaceCli(
            undefined,
            writer,
            readFileAsync,
            createGenerator,
        ).runAsync([
            "--input",
            "sample.dalf",
            "--output",
            "generated",
            "--module-import-style",
            "ts-node",
        ]);

        expect(createGenerator).toHaveBeenCalledWith(expect.objectContaining({
            moduleImportStyle: "ts-node",
        }));
        expect(generator.generateFromDalfOrThrowAsync).toHaveBeenCalledWith(
            archiveBytes,
        );
    });
});
