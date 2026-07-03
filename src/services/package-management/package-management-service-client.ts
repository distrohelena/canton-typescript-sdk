import { TransportError } from "../../core/errors/transport-error.js";
import { ITransport } from "../../core/transports/transport.interface.js";
import { UploadPackageRequest } from "../../core/types/requests/upload-package-request.js";
import { UploadPackageResponse } from "../../core/types/responses/upload-package-response.js";

export class PackageManagementServiceClient {
    public constructor(private readonly transport: ITransport) {
        void this.transport;
    }

    /** Uploads a DAR file. Placeholder until transport alignment lands. */
    public async uploadDarFileAsync(
        _request: UploadPackageRequest,
    ): Promise<UploadPackageResponse> {
        throw new TransportError(
            "PackageManagementService.UploadDarFile is not available yet",
        );
    }
}
