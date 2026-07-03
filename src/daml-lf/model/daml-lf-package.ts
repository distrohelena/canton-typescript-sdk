import { DamlLfLanguageVersion } from "../decoding/daml-lf-language-version.js";
import { DamlLfModule } from "./daml-lf-module.js";
import { DamlLfNodeKind } from "./daml-lf-node-kind.js";

export class DamlLfPackage {
    public readonly nodeKind = DamlLfNodeKind.package;
    public readonly packageId: string;
    public readonly packageName: string;
    public readonly packageVersion: string;
    public readonly languageVersion: DamlLfLanguageVersion;
    public readonly modules: readonly DamlLfModule[];

    public constructor(init: {
        packageId?: string;
        packageName: string;
        packageVersion: string;
        languageVersion: DamlLfLanguageVersion;
        modules: readonly DamlLfModule[];
    }) {
        this.packageId = init.packageId ?? "";
        this.packageName = init.packageName;
        this.packageVersion = init.packageVersion;
        this.languageVersion = init.languageVersion;
        this.modules = init.modules;
    }
}
