import { ValidationError } from "../../errors/validationError.js";

export class SubmitCommandRequest {
  public readonly applicationId: string;
  public readonly actAs: readonly string[];

  public constructor(init: {
    applicationId: string;
    actAs: readonly string[];
  }) {
    if (init.actAs.length === 0) {
      throw new ValidationError("submit requests require at least one actAs party");
    }

    this.applicationId = init.applicationId;
    this.actAs = init.actAs;
  }
}
