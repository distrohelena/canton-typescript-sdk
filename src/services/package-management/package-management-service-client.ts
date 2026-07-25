import { ITransport } from "../../core/transports/transport.interface.js";
import { RequestOptions } from "../../core/types/request-options.js";
import type {
    ListKnownPackagesRequest,
    ListKnownPackagesResponse,
    UploadDarFileRequest,
    UploadDarFileResponse,
} from "../../transports/grpc/generated/canton/com/daml/ledger/api/v2/admin/package_management_service.js";

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
