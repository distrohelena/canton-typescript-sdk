import { ITransport } from "../../core/transports/transport.interface.js";
import { UploadPackageRequest } from "../../core/types/requests/upload-package-request.js";
import { UploadPackageResponse } from "../../core/types/responses/upload-package-response.js";

export class PackagesClient {
    public constructor(private readonly transport: ITransport) {
        void this.transport;
    }

    public uploadAsync(
        request: UploadPackageRequest,
    ): Promise<UploadPackageResponse> {
        return this.transport.uploadPackageAsync(request);
    }
}
