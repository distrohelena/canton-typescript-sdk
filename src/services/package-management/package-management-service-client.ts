import { ITransport } from "../../core/transports/transport.interface.js";
import { RequestOptions } from "../../core/types/request-options.js";
import { ListKnownPackagesRequest } from "../../core/types/requests/list-known-packages-request.js";
import { ListKnownPackagesResponse } from "../../core/types/responses/list-known-packages-response.js";
import { UploadDarFileRequest } from "../../core/types/requests/upload-dar-file-request.js";
import { UploadDarFileResponse } from "../../core/types/responses/upload-dar-file-response.js";

export class PackageManagementServiceClient {
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

    /** Lists participant-known package metadata. Supported on gRPC; JSON rejects it. */
    public listKnownPackagesAsync(
        request: ListKnownPackagesRequest,
        options?: RequestOptions,
    ): Promise<ListKnownPackagesResponse> {
        return this.transport.listKnownPackagesAsync(request, options);
    }
}
