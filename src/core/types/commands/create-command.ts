import { ValidationError } from "../../errors/validation-error.js";
import { DamlRecord } from "../daml-values.js";
import type { TemplateId } from "../../../query/model-types.js";

export class CreateCommand {
    public readonly templateId: TemplateId;
    public readonly createArguments: DamlRecord;

    public constructor(init: {
        templateId: TemplateId;
        createArguments: DamlRecord;
    }) {
        if (!init.templateId?.moduleName || !init.templateId.entityName) {
            throw new ValidationError("create commands require a templateId");
        } else if (!(init.createArguments instanceof DamlRecord)) {
            throw new ValidationError(
                "create commands require DamlRecord createArguments",
            );
        }

        this.templateId = init.templateId;
        this.createArguments = init.createArguments;
    }
}
