import { ValidationError } from "../../errors/validation-error.js";

export class CreateAndExerciseCommand {
    public readonly templateId: string;
    public readonly payload: Record<string, unknown>;
    public readonly choice: string;
    public readonly argument: unknown;

    public constructor(init: {
        templateId: string;
        payload: Record<string, unknown>;
        choice: string;
        argument: unknown;
    }) {
        if (!init.templateId) {
            throw new ValidationError(
                "create-and-exercise commands require a templateId",
            );
        } else if (!init.choice) {
            throw new ValidationError(
                "create-and-exercise commands require a choice",
            );
        }

        this.templateId = init.templateId;
        this.payload = init.payload;
        this.choice = init.choice;
        this.argument = init.argument;
    }
}
