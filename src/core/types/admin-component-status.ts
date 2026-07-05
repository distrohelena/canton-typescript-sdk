import { AdminComponentHealthKind } from "./admin-component-health-kind.js";

export class AdminComponentStatus {
    public readonly name: string;
    public readonly kind: AdminComponentHealthKind;
    public readonly description?: string;

    public constructor(init: {
        name: string;
        kind: AdminComponentHealthKind;
        description?: string;
    }) {
        this.name = init.name;
        this.kind = init.kind;
        this.description = init.description;
    }
}
