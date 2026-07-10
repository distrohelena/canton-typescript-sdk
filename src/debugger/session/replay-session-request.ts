import { ValidationError } from "../../core/errors/validation-error.js";

export class ReplaySessionRequest {
    public readonly offset: string;

    public constructor(init: { offset: string }) {
        if (!init.offset) {
            throw new ValidationError(
                "replay session requests require an offset",
            );
        }

        this.offset = init.offset;
    }
}
