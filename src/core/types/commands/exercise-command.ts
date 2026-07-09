import { ValidationError } from "../../errors/validation-error.js";

export class ExerciseCommand {
    public readonly templateId: string;
    public readonly contractId: string;
    public readonly choice: string;
    public readonly argument: unknown;

    public constructor(init: {
        templateId: string;
        contractId: string;
        choice: string;
        argument: unknown;
    }) {
        if (!init.templateId) {
            throw new ValidationError(
                "exercise commands require a templateId",
            );
        } else if (!init.contractId) {
            throw new ValidationError(
                "exercise commands require a contractId",
            );
        } else if (!init.choice) {
            throw new ValidationError(
                "exercise commands require a choice",
            );
        }

        this.templateId = init.templateId;
        this.contractId = init.contractId;
        this.choice = init.choice;
        this.argument = init.argument;
    }
}
