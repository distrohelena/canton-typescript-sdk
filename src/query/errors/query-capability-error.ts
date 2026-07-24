import { CantonError } from "../../core/errors/canton-error.js";
import { QuerySource } from "../query-source.js";

export class QueryCapabilityError extends CantonError {
    public constructor(
        public readonly source: QuerySource,
        public readonly operation: string,
    ) {
        super(`Query operation ${operation} is not supported by ${source}.`);
    }
}
