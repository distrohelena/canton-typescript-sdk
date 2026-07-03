import { SubmitCommandRequest } from "../../core/types/requests/submit-command-request.js";

export function buildCanonicalCommandPayload(
    request: SubmitCommandRequest,
): Uint8Array {
    return new TextEncoder().encode(
        JSON.stringify({
            applicationId: request.applicationId,
            actAs: request.actAs,
        }),
    );
}
