import { NotSupportedError } from "../../core/errors/not-supported-error.js";
import { ITransport } from "../../core/transports/transport.interface.js";
import { SubmitCommandRequest } from "../../core/types/requests/submit-command-request.js";
import { SubmitCommandResponse } from "../../core/types/responses/submit-command-response.js";

export class CommandSubmissionServiceClient {
    public constructor(private readonly transport: ITransport) {
        void this.transport;
    }

    /** Submits a command without waiting. Placeholder until explicitly implemented. */
    public async submitAsync(
        _request: SubmitCommandRequest,
    ): Promise<SubmitCommandResponse> {
        throw new NotSupportedError(
            "CommandSubmissionService.Submit is not available yet",
        );
    }
}
