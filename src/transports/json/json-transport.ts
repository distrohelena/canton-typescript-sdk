import { AllocatePartyRequest } from "../../core/types/requests/allocate-party-request.js";
import { CreatePartyRequest } from "../../core/types/requests/create-party-request.js";
import { GetActiveContractsPageRequest } from "../../core/types/requests/get-active-contracts-page-request.js";
import { GetActiveContractsRequest } from "../../core/types/requests/get-active-contracts-request.js";
import { GetLedgerApiVersionRequest } from "../../core/types/requests/get-ledger-api-version-request.js";
import {
    GrantUserRightsRequest,
    UserRightAssignment,
} from "../../core/types/requests/grant-user-rights-request.js";
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
import { AllocatePartyResponse } from "../../core/types/responses/allocate-party-response.js";
import { CreatePartyResponse } from "../../core/types/responses/create-party-response.js";
import { GetActiveContractsPageResponse } from "../../core/types/responses/get-active-contracts-page-response.js";
import { GetLedgerApiVersionResponse } from "../../core/types/responses/get-ledger-api-version-response.js";
import { GrantUserRightsResponse } from "../../core/types/responses/grant-user-rights-response.js";
import { HealthStatusResponse } from "../../core/types/responses/health-status-response.js";
import { ListKnownPartiesResponse } from "../../core/types/responses/list-known-parties-response.js";
import { ListPartiesResponse } from "../../core/types/responses/list-parties-response.js";
import { QueryContractsResponse } from "../../core/types/responses/query-contracts-response.js";
import { SubmitCommandResponse } from "../../core/types/responses/submit-command-response.js";
import { UploadDarFileResponse } from "../../core/types/responses/upload-dar-file-response.js";
import { UploadPackageResponse } from "../../core/types/responses/upload-package-response.js";
import { NotSupportedError } from "../../core/errors/not-supported-error.js";
import { ITransport } from "../../core/transports/transport.interface.js";
import { PackageFormat } from "../../core/types/package-format.js";
import { mapJsonSubmitCommand } from "./mappers/commands-mapper.js";
import { mapJsonUploadPackage } from "./mappers/packages-mapper.js";
import {
    mapJsonCreateParty,
    mapJsonListParties,
} from "./mappers/parties-mapper.js";
import { mapJsonQueryContracts } from "./mappers/contracts-mapper.js";
import { mapJsonTransactionEvents } from "./mappers/events-mapper.js";
import { mapJsonHealth } from "./mappers/system-mapper.js";
import { mapJsonGrantRights } from "./mappers/users-mapper.js";
import { IJsonHttpClient } from "./json-http-client.js";
import { ContractObserver } from "../../services/contracts/contract-observer.interface.js";
import { TransactionObserver } from "../../services/events/transaction-observer.interface.js";

export class JsonTransport implements ITransport {
    public readonly features = {
        supportsCommandSigning: false,
    };

    public constructor(private readonly httpClient: IJsonHttpClient) {}

    public async getHealthAsync(): Promise<HealthStatusResponse> {
        const payload = await this.httpClient.getAsync("/livez");

        return mapJsonHealth(payload as { status?: string; version?: string });
    }

    public async getLedgerApiVersionAsync(
        _request?: GetLedgerApiVersionRequest,
    ): Promise<GetLedgerApiVersionResponse> {
        const payload = await this.httpClient.getAsync("/livez");

        return new GetLedgerApiVersionResponse({
            version:
                (payload as { version?: string }).version
                ?? "unknown",
        });
    }

    public async createPartyAsync(
        request: CreatePartyRequest,
    ): Promise<CreatePartyResponse> {
        const payload = await this.httpClient.postAsync(
            "/v1/parties/allocate",
            {
                identifierHint: request.partyIdHint,
                displayName: request.displayName,
            },
        );

        return mapJsonCreateParty(
            payload as {
                result?: { identifier?: string };
                identifier?: string;
            },
        );
    }

    public async allocatePartyAsync(
        request: AllocatePartyRequest,
    ): Promise<AllocatePartyResponse> {
        const payload = await this.httpClient.postAsync(
            "/v1/parties/allocate",
            {
                identifierHint: request.partyIdHint,
                displayName: request.displayName,
            },
        );

        const response = mapJsonCreateParty(
            payload as {
                result?: { identifier?: string };
                identifier?: string;
            },
        );

        return new AllocatePartyResponse({
            party: response.party,
        });
    }

    public async listPartiesAsync(
        request: ListPartiesRequest,
    ): Promise<ListPartiesResponse> {
        const query = new URLSearchParams();

        if (request.identityProviderId) {
            query.set("identity-provider-id", request.identityProviderId);
        }

        if (request.filterParty) {
            query.set("filter-party", request.filterParty);
        }

        if (request.pageSize !== undefined) {
            query.set("pageSize", request.pageSize.toString());
        }

        if (request.pageToken) {
            query.set("pageToken", request.pageToken);
        }

        const path =
            query.size === 0 ? "/v2/parties" : `/v2/parties?${query.toString()}`;

        const payload = await this.httpClient.getAsync(path);

        return mapJsonListParties(
            payload as {
                partyDetails?: Array<{
                    party?: string;
                    isLocal?: boolean;
                    localMetadata?: { attributes?: Record<string, string> };
                    identityProviderId?: string;
                }>;
                nextPageToken?: string;
            },
        );
    }

    public async listKnownPartiesAsync(
        request: ListKnownPartiesRequest,
    ): Promise<ListKnownPartiesResponse> {
        const payload = await this.listPartiesAsync(
            new ListPartiesRequest({
                identityProviderId: request.identityProviderId,
                filterParty: request.filterParty,
                pageSize: request.pageSize,
                pageToken: request.pageToken,
            }),
        );

        return new ListKnownPartiesResponse({
            partyDetails: [...payload.partyDetails],
            nextPageToken: payload.nextPageToken,
        });
    }

    public async grantUserRightsAsync(
        request: GrantUserRightsRequest,
    ): Promise<GrantUserRightsResponse> {
        const payload = await this.httpClient.postAsync(
            "/v1/user/rights/grant",
            {
                userId: request.userId,
                rights: request.rights.map((right: UserRightAssignment) => ({
                    type: right.type,
                    party: right.party,
                })),
            },
        );

        return mapJsonGrantRights(
            payload as { result?: Array<{ type: string; party?: string }> },
        );
    }

    public async uploadPackageAsync(
        request: UploadPackageRequest,
    ): Promise<UploadPackageResponse> {
        const payload = await this.httpClient.postAsync("/v1/packages", {
            format: request.format,
            bytes: Array.from(request.bytes),
        });

        return mapJsonUploadPackage(
            payload as { result?: { packageId?: string }; packageId?: string },
        );
    }

    public async uploadDarFileAsync(
        request: UploadDarFileRequest,
    ): Promise<UploadDarFileResponse> {
        const payload = await this.uploadPackageAsync(
            new UploadPackageRequest({
                bytes: request.bytes,
                format: PackageFormat.dar,
            }),
        );

        return new UploadDarFileResponse({
            packageId: payload.packageId,
        });
    }

    public async queryContractsAsync(
        request: QueryContractsRequest,
    ): Promise<QueryContractsResponse> {
        const payload = await this.httpClient.postAsync("/v1/query", {
            templateIds: [request.templateId],
        });

        return mapJsonQueryContracts(payload as { result?: unknown[] });
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

    public getActiveContractsAsync(
        request: GetActiveContractsRequest,
        observer: ContractObserver,
    ): Promise<void> {
        return this.streamQueryAsync(
            new StreamQueryRequest({
                party: request.party,
                templateId: request.templateId,
            }),
            observer,
        );
    }

    public async streamQueryAsync(
        request: StreamQueryRequest,
        observer: ContractObserver,
    ): Promise<void> {
        const payload = await this.httpClient.postAsync("/v1/stream/query", {
            party: request.party,
            templateIds: request.templateId ? [request.templateId] : [],
        });

        const events = mapJsonTransactionEvents(
            payload as { events?: unknown[] },
        );

        for (const event of events) {
            await observer.nextAsync(event);
        }
    }

    public async streamTransactionsAsync(
        _request: StreamTransactionsRequest,
        _observer: TransactionObserver,
    ): Promise<void> {
        throw new NotSupportedError(
            "ledger update streaming is gRPC-only; JSON supports streamQueryAsync instead",
        );
    }

    public async getUpdatesAsync(
        _request: GetUpdatesRequest,
        _observer: TransactionObserver,
    ): Promise<void> {
        throw new NotSupportedError(
            "UpdateService.GetUpdates is gRPC-only; JSON supports StateService.getActiveContractsAsync instead",
        );
    }

    public async submitCommandAsync(
        request: SubmitCommandRequest,
        signed?: SignCommandResult,
    ): Promise<SubmitCommandResponse> {
        if (signed) {
            throw new NotSupportedError(
                "command signing is not supported by json transport",
            );
        }

        const payload = await this.httpClient.postAsync("/v1/create", {
            templateId: request.command.templateId,
            payload: request.command.payload,
            applicationId: request.applicationId,
            actAs: request.actAs,
            readAs: request.readAs,
        });

        return mapJsonSubmitCommand(
            payload as {
                result?: { commandId?: string; transactionId?: string };
                commandId?: string;
                transactionId?: string;
            },
        );
    }
}
