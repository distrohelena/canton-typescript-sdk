import { UploadPackageRequest } from "../../../core/types/requests/uploadPackageRequest.js";
import { UploadPackageResponse } from "../../../core/types/responses/uploadPackageResponse.js";

export function mapGrpcUploadPackageRequest(request: UploadPackageRequest): {
  bytes: Uint8Array;
  format: string;
} {
  return {
    bytes: request.bytes,
    format: request.format
  };
}

export function mapGrpcUploadPackage(payload: {
  packageId?: string;
}): UploadPackageResponse {
  return new UploadPackageResponse({
    packageId: payload.packageId
  });
}
