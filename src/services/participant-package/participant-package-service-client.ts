import { ITransport } from "../../core/transports/transport.interface.js";
import { RequestOptions } from "../../core/types/request-options.js";
import { GetDarContentsRequest } from "../../core/types/requests/get-dar-contents-request.js";
import { GetDarRequest } from "../../core/types/requests/get-dar-request.js";
import { GetPackageContentsRequest } from "../../core/types/requests/get-package-contents-request.js";
import { GetPackageReferencesRequest } from "../../core/types/requests/get-package-references-request.js";
import { ListDarsRequest } from "../../core/types/requests/list-dars-request.js";
import { ParticipantListPackagesRequest } from "../../core/types/requests/participant-list-packages-request.js";
import { GetDarContentsResponse } from "../../core/types/responses/get-dar-contents-response.js";
import { GetDarResponse } from "../../core/types/responses/get-dar-response.js";
import { GetPackageContentsResponse } from "../../core/types/responses/get-package-contents-response.js";
import { GetPackageReferencesResponse } from "../../core/types/responses/get-package-references-response.js";
import { ListDarsResponse } from "../../core/types/responses/list-dars-response.js";
import { ParticipantListPackagesResponse } from "../../core/types/responses/participant-list-packages-response.js";

export class ParticipantPackageServiceClient {
    public constructor(private readonly transport: ITransport) {
        void this.transport;
    }

    /** Lists participant-local packages. Shared SDK surface; JSON may reject it. */
    public listPackagesAsync(
        request: ParticipantListPackagesRequest,
        options?: RequestOptions,
    ): Promise<ParticipantListPackagesResponse> {
        return this.transport.listParticipantPackagesAsync(request, options);
    }

    /** Reads participant-local package contents. Shared SDK surface; JSON may reject it. */
    public getPackageContentsAsync(
        request: GetPackageContentsRequest,
        options?: RequestOptions,
    ): Promise<GetPackageContentsResponse> {
        return this.transport.getParticipantPackageContentsAsync(
            request,
            options,
        );
    }

    /** Reads participant package references. Shared SDK surface; JSON may reject it. */
    public getPackageReferencesAsync(
        request: GetPackageReferencesRequest,
        options?: RequestOptions,
    ): Promise<GetPackageReferencesResponse> {
        return this.transport.getParticipantPackageReferencesAsync(
            request,
            options,
        );
    }

    /** Reads a participant-local DAR archive. Supported on gRPC; JSON rejects it. */
    public getDarAsync(
        request: GetDarRequest,
        options?: RequestOptions,
    ): Promise<GetDarResponse> {
        return this.transport.getParticipantDarAsync(request, options);
    }

    /** Lists participant-local DAR archives. Supported on gRPC; JSON rejects it. */
    public listDarsAsync(
        request: ListDarsRequest,
        options?: RequestOptions,
    ): Promise<ListDarsResponse> {
        return this.transport.listParticipantDarsAsync(request, options);
    }

    /** Reads participant-local DAR contents. Supported on gRPC; JSON rejects it. */
    public getDarContentsAsync(
        request: GetDarContentsRequest,
        options?: RequestOptions,
    ): Promise<GetDarContentsResponse> {
        return this.transport.getParticipantDarContentsAsync(request, options);
    }
}
