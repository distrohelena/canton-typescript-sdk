import {
    DamlModuleImportStyles,
    type DamlModuleImportStyle,
} from "./emission/daml-module-import-style.js";

export class DamlInterfaceGeneratorOptions {
    public readonly generatedDirectory: string;
    public readonly moduleImportStyle: DamlModuleImportStyle;

    public constructor(init: {
        generatedDirectory?: string;
        moduleImportStyle?: DamlModuleImportStyle;
    } = {}) {
        this.generatedDirectory = init.generatedDirectory ?? "generated";
        this.moduleImportStyle = init.moduleImportStyle ?? DamlModuleImportStyles.esm;
    }
}
