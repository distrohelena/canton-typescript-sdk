import { ITransport } from "../../core/transports/transport.interface.js";
import { RequestOptions } from "../../core/types/request-options.js";
import { AddPartyAsyncRequest } from "../../core/types/requests/add-party-async-request.js";
import { ClearPartyOnboardingFlagRequest } from "../../core/types/requests/clear-party-onboarding-flag-request.js";
import { GetHighestOffsetByTimestampRequest } from "../../core/types/requests/get-highest-offset-by-timestamp-request.js";
import { AddPartyAsyncResponse } from "../../core/types/responses/add-party-async-response.js";
import { ClearPartyOnboardingFlagResponse } from "../../core/types/responses/clear-party-onboarding-flag-response.js";
import { GetHighestOffsetByTimestampResponse } from "../../core/types/responses/get-highest-offset-by-timestamp-response.js";

export class ParticipantPartyManagementServiceClient {
    public constructor(private readonly transport: ITransport) {
        void this.transport;
    }

    /** Starts online party replication on the target participant. Supported on gRPC; JSON rejects it. */
    public addPartyAsync(
        request: AddPartyAsyncRequest,
        options?: RequestOptions,
    ): Promise<AddPartyAsyncResponse> {
        return this.transport.addPartyAsync(request, options);
    }

    /** Clears an onboarding flag on the target participant. Supported on gRPC; JSON rejects it. */
    public clearPartyOnboardingFlagAsync(
        request: ClearPartyOnboardingFlagRequest,
        options?: RequestOptions,
    ): Promise<ClearPartyOnboardingFlagResponse> {
        return this.transport.clearPartyOnboardingFlagAsync(request, options);
    }

    /** Reads the highest participant ledger offset before or at a timestamp. Supported on gRPC; JSON rejects it. */
    public getHighestOffsetByTimestampAsync(
        request: GetHighestOffsetByTimestampRequest,
        options?: RequestOptions,
    ): Promise<GetHighestOffsetByTimestampResponse> {
        return this.transport.getHighestOffsetByTimestampAsync(request, options);
    }
}
