import { UploadPackageRequest } from "../../../core/types/requests/upload-package-request.js";
import { UploadPackageResponse } from "../../../core/types/responses/upload-package-response.js";

export function mapGrpcUploadPackageRequest(request: UploadPackageRequest): {
    bytes: Uint8Array;
    format: string;
} {
    return {
        bytes: request.bytes,
        format: request.format,
    };
}

export function mapGrpcUploadPackage(payload: {
    packageId?: string;
}): UploadPackageResponse {
    return new UploadPackageResponse({
        packageId: payload.packageId,
    });
}
