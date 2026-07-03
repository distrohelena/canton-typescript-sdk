import { CreatePartyRequest } from "../../core/types/requests/create-party-request.js";
import {
    GrantUserRightsRequest,
    UserRightAssignment,
} from "../../core/types/requests/grant-user-rights-request.js";
import { ListPartiesRequest } from "../../core/types/requests/list-parties-request.js";
import { QueryContractsRequest } from "../../core/types/requests/query-contracts-request.js";
import { StreamTransactionsRequest } from "../../core/types/requests/stream-transactions-request.js";
import { SubmitCommandRequest } from "../../core/types/requests/submit-command-request.js";
import { UploadPackageRequest } from "../../core/types/requests/upload-package-request.js";
import { SignCommandResult } from "../../core/signing/sign-command-result.js";
import { CreatePartyResponse } from "../../core/types/responses/create-party-response.js";
import { GrantUserRightsResponse } from "../../core/types/responses/grant-user-rights-response.js";
import { HealthStatusResponse } from "../../core/types/responses/health-status-response.js";
import { ListPartiesResponse } from "../../core/types/responses/list-parties-response.js";
import { QueryContractsResponse } from "../../core/types/responses/query-contracts-response.js";
import { SubmitCommandResponse } from "../../core/types/responses/submit-command-response.js";
import { UploadPackageResponse } from "../../core/types/responses/upload-package-response.js";
import { NotSupportedError } from "../../core/errors/not-supported-error.js";
import { ITransport } from "../../core/transports/transport.interface.js";
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

    public async queryContractsAsync(
        request: QueryContractsRequest,
    ): Promise<QueryContractsResponse> {
        const payload = await this.httpClient.postAsync("/v1/query", {
            templateIds: [request.templateId],
        });

        return mapJsonQueryContracts(payload as { result?: unknown[] });
    }

    public async streamTransactionsAsync(
        _request: StreamTransactionsRequest,
        observer: TransactionObserver,
    ): Promise<void> {
        const payload = await this.httpClient.postAsync("/v1/stream/query", {});

        const events = mapJsonTransactionEvents(
            payload as { events?: unknown[] },
        );

        for (const event of events) {
            await observer.nextAsync(event);
        }
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
            applicationId: request.applicationId,
            actAs: request.actAs,
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
