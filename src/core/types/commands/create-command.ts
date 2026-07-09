import { ValidationError } from "../../errors/validation-error.js";

export class CreateCommand {
    public readonly templateId: string;
    public readonly payload: Record<string, unknown>;

    public constructor(init: {
        templateId: string;
        payload: Record<string, unknown>;
    }) {
        if (!init.templateId) {
            throw new ValidationError("create commands require a templateId");
        }

        this.templateId = init.templateId;
        this.payload = init.payload;
    }
}
