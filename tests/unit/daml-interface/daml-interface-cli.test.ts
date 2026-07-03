import { describe, expect, it, vi } from "vitest";
import { GeneratedDamlInterfaceProject } from "../../../src/daml-interface/emission-model/generated-daml-interface-project.js";
import { DamlInterfaceCli } from "../../../src/daml-interface/cli/daml-interface-cli.js";
import { DamlInterfaceCliOptions } from "../../../src/daml-interface/cli/daml-interface-cli-options.js";
import { DamlInterfaceGenerator } from "../../../src/daml-interface/daml-interface-generator.js";
import { DamlInterfaceWriter } from "../../../src/daml-interface/writing/daml-interface-writer.js";

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

        const readFileAsync = vi.fn(async () => new Uint8Array([1, 2, 3]));

        const exitCode = await new DamlInterfaceCli(
            generator,
            writer,
            readFileAsync,
        ).runAsync([
            "--input",
            "sample.dalf",
            "--output",
            "generated",
        ]);

        expect(exitCode).toBe(0);
        expect(readFileAsync).toHaveBeenCalledWith("sample.dalf");
        expect(generator.generateFromDalfOrThrowAsync).toHaveBeenCalled();
        expect(writer.writeProjectAsync).toHaveBeenCalledWith(
            project,
            "generated",
        );
    });
});
