import { ValidationError } from "../../errors/validation-error.js";
import type { TemplateId } from "../../../query/model-types.js";

export class ExerciseCommand {
    public readonly templateId: TemplateId;
    public readonly contractId: string;
    public readonly choice: string;
    public readonly choiceArgument: unknown;

    public constructor(init: {
        templateId: TemplateId;
        contractId: string;
        choice: string;
        choiceArgument: unknown;
    }) {
        if (!init.templateId?.moduleName || !init.templateId.entityName) {
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
        this.choiceArgument = init.choiceArgument;
    }
}
