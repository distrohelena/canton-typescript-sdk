import { ITransport } from "../../core/transports/iTransport.js";
import { UploadPackageRequest } from "../../core/types/requests/uploadPackageRequest.js";
import { UploadPackageResponse } from "../../core/types/responses/uploadPackageResponse.js";

export class PackagesClient {
  public constructor(private readonly transport: ITransport) {
    void this.transport;
  }

  public uploadAsync(request: UploadPackageRequest): Promise<UploadPackageResponse> {
    return this.transport.uploadPackageAsync(request);
  }
}
