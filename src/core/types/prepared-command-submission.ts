import { SubmitCommandRequest } from "./requests/submit-command-request.js";

/** Opaque result of interactive command preparation, suitable for detached signing. */
export class PreparedCommandSubmission {
    public constructor(
        public readonly request: SubmitCommandRequest,
        public readonly transaction: unknown,
        public readonly transactionHash: Uint8Array,
        public readonly hashingSchemeVersion: number,
    ) {}
}
