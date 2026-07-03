import { TypeConReference } from "./type-con-reference.js";

export class DamlLfTemplateId {
    public readonly packageId: string;
    public readonly moduleName: string;
    public readonly templateName: string;

    public constructor(init: {
        packageId: string;
        moduleName: string;
        templateName: string;
    }) {
        this.packageId = init.packageId;
        this.moduleName = init.moduleName;
        this.templateName = init.templateName;
    }

    public toTypeConReference(): TypeConReference {
        return new TypeConReference({
            packageId: this.packageId,
            moduleName: this.moduleName,
            name: this.templateName,
        });
    }
}
