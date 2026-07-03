export class CreateCommand {
    public readonly templateId: string;
    public readonly payload: Record<string, unknown>;

    public constructor(init: {
        templateId: string;
        payload: Record<string, unknown>;
    }) {
        this.templateId = init.templateId;
        this.payload = init.payload;
    }
}
