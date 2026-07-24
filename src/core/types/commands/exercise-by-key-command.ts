import { ValidationError } from "../../errors/validation-error.js";
import type { TemplateId } from "../../../query/model-types.js";

export class ExerciseByKeyCommand {
    public readonly templateId: TemplateId;
    public readonly contractKey: unknown;
    public readonly choice: string;
    public readonly choiceArgument: unknown;

    public constructor(init: {
        templateId: TemplateId;
        contractKey: unknown;
        choice: string;
        choiceArgument: unknown;
    }) {
        if (!init.templateId?.moduleName || !init.templateId.entityName) {
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
        this.choiceArgument = init.choiceArgument;
    }
}
