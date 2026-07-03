import { ITransport } from "../../core/transports/transport.interface.js";
import { UploadDarFileRequest } from "../../core/types/requests/upload-dar-file-request.js";
import { UploadDarFileResponse } from "../../core/types/responses/upload-dar-file-response.js";

export class PackageManagementServiceClient {
    public constructor(private readonly transport: ITransport) {
        void this.transport;
    }

    /** Uploads a DAR file. Supported on JSON and gRPC. */
    public uploadDarFileAsync(
        request: UploadDarFileRequest,
    ): Promise<UploadDarFileResponse> {
        return this.transport.uploadDarFileAsync(request);
    }
}
