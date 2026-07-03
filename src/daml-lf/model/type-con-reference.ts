export class TypeConReference {
    public readonly packageId: string;
    public readonly moduleName: string;
    public readonly name: string;

    public constructor(init: {
        packageId: string;
        moduleName: string;
        name: string;
    }) {
        this.packageId = init.packageId;
        this.moduleName = init.moduleName;
        this.name = init.name;
    }
}
