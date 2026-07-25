import { ITransport } from "../../core/transports/transport.interface.js";
import { RequestOptions } from "../../core/types/request-options.js";
import type {
    GetDarContentsRequest,
    GetDarContentsResponse,
    GetDarRequest,
    GetDarResponse,
    GetPackageContentsRequest,
    GetPackageContentsResponse,
    GetPackageReferencesRequest,
    GetPackageReferencesResponse,
    ListDarsRequest,
    ListDarsResponse,
    ListPackagesRequest as ParticipantListPackagesRequest,
    ListPackagesResponse as ParticipantListPackagesResponse,
} from "../../transports/grpc/generated/canton/com/digitalasset/canton/admin/participant/v30/package_service.js";

export class ParticipantPackageServiceClient {
    public constructor(private readonly transport: ITransport) {
        void this.transport;
    }

    /** Lists participant-local packages. Shared SDK surface; JSON may reject it. */
    public listPackagesAsync(
        request: ParticipantListPackagesRequest,
        options?: RequestOptions,
    ): Promise<ParticipantListPackagesResponse> {
        return this.transport.listParticipantPackagesAsync(request, options);
    }

    /** Reads participant-local package contents. Shared SDK surface; JSON may reject it. */
    public getPackageContentsAsync(
        request: GetPackageContentsRequest,
        options?: RequestOptions,
    ): Promise<GetPackageContentsResponse> {
        return this.transport.getParticipantPackageContentsAsync(
            request,
            options,
        );
    }

    /** Reads participant package references. Shared SDK surface; JSON may reject it. */
    public getPackageReferencesAsync(
        request: GetPackageReferencesRequest,
        options?: RequestOptions,
    ): Promise<GetPackageReferencesResponse> {
        return this.transport.getParticipantPackageReferencesAsync(
            request,
            options,
        );
    }

    /** Reads a participant-local DAR archive. Supported on gRPC; JSON rejects it. */
    public getDarAsync(
        request: GetDarRequest,
        options?: RequestOptions,
    ): Promise<GetDarResponse> {
        return this.transport.getParticipantDarAsync(request, options);
    }

    /** Lists participant-local DAR archives. Supported on gRPC; JSON rejects it. */
    public listDarsAsync(
        request: ListDarsRequest,
        options?: RequestOptions,
    ): Promise<ListDarsResponse> {
        return this.transport.listParticipantDarsAsync(request, options);
    }

    /** Reads participant-local DAR contents. Supported on gRPC; JSON rejects it. */
    public getDarContentsAsync(
        request: GetDarContentsRequest,
        options?: RequestOptions,
    ): Promise<GetDarContentsResponse> {
        return this.transport.getParticipantDarContentsAsync(request, options);
    }
}
