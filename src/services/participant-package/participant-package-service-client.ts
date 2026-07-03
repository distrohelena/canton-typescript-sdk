import { ITransport } from "../../core/transports/transport.interface.js";
import { RequestOptions } from "../../core/types/request-options.js";
import { GetPackageContentsRequest } from "../../core/types/requests/get-package-contents-request.js";
import { GetPackageReferencesRequest } from "../../core/types/requests/get-package-references-request.js";
import { ParticipantListPackagesRequest } from "../../core/types/requests/participant-list-packages-request.js";
import { UploadDarFileRequest } from "../../core/types/requests/upload-dar-file-request.js";
import { GetPackageContentsResponse } from "../../core/types/responses/get-package-contents-response.js";
import { GetPackageReferencesResponse } from "../../core/types/responses/get-package-references-response.js";
import { ParticipantListPackagesResponse } from "../../core/types/responses/participant-list-packages-response.js";
import { UploadDarFileResponse } from "../../core/types/responses/upload-dar-file-response.js";

export class ParticipantPackageServiceClient {
    public constructor(private readonly transport: ITransport) {
        void this.transport;
    }

    /** Uploads a DAR file. Supported on JSON and gRPC. */
    public uploadDarFileAsync(
        request: UploadDarFileRequest,
        options?: RequestOptions,
    ): Promise<UploadDarFileResponse> {
        return this.transport.uploadDarFileAsync(request, options);
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
}
