export class ModuleReference {
    public readonly packageId: string;
    public readonly moduleName: string;

    public constructor(init: { packageId: string; moduleName: string }) {
        this.packageId = init.packageId;
        this.moduleName = init.moduleName;
    }
}
