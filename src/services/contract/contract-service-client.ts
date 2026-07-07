import { ITransport } from "../../core/transports/transport.interface.js";
import { RequestOptions } from "../../core/types/request-options.js";
import { GetContractRequest } from "../../core/types/requests/get-contract-request.js";
import { GetContractResponse } from "../../core/types/responses/get-contract-response.js";

export class ContractServiceClient {
    public constructor(private readonly transport: ITransport) {
        void this.transport;
    }

    /** Reads a single contract. Supported on gRPC; JSON rejects it. */
    public getContractAsync(
        request: GetContractRequest,
        options?: RequestOptions,
    ): Promise<GetContractResponse> {
        return this.transport.getContractAsync(request, options);
    }
}
