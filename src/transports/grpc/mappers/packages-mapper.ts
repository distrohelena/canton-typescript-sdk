import { NotSupportedError } from "../../../core/errors/not-supported-error.js";
import { PackageFormat } from "../../../core/types/package-format.js";
import { UploadPackageRequest } from "../../../core/types/requests/upload-package-request.js";
import { UploadPackageResponse } from "../../../core/types/responses/upload-package-response.js";
import {
    UploadDarFileRequest,
    UploadDarFileRequest_VettingChange,
    UploadDarFileResponse,
} from "../generated/canton/com/daml/ledger/api/v2/admin/package_management_service.js";

export function mapGrpcUploadPackageRequest(
    request: UploadPackageRequest,
): UploadDarFileRequest {
    if (request.format !== PackageFormat.dar) {
        throw new NotSupportedError(
            "gRPC package upload currently supports DAR archives only.",
        );
    }

    return {
        darFile: request.bytes,
        submissionId: "",
        vettingChange: UploadDarFileRequest_VettingChange.UNSPECIFIED,
        synchronizerId: "",
    };
}

export function mapGrpcUploadPackage(payload: {
    packageId?: string;
} | UploadDarFileResponse): UploadPackageResponse {
    return new UploadPackageResponse({
        packageId: "packageId" in payload ? payload.packageId : undefined,
    });
}
