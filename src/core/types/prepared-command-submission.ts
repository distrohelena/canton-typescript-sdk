import { SubmitCommandsRequest } from "./requests/submit-commands-request.js";

/** Opaque result of interactive command preparation, suitable for detached signing. */
export class PreparedCommandSubmission {
    public constructor(
        public readonly request: SubmitCommandsRequest,
        public readonly transaction: unknown,
        public readonly transactionHash: Uint8Array,
        public readonly hashingSchemeVersion: number,
    ) {}
}

