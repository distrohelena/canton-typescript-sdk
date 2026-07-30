import { readFile } from "node:fs/promises";
import { extname } from "node:path";
import { DamlInterfaceGenerator } from "../daml-interface-generator.js";
import { DamlInterfaceGeneratorOptions } from "../daml-interface-generator-options.js";
import { DamlInterfaceGenerationException } from "../errors/daml-interface-generation.exception.js";
import { DamlInterfaceCliOptions } from "./daml-interface-cli-options.js";
import { DamlInterfaceWriter } from "../writing/daml-interface-writer.js";

export class DamlInterfaceCli {
    public constructor(
        private readonly generator: DamlInterfaceGenerator | undefined = undefined,
        private readonly writer: DamlInterfaceWriter = new DamlInterfaceWriter(),
        private readonly readFileAsync: (
            path: string,
        ) => Promise<Uint8Array> = readFile,
    ) {
        void this.writer;
        void this.readFileAsync;
    }

    /** Runs the DAML interface CLI and returns a process exit code. */
    public async runAsync(args: readonly string[]): Promise<number> {
        const options = DamlInterfaceCliOptions.parseOrThrow(args);

        const generator = this.generator ?? new DamlInterfaceGenerator(
            new DamlInterfaceGeneratorOptions({
                moduleImportStyle: options.moduleImportStyle,
            }),
        );

        const bytes = await this.readFileAsync(options.inputPath);

        const extension = extname(options.inputPath).toLowerCase();

        const project =
            extension === ".dar"
                ? await generator.generateFromDarOrThrowAsync(bytes)
                : extension === ".dalf"
                    ? await generator.generateFromDalfOrThrowAsync(bytes)
                    : undefined;

        if (project === undefined) {
            throw new DamlInterfaceGenerationException(
                `daml interface cli does not support '${extension}' inputs`,
            );
        }

        await this.writer.writeProjectAsync(project, options.outputDirectory);

        return 0;
    }
}
