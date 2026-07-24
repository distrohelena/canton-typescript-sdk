import { CantonError } from "../../core/errors/canton-error.js";

export class PqsQueryError extends CantonError {
    public readonly operation: string;
    public readonly code?: string;

    public constructor(init: {
        operation: string;
        code?: string;
        cause?: unknown;
    }) {
        super(
            `PQS query ${init.operation} failed${init.code === undefined ? "" : ` (${init.code})`}.`,
        );
        this.operation = init.operation;
        this.code = init.code;
        void init.cause;
    }
}
