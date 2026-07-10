export class ReplayEntrypoint {
    public readonly kind: "create" | "exercise";
    public readonly templateId?: {
        packageId?: string;
        moduleName?: string;
        entityName?: string;
    };
    public readonly contractId?: string;
    public readonly choice?: string;
    public readonly argument?: unknown;

    public constructor(init: {
        kind: "create" | "exercise";
        templateId?: {
            packageId?: string;
            moduleName?: string;
            entityName?: string;
        };
        contractId?: string;
        choice?: string;
        argument?: unknown;
    }) {
        this.kind = init.kind;
        this.templateId = init.templateId;
        this.contractId = init.contractId;
        this.choice = init.choice;
        this.argument = init.argument;
    }
}
