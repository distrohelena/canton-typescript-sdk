import { DamlInterfaceGenerationException } from "../errors/daml-interface-generation.exception.js";

export class DamlInterfaceCliOptions {
    public readonly inputPath: string;
    public readonly outputDirectory: string;

    public constructor(init: { inputPath: string; outputDirectory: string }) {
        this.inputPath = init.inputPath;
        this.outputDirectory = init.outputDirectory;
    }

    /** Parses CLI arguments into strongly typed DAML interface generation options. */
    public static parseOrThrow(args: readonly string[]): DamlInterfaceCliOptions {
        let inputPath: string | undefined;

        let outputDirectory: string | undefined;

        for (let index = 0; index < args.length; index++) {
            const current = args[index];

            const next = args[index + 1];

            if (current === "--input") {
                inputPath = next;
                index++;
            }
            else if (current === "--output") {
                outputDirectory = next;

                index++;
            }
        }

        if (inputPath === undefined || outputDirectory === undefined) {
            throw new DamlInterfaceGenerationException(
                "daml interface cli requires --input and --output",
            );
        }

        return new DamlInterfaceCliOptions({
            inputPath,
            outputDirectory,
        });
    }
}
