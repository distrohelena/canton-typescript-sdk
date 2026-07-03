import { DamlLfPackage } from "./model/daml-lf-package.js";

export class DamlLfWorkspace {
    public readonly packages: readonly DamlLfPackage[];

    public constructor(packages: readonly DamlLfPackage[]) {
        this.packages = packages;
    }
}
