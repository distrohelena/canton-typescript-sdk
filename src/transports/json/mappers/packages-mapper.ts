import { UploadPackageResponse } from "../../../core/types/responses/upload-package-response.js";

export function mapJsonUploadPackage(payload: {
    result?: { packageId?: string };
    packageId?: string;
}): UploadPackageResponse {
    return new UploadPackageResponse({
        packageId: payload.result?.packageId ?? payload.packageId,
    });
}
