import {
    DamlModuleImportStyles,
    type DamlModuleImportStyle,
} from "./daml-module-import-style.js";

/** Formats generated-project relative module specifiers for the selected execution mode. */
export class RelativeModuleSpecifier {
    private constructor() {}

    /** Resolves a generated TypeScript target path relative to a generated source path. */
    public static fromPaths(
        fromPath: string,
        toPath: string,
        moduleImportStyle: DamlModuleImportStyle = DamlModuleImportStyles.esm,
    ): string {
        const from = fromPath.split("/").slice(0, -1);

        const to = toPath.replace(/\.ts$/, "").split("/");

        while (from[0] === to[0] && from.length > 0) {
            from.shift();
            to.shift();
        }

        const relativePath = from.map(() => "..").concat(to).join("/") || ".";

        const prefixedPath = relativePath.startsWith(".") ? relativePath : `./${relativePath}`;

        return moduleImportStyle === DamlModuleImportStyles.esm ? `${prefixedPath}.js` : prefixedPath;
    }
}
