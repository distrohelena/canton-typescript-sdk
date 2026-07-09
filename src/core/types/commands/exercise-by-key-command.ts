import { ValidationError } from "../../errors/validation-error.js";

export class ExerciseByKeyCommand {
    public readonly templateId: string;
    public readonly contractKey: unknown;
    public readonly choice: string;
    public readonly argument: unknown;

    public constructor(init: {
        templateId: string;
        contractKey: unknown;
        choice: string;
        argument: unknown;
    }) {
        if (!init.templateId) {
            throw new ValidationError(
                "exercise-by-key commands require a templateId",
            );
        } else if (init.contractKey === undefined) {
            throw new ValidationError(
                "exercise-by-key commands require a contractKey",
            );
        } else if (!init.choice) {
            throw new ValidationError(
                "exercise-by-key commands require a choice",
            );
        }

        this.templateId = init.templateId;
        this.contractKey = init.contractKey;
        this.choice = init.choice;
        this.argument = init.argument;
    }
}
