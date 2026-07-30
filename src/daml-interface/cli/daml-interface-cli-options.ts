import { DamlInterfaceGenerationException } from "../errors/daml-interface-generation.exception.js";
import {
    DamlModuleImportStyles,
    type DamlModuleImportStyle,
} from "../emission/daml-module-import-style.js";

export class DamlInterfaceCliOptions {
    public readonly inputPath: string;
    public readonly outputDirectory: string;
    public readonly moduleImportStyle: DamlModuleImportStyle;

    public constructor(init: {
        inputPath: string;
        outputDirectory: string;
        moduleImportStyle?: DamlModuleImportStyle;
    }) {
        this.inputPath = init.inputPath;
        this.outputDirectory = init.outputDirectory;
        this.moduleImportStyle = init.moduleImportStyle ?? DamlModuleImportStyles.esm;
    }

    /** Parses CLI arguments into strongly typed DAML interface generation options. */
    public static parseOrThrow(args: readonly string[]): DamlInterfaceCliOptions {
        let inputPath: string | undefined;

        let outputDirectory: string | undefined;

        let moduleImportStyle: DamlModuleImportStyle = DamlModuleImportStyles.esm;

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
            else if (current === "--module-import-style") {
                if (next !== DamlModuleImportStyles.esm && next !== DamlModuleImportStyles.tsNode) {
                    throw new DamlInterfaceGenerationException(
                        "daml interface cli --module-import-style must be 'esm' or 'ts-node'",
                    );
                }

                moduleImportStyle = next;
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
            moduleImportStyle,
        });
    }
}
