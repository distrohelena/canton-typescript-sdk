import { ValidationError } from "../errors/validation-error.js";
import { TemplateId } from "../../query/model-types.js";

export class DisclosedContract {
    public readonly createdEventBlob: Uint8Array;
    public readonly templateId?: TemplateId;
    public readonly contractId?: string;
    public readonly synchronizerId?: string;
    public constructor(init: { createdEventBlob: Uint8Array; templateId?: TemplateId; contractId?: string; synchronizerId?: string }) {
        if (init.createdEventBlob.length === 0) throw new ValidationError("disclosed contracts require a createdEventBlob");
        this.createdEventBlob = init.createdEventBlob;
        this.templateId = init.templateId;
        this.contractId = init.contractId;
        this.synchronizerId = init.synchronizerId;
    }
}
