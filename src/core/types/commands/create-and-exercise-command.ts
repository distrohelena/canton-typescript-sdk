import { ValidationError } from "../../errors/validation-error.js";
import { DamlRecord } from "../daml-values.js";
import type { TemplateId } from "../../../query/model-types.js";

export class CreateAndExerciseCommand {
    public readonly templateId: TemplateId;
    public readonly createArguments: DamlRecord;
    public readonly choice: string;
    public readonly choiceArgument: unknown;

    public constructor(init: {
        templateId: TemplateId;
        createArguments: DamlRecord;
        choice: string;
        choiceArgument: unknown;
    }) {
        if (!init.templateId?.moduleName || !init.templateId.entityName) {
            throw new ValidationError(
                "create-and-exercise commands require a templateId",
            );
        } else if (!(init.createArguments instanceof DamlRecord)) {
            throw new ValidationError(
                "create-and-exercise commands require DamlRecord createArguments",
            );
        } else if (!init.choice) {
            throw new ValidationError(
                "create-and-exercise commands require a choice",
            );
        }

        this.templateId = init.templateId;
        this.createArguments = init.createArguments;
        this.choice = init.choice;
        this.choiceArgument = init.choiceArgument;
    }
}
