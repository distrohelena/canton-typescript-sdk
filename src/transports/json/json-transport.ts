import { AllocatePartyRequest } from "../../core/types/requests/allocate-party-request.js";
import { GetActiveContractsPageRequest } from "../../core/types/requests/get-active-contracts-page-request.js";
import { GetActiveContractsRequest } from "../../core/types/requests/get-active-contracts-request.js";
import { GetLedgerApiVersionRequest } from "../../core/types/requests/get-ledger-api-version-request.js";
import {
    GrantUserRightsRequest,
    UserRightAssignment,
} from "../../core/types/requests/grant-user-rights-request.js";
import { GetUpdatesRequest } from "../../core/types/requests/get-updates-request.js";
import { ListKnownPartiesRequest } from "../../core/types/requests/list-known-parties-request.js";
import { SubmitCommandRequest } from "../../core/types/requests/submit-command-request.js";
import { UploadDarFileRequest } from "../../core/types/requests/upload-dar-file-request.js";
import { SignCommandResult } from "../../core/signing/sign-command-result.js";
import { AllocatePartyResponse } from "../../core/types/responses/allocate-party-response.js";
import { GetActiveContractsPageResponse } from "../../core/types/responses/get-active-contracts-page-response.js";
import { GetLedgerApiVersionResponse } from "../../core/types/responses/get-ledger-api-version-response.js";
import { GrantUserRightsResponse } from "../../core/types/responses/grant-user-rights-response.js";
import { ListKnownPartiesResponse } from "../../core/types/responses/list-known-parties-response.js";
import { SubmitCommandResponse } from "../../core/types/responses/submit-command-response.js";
import { UploadDarFileResponse } from "../../core/types/responses/upload-dar-file-response.js";
import { NotSupportedError } from "../../core/errors/not-supported-error.js";
import { ITransport } from "../../core/transports/transport.interface.js";
import { mapJsonSubmitCommand } from "./mappers/commands-mapper.js";
import { mapJsonUploadPackage } from "./mappers/packages-mapper.js";
import { mapJsonCreateParty, mapJsonListParties } from "./mappers/parties-mapper.js";
import { mapJsonQueryContracts } from "./mappers/contracts-mapper.js";
import { mapJsonTransactionEvents } from "./mappers/events-mapper.js";
import { mapJsonGrantRights } from "./mappers/users-mapper.js";
import { IJsonHttpClient } from "./json-http-client.js";
import { ContractObserver } from "../../services/contracts/contract-observer.interface.js";
import { TransactionObserver } from "../../services/events/transaction-observer.interface.js";

export class JsonTransport implements ITransport {
    public readonly features = {
        supportsCommandSigning: false,
    };

    public constructor(private readonly httpClient: IJsonHttpClient) {}

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

    public async listKnownPartiesAsync(
        request: ListKnownPartiesRequest,
    ): Promise<ListKnownPartiesResponse> {
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

        const response = mapJsonListParties(
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

        return new ListKnownPartiesResponse({
            partyDetails: [...response.partyDetails],
            nextPageToken: response.nextPageToken,
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

    public async uploadDarFileAsync(
        request: UploadDarFileRequest,
    ): Promise<UploadDarFileResponse> {
        const payload = await this.httpClient.postAsync("/v1/packages", {
            format: "dar",
            bytes: Array.from(request.bytes),
        });

        const response = mapJsonUploadPackage(
            payload as { result?: { packageId?: string }; packageId?: string },
        );

        return new UploadDarFileResponse({
            packageId: response.packageId,
        });
    }

    public async getActiveContractsPageAsync(
        request: GetActiveContractsPageRequest,
    ): Promise<GetActiveContractsPageResponse> {
        const payload = await this.httpClient.postAsync("/v1/query", {
            templateIds: request.templateId ? [request.templateId] : [],
        });

        const response = mapJsonQueryContracts(payload as { result?: unknown[] });

        return new GetActiveContractsPageResponse({
            contracts: response.contracts,
        });
    }

    public async getActiveContractsAsync(
        request: GetActiveContractsRequest,
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
