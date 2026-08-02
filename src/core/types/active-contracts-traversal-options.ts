import { ValidationError } from "../errors/validation-error.js";
import { OperationDeadline } from "./operation-deadline.js";

export class ActiveContractsTraversalOptions {
    public readonly deadline: OperationDeadline;
    public readonly maxPages: number;
    public readonly maxContracts: number;

    public constructor(init: {
        deadline: OperationDeadline;
        maxPages: number;
        maxContracts: number;
    }) {
        if (!(init.deadline instanceof OperationDeadline)) {
            throw new ValidationError("active contracts traversal deadline must be an OperationDeadline");
        } else if (!Number.isSafeInteger(init.maxPages) || init.maxPages <= 0) {
            throw new ValidationError("active contracts traversal maxPages must be a positive safe integer");
        } else if (!Number.isSafeInteger(init.maxContracts) || init.maxContracts <= 0) {
            throw new ValidationError("active contracts traversal maxContracts must be a positive safe integer");
        }

        this.deadline = init.deadline;
        this.maxPages = init.maxPages;
        this.maxContracts = init.maxContracts;

        Object.freeze(this);
    }
}
