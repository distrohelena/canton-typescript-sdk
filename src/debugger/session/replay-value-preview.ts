import { ValidationError } from "../../core/errors/validation-error.js";

export class ReplayValuePreview {
    public readonly kind: string;
    public readonly display: string;

    public constructor(init: { kind: string; display: string }) {
        if (!init.kind) {
            throw new ValidationError("replay value previews require a kind");
        }

        if (!init.display) {
            throw new ValidationError(
                "replay value previews require a display value",
            );
        }

        this.kind = init.kind;
        this.display = init.display;
    }
}
