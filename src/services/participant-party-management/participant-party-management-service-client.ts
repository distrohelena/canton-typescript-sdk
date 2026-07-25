import { ITransport } from "../../core/transports/transport.interface.js";
import { RequestOptions } from "../../core/types/request-options.js";
import type {
    AddPartyAsyncRequest,
    AddPartyAsyncResponse,
    ClearPartyOnboardingFlagRequest,
    ClearPartyOnboardingFlagResponse,
    GetHighestOffsetByTimestampRequest,
    GetHighestOffsetByTimestampResponse,
} from "../../transports/grpc/generated/canton/com/digitalasset/canton/admin/participant/v30/party_management_service.js";

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
