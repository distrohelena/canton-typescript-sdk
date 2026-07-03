import { CantonClientOptions } from "../../client/canton-client-options.js";
import { AllocatePartyRequest } from "../../core/types/requests/allocate-party-request.js";
import { CreatePartyRequest } from "../../core/types/requests/create-party-request.js";
import { GetActiveContractsPageRequest } from "../../core/types/requests/get-active-contracts-page-request.js";
import { GetActiveContractsRequest } from "../../core/types/requests/get-active-contracts-request.js";
import { GetLedgerApiVersionRequest } from "../../core/types/requests/get-ledger-api-version-request.js";
import { GrantUserRightsRequest } from "../../core/types/requests/grant-user-rights-request.js";
import { GetUpdatesRequest } from "../../core/types/requests/get-updates-request.js";
import { ListKnownPartiesRequest } from "../../core/types/requests/list-known-parties-request.js";
import { ListPartiesRequest } from "../../core/types/requests/list-parties-request.js";
import { QueryContractsRequest } from "../../core/types/requests/query-contracts-request.js";
import { StreamQueryRequest } from "../../core/types/requests/stream-query-request.js";
import { StreamTransactionsRequest } from "../../core/types/requests/stream-transactions-request.js";
import { SubmitCommandRequest } from "../../core/types/requests/submit-command-request.js";
import { UploadDarFileRequest } from "../../core/types/requests/upload-dar-file-request.js";
import { UploadPackageRequest } from "../../core/types/requests/upload-package-request.js";
import { SignCommandResult } from "../../core/signing/sign-command-result.js";
import { AllocatePartyResponse as SdkAllocatePartyResponse } from "../../core/types/responses/allocate-party-response.js";
import { CreatePartyResponse } from "../../core/types/responses/create-party-response.js";
import { GetActiveContractsPageResponse } from "../../core/types/responses/get-active-contracts-page-response.js";
import { GetLedgerApiVersionResponse as SdkGetLedgerApiVersionResponse } from "../../core/types/responses/get-ledger-api-version-response.js";
import { GrantUserRightsResponse } from "../../core/types/responses/grant-user-rights-response.js";
import { HealthStatusResponse } from "../../core/types/responses/health-status-response.js";
import { ListKnownPartiesResponse as SdkListKnownPartiesResponse } from "../../core/types/responses/list-known-parties-response.js";
import { ListPartiesResponse } from "../../core/types/responses/list-parties-response.js";
import { QueryContractsResponse } from "../../core/types/responses/query-contracts-response.js";
import { SubmitCommandResponse } from "../../core/types/responses/submit-command-response.js";
import { UploadDarFileResponse as SdkUploadDarFileResponse } from "../../core/types/responses/upload-dar-file-response.js";
import { UploadPackageResponse } from "../../core/types/responses/upload-package-response.js";
import { NotSupportedError } from "../../core/errors/not-supported-error.js";
import { ITransport } from "../../core/transports/transport.interface.js";
import { PackageFormat } from "../../core/types/package-format.js";
import {
    createGrpcOperations,
    GrpcOperations,
} from "./grpc-channel-factory.js";
import {
    mapGrpcSubmitCommand,
    mapGrpcSubmitCommandRequest,
} from "./mappers/commands-mapper.js";
import {
    mapGrpcQueryContracts,
    mapGrpcQueryContractsRequest,
} from "./mappers/contracts-mapper.js";
import {
    mapGrpcStreamTransactionsRequest,
    mapGrpcTransactionEvents,
} from "./mappers/events-mapper.js";
import {
    mapGrpcUploadPackage,
    mapGrpcUploadPackageRequest,
} from "./mappers/packages-mapper.js";
import {
    mapGrpcCreateParty,
    mapGrpcCreatePartyRequest,
    mapGrpcListParties,
    mapGrpcListPartiesRequest,
} from "./mappers/parties-mapper.js";
import { mapGrpcHealth } from "./mappers/system-mapper.js";
import {
    mapGrpcGrantUserRights,
    mapGrpcGrantUserRightsRequest,
} from "./mappers/users-mapper.js";
import { ContractObserver } from "../../services/contracts/contract-observer.interface.js";
import { TransactionObserver } from "../../services/events/transaction-observer.interface.js";
import { UploadDarFileResponse } from "./generated/canton/com/daml/ledger/api/v2/admin/package_management_service.js";
import { AllocatePartyResponse, ListKnownPartiesResponse } from "./generated/canton/com/daml/ledger/api/v2/admin/party_management_service.js";
import { GrantUserRightsResponse as ProtobufGrantUserRightsResponse } from "./generated/canton/com/daml/ledger/api/v2/admin/user_management_service.js";
import { GetLedgerApiVersionResponse } from "./generated/canton/com/daml/ledger/api/v2/version_service.js";

export class GrpcTransport implements ITransport {
    public readonly features = {
        supportsCommandSigning: true,
    };

    public constructor(private readonly operations: GrpcOperations) {}

    public async getHealthAsync(): Promise<HealthStatusResponse> {
        const payload = await this.operations.getHealthAsync();

        return mapGrpcHealth(
            payload as { status?: string; version?: string } | GetLedgerApiVersionResponse,
        );
    }

    public async getLedgerApiVersionAsync(
        _request?: GetLedgerApiVersionRequest,
    ): Promise<SdkGetLedgerApiVersionResponse> {
        const payload = await this.operations.getHealthAsync();

        return new SdkGetLedgerApiVersionResponse({
            version: payload.version ?? "",
            features:
                "features" in payload
                    ? payload.features
                    : undefined,
        });
    }

    public async createPartyAsync(
        request: CreatePartyRequest,
    ): Promise<CreatePartyResponse> {
        const payload = await this.operations.createPartyAsync(
            mapGrpcCreatePartyRequest(request),
        );

        return mapGrpcCreateParty(
            payload as { identifier?: string } | AllocatePartyResponse,
        );
    }

    public async allocatePartyAsync(
        request: AllocatePartyRequest,
    ): Promise<SdkAllocatePartyResponse> {
        const payload = await this.operations.createPartyAsync(
            mapGrpcCreatePartyRequest(request),
        );

        const response = mapGrpcCreateParty(
            payload as { identifier?: string } | AllocatePartyResponse,
        );

        return new SdkAllocatePartyResponse({
            party: response.party,
        });
    }

    public async listPartiesAsync(
        request: ListPartiesRequest,
    ): Promise<ListPartiesResponse> {
        const payload = await this.operations.listPartiesAsync(
            mapGrpcListPartiesRequest(request),
        );

        return mapGrpcListParties(payload as ListKnownPartiesResponse);
    }

    public async listKnownPartiesAsync(
        request: ListKnownPartiesRequest,
    ): Promise<SdkListKnownPartiesResponse> {
        const payload = await this.operations.listPartiesAsync(
            mapGrpcListPartiesRequest(request),
        );

        const response = mapGrpcListParties(payload as ListKnownPartiesResponse);

        return new SdkListKnownPartiesResponse({
            partyDetails: [...response.partyDetails],
            nextPageToken: response.nextPageToken,
        });
    }

    public async grantUserRightsAsync(
        request: GrantUserRightsRequest,
    ): Promise<GrantUserRightsResponse> {
        const payload = await this.operations.grantUserRightsAsync(
            mapGrpcGrantUserRightsRequest(request),
        );

        return mapGrpcGrantUserRights(
            payload as
                | { rights?: Array<{ type: string; party?: string }> }
                | ProtobufGrantUserRightsResponse,
        );
    }

    public async uploadPackageAsync(
        request: UploadPackageRequest,
    ): Promise<UploadPackageResponse> {
        const payload = await this.operations.uploadPackageAsync(
            mapGrpcUploadPackageRequest(request),
        );

        return mapGrpcUploadPackage(
            payload as { packageId?: string } | UploadDarFileResponse,
        );
    }

    public async uploadDarFileAsync(
        request: UploadDarFileRequest,
    ): Promise<SdkUploadDarFileResponse> {
        const payload = await this.operations.uploadPackageAsync(
            mapGrpcUploadPackageRequest(
                new UploadPackageRequest({
                    bytes: request.bytes,
                    format: PackageFormat.dar,
                }),
            ),
        );

        const response = mapGrpcUploadPackage(
            payload as { packageId?: string } | UploadDarFileResponse,
        );

        return new SdkUploadDarFileResponse({
            packageId: response.packageId,
        });
    }

    public async queryContractsAsync(
        request: QueryContractsRequest,
    ): Promise<QueryContractsResponse> {
        const payload = await this.operations.queryContractsAsync(
            mapGrpcQueryContractsRequest(request),
        );

        return mapGrpcQueryContracts(payload as { contracts?: unknown[] });
    }

    public async getActiveContractsPageAsync(
        request: GetActiveContractsPageRequest,
    ): Promise<GetActiveContractsPageResponse> {
        const payload = await this.queryContractsAsync(
            new QueryContractsRequest({
                party: request.party,
                templateId: request.templateId ?? "",
            }),
        );

        return new GetActiveContractsPageResponse({
            contracts: payload.contracts,
        });
    }

    public async getActiveContractsAsync(
        _request: GetActiveContractsRequest,
        _observer: ContractObserver,
    ): Promise<void> {
        throw new NotSupportedError(
            "StateService.GetActiveContracts is not supported by gRPC transport yet",
        );
    }

    public async streamQueryAsync(
        _request: StreamQueryRequest,
        _observer: ContractObserver,
    ): Promise<void> {
        throw new NotSupportedError(
            "contract query streaming is not supported by gRPC transport",
        );
    }

    public async streamTransactionsAsync(
        request: StreamTransactionsRequest,
        observer: TransactionObserver,
    ): Promise<void> {
        const payload = await this.operations.streamTransactionsAsync(
            mapGrpcStreamTransactionsRequest(request),
        );

        const events = mapGrpcTransactionEvents(
            payload as { events?: unknown[] } | readonly unknown[],
        );

        for (const event of events) {
            await observer.nextAsync(event);
        }
    }

    public getUpdatesAsync(
        request: GetUpdatesRequest,
        observer: TransactionObserver,
    ): Promise<void> {
        return this.streamTransactionsAsync(
            new StreamTransactionsRequest({
                party: request.party,
                beginOffset: request.beginOffset,
                endOffset: request.endOffset,
                templateId: request.templateId,
            }),
            observer,
        );
    }

    public async submitCommandAsync(
        request: SubmitCommandRequest,
        signed?: SignCommandResult,
    ): Promise<SubmitCommandResponse> {
        const payload = await this.operations.submitCommandAsync(
            mapGrpcSubmitCommandRequest(request, signed),
        );

        return mapGrpcSubmitCommand(
            payload as { commandId?: string; transactionId?: string },
        );
    }
}

export function createDefaultGrpcTransport(
    options: CantonClientOptions,
): GrpcTransport {
    return new GrpcTransport(createGrpcOperations(options));
}
