import { NotSupportedError } from "../../../core/errors/not-supported-error.js";
import { HashFunction } from "../../../core/types/hash-function.js";
import { KnownPackageDetails } from "../../../core/types/known-package-details.js";
import { PackageFormat } from "../../../core/types/package-format.js";
import { PackageMetadataFilter } from "../../../core/types/package-metadata-filter.js";
import { PackageStatus } from "../../../core/types/package-status.js";
import { TopologyStateFilter } from "../../../core/types/topology-state-filter.js";
import { VettedPackage } from "../../../core/types/vetted-package.js";
import { VettedPackages } from "../../../core/types/vetted-packages.js";
import { GetPackageRequest } from "../../../core/types/requests/get-package-request.js";
import { GetPackageStatusRequest } from "../../../core/types/requests/get-package-status-request.js";
import { ListKnownPackagesRequest } from "../../../core/types/requests/list-known-packages-request.js";
import { ListPackagesRequest } from "../../../core/types/requests/list-packages-request.js";
import { ListVettedPackagesRequest } from "../../../core/types/requests/list-vetted-packages-request.js";
import { UploadPackageRequest } from "../../../core/types/requests/upload-package-request.js";
import { GetPackageResponse } from "../../../core/types/responses/get-package-response.js";
import { GetPackageStatusResponse } from "../../../core/types/responses/get-package-status-response.js";
import { ListKnownPackagesResponse } from "../../../core/types/responses/list-known-packages-response.js";
import { ListPackagesResponse } from "../../../core/types/responses/list-packages-response.js";
import { ListVettedPackagesResponse } from "../../../core/types/responses/list-vetted-packages-response.js";
import { UploadPackageResponse } from "../../../core/types/responses/upload-package-response.js";
import {
} from "../generated/canton/com/digitalasset/canton/admin/participant/v30/package_service.js";
import {
    ListKnownPackagesResponse as GrpcListKnownPackagesResponse,
    UploadDarFileRequest,
    UploadDarFileRequest_VettingChange,
    UploadDarFileResponse,
} from "../generated/canton/com/daml/ledger/api/v2/admin/package_management_service.js";
import {
    GetPackageRequest as GrpcGetPackageRequest,
    GetPackageResponse as GrpcGetPackageResponse,
    GetPackageStatusRequest as GrpcGetPackageStatusRequest,
    GetPackageStatusResponse as GrpcGetPackageStatusResponse,
    HashFunction as GrpcHashFunction,
    ListPackagesRequest as GrpcListPackagesRequest,
    ListPackagesResponse as GrpcListPackagesResponse,
    ListVettedPackagesRequest as GrpcListVettedPackagesRequest,
    ListVettedPackagesResponse as GrpcListVettedPackagesResponse,
    PackageMetadataFilter as GrpcPackageMetadataFilter,
    PackageStatus as GrpcPackageStatus,
    TopologyStateFilter as GrpcTopologyStateFilter,
} from "../generated/canton/com/daml/ledger/api/v2/package_service.js";
import {
    VettedPackage as GrpcVettedPackage,
    VettedPackages as GrpcVettedPackages,
} from "../generated/canton/com/daml/ledger/api/v2/package_reference.js";
import { Timestamp } from "../generated/canton/google/protobuf/timestamp.js";

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

export function mapGrpcListPackagesRequest(
    _request: ListPackagesRequest,
): GrpcListPackagesRequest {
    return {};
}

export function mapGrpcListKnownPackagesRequest(
    _request: ListKnownPackagesRequest,
): Record<string, never> {
    return {};
}

export function mapGrpcListKnownPackages(
    payload: Partial<GrpcListKnownPackagesResponse>,
): ListKnownPackagesResponse {
    return new ListKnownPackagesResponse({
        packageDetails: (payload.packageDetails ?? []).map(
            item =>
                new KnownPackageDetails({
                    packageId: item.packageId,
                    packageSize: item.packageSize,
                    knownSince: mapGrpcTimestamp(item.knownSince),
                    name: item.name,
                    version: item.version,
                }),
        ),
    });
}

export function mapGrpcListPackages(
    payload: Partial<GrpcListPackagesResponse>,
): ListPackagesResponse {
    return new ListPackagesResponse({
        packageIds: [...(payload.packageIds ?? [])],
    });
}

export function mapGrpcGetPackageRequest(
    request: GetPackageRequest,
): GrpcGetPackageRequest {
    return {
        packageId: request.packageId,
    };
}

export function mapGrpcGetPackage(
    payload: Partial<GrpcGetPackageResponse>,
): GetPackageResponse {
    return new GetPackageResponse({
        hashFunction: mapGrpcHashFunction(payload.hashFunction),
        archivePayload: payload.archivePayload ?? new Uint8Array(),
        hash: payload.hash ?? "",
    });
}

export function mapGrpcGetPackageStatusRequest(
    request: GetPackageStatusRequest,
): GrpcGetPackageStatusRequest {
    return {
        packageId: request.packageId,
    };
}

export function mapGrpcGetPackageStatus(
    payload: Partial<GrpcGetPackageStatusResponse>,
): GetPackageStatusResponse {
    return new GetPackageStatusResponse({
        packageStatus: mapGrpcPackageStatus(payload.packageStatus),
    });
}

export function mapGrpcListVettedPackagesRequest(
    request: ListVettedPackagesRequest,
): GrpcListVettedPackagesRequest {
    return {
        packageMetadataFilter: mapGrpcPackageMetadataFilter(
            request.packageMetadataFilter,
        ),
        topologyStateFilter: mapGrpcTopologyStateFilter(
            request.topologyStateFilter,
        ),
        pageToken: request.pageToken ?? "",
        pageSize: request.pageSize ?? 0,
    };
}

export function mapGrpcListVettedPackages(
    payload: Partial<GrpcListVettedPackagesResponse>,
): ListVettedPackagesResponse {
    return new ListVettedPackagesResponse({
        vettedPackages: (payload.vettedPackages ?? []).map(mapGrpcVettedPackages),
        nextPageToken: payload.nextPageToken || undefined,
    });
}

function mapGrpcHashFunction(
    value: GrpcHashFunction | undefined,
): HashFunction {
    switch (value) {
        case GrpcHashFunction.SHA256:
        default:
            return HashFunction.sha256;
    }
}

function mapGrpcPackageStatus(
    value: GrpcPackageStatus | undefined,
): PackageStatus {
    switch (value) {
        case GrpcPackageStatus.REGISTERED:
            return PackageStatus.registered;
        case GrpcPackageStatus.UNSPECIFIED:
        default:
            return PackageStatus.unspecified;
    }
}

function mapGrpcPackageMetadataFilter(
    filter?: PackageMetadataFilter,
): GrpcPackageMetadataFilter | undefined {
    if (filter === undefined) {
        return undefined;
    }

    return {
        packageIds: [...filter.packageIds],
        packageNamePrefixes: [...filter.packageNamePrefixes],
    };
}

function mapGrpcTopologyStateFilter(
    filter?: TopologyStateFilter,
): GrpcTopologyStateFilter | undefined {
    if (filter === undefined) {
        return undefined;
    }

    return {
        participantIds: [...filter.participantIds],
        synchronizerIds: [...filter.synchronizerIds],
    };
}

function mapGrpcVettedPackages(
    payload: GrpcVettedPackages,
): VettedPackages {
    return new VettedPackages({
        packages: payload.packages.map(mapGrpcVettedPackage),
        participantId: payload.participantId,
        synchronizerId: payload.synchronizerId,
        topologySerial: payload.topologySerial,
    });
}

function mapGrpcVettedPackage(
    payload: GrpcVettedPackage,
): VettedPackage {
    return new VettedPackage({
        packageId: payload.packageId,
        validFromInclusive: mapGrpcTimestamp(payload.validFromInclusive),
        validUntilExclusive: mapGrpcTimestamp(payload.validUntilExclusive),
        packageName: payload.packageName || undefined,
        packageVersion: payload.packageVersion || undefined,
    });
}

function mapGrpcTimestamp(timestamp?: Timestamp): Date | undefined {
    if (timestamp === undefined) {
        return undefined;
    }

    const seconds =
        typeof timestamp.seconds === "string"
            ? Number(timestamp.seconds)
            : timestamp.seconds;

    if (!Number.isFinite(seconds)) {
        return undefined;
    }

    const milliseconds = seconds * 1_000 + Math.floor(timestamp.nanos / 1_000_000);

    return new Date(milliseconds);
}
