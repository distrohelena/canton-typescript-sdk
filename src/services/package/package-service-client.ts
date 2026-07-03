import { ITransport } from "../../core/transports/transport.interface.js";
import { RequestOptions } from "../../core/types/request-options.js";
import { GetPackageRequest } from "../../core/types/requests/get-package-request.js";
import { GetPackageStatusRequest } from "../../core/types/requests/get-package-status-request.js";
import { ListPackagesRequest } from "../../core/types/requests/list-packages-request.js";
import { ListVettedPackagesRequest } from "../../core/types/requests/list-vetted-packages-request.js";
import { GetPackageResponse } from "../../core/types/responses/get-package-response.js";
import { GetPackageStatusResponse } from "../../core/types/responses/get-package-status-response.js";
import { ListPackagesResponse } from "../../core/types/responses/list-packages-response.js";
import { ListVettedPackagesResponse } from "../../core/types/responses/list-vetted-packages-response.js";

export class PackageServiceClient {
    public constructor(private readonly transport: ITransport) {
        void this.transport;
    }

    /** Lists ledger-visible packages. Shared SDK surface; JSON may reject it. */
    public listPackagesAsync(
        request: ListPackagesRequest,
        options?: RequestOptions,
    ): Promise<ListPackagesResponse> {
        return this.transport.listPackagesAsync(request, options);
    }

    /** Reads a ledger package archive. Shared SDK surface; JSON may reject it. */
    public getPackageAsync(
        request: GetPackageRequest,
        options?: RequestOptions,
    ): Promise<GetPackageResponse> {
        return this.transport.getPackageAsync(request, options);
    }

    /** Reads ledger package registration status. Shared SDK surface; JSON may reject it. */
    public getPackageStatusAsync(
        request: GetPackageStatusRequest,
        options?: RequestOptions,
    ): Promise<GetPackageStatusResponse> {
        return this.transport.getPackageStatusAsync(request, options);
    }

    /** Lists vetted ledger packages. Shared SDK surface; JSON may reject it. */
    public listVettedPackagesAsync(
        request: ListVettedPackagesRequest,
        options?: RequestOptions,
    ): Promise<ListVettedPackagesResponse> {
        return this.transport.listVettedPackagesAsync(request, options);
    }
}
