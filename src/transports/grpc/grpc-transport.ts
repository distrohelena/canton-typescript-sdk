import { CreatePartyRequest } from "../../core/types/requests/create-party-request.js";
import { GrantUserRightsRequest } from "../../core/types/requests/grant-user-rights-request.js";
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
import { ITransport } from "../../core/transports/transport.interface.js";
import {
    createGrpcOperations,
    GrpcOperations,
} from "./grpc-channel-factory.js";
import {
    mapGrpcSubmitCommand,
    mapGrpcSubmitCommandRequest,
} from "./mappers/commands-mapper.js";
import { mapGrpcQueryContracts } from "./mappers/contracts-mapper.js";
import { mapGrpcTransactionEvents } from "./mappers/events-mapper.js";
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
import { TransactionObserver } from "../../services/events/transaction-observer.interface.js";
import { ListKnownPartiesResponse } from "./generated/canton/com/daml/ledger/api/v2/admin/party_management_service.js";

export class GrpcTransport implements ITransport {
    public readonly features = {
        supportsCommandSigning: true,
    };

    public constructor(private readonly operations: GrpcOperations) {}

    public async getHealthAsync(): Promise<HealthStatusResponse> {
        const payload = await this.operations.getHealthAsync();

        return mapGrpcHealth(payload as { status?: string; version?: string });
    }

    public async createPartyAsync(
        request: CreatePartyRequest,
    ): Promise<CreatePartyResponse> {
        const payload = await this.operations.createPartyAsync(
            mapGrpcCreatePartyRequest(request),
        );

        return mapGrpcCreateParty(payload as { identifier?: string });
    }

    public async listPartiesAsync(
        request: ListPartiesRequest,
    ): Promise<ListPartiesResponse> {
        const payload = await this.operations.listPartiesAsync(
            mapGrpcListPartiesRequest(request),
        );

        return mapGrpcListParties(payload as ListKnownPartiesResponse);
    }

    public async grantUserRightsAsync(
        request: GrantUserRightsRequest,
    ): Promise<GrantUserRightsResponse> {
        const payload = await this.operations.grantUserRightsAsync(
            mapGrpcGrantUserRightsRequest(request),
        );

        return mapGrpcGrantUserRights(
            payload as { rights?: Array<{ type: string; party?: string }> },
        );
    }

    public async uploadPackageAsync(
        request: UploadPackageRequest,
    ): Promise<UploadPackageResponse> {
        const payload = await this.operations.uploadPackageAsync(
            mapGrpcUploadPackageRequest(request),
        );

        return mapGrpcUploadPackage(payload as { packageId?: string });
    }

    public async queryContractsAsync(
        request: QueryContractsRequest,
    ): Promise<QueryContractsResponse> {
        const payload = await this.operations.queryContractsAsync({
            templateId: request.templateId,
        });

        return mapGrpcQueryContracts(payload as { contracts?: unknown[] });
    }

    public async streamTransactionsAsync(
        _request: StreamTransactionsRequest,
        observer: TransactionObserver,
    ): Promise<void> {
        const payload = await this.operations.streamTransactionsAsync({});

        const events = mapGrpcTransactionEvents(
            payload as { events?: unknown[] } | readonly unknown[],
        );

        for (const event of events) {
            await observer.nextAsync(event);
        }
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

export function createDefaultGrpcTransport(endpoint: string): GrpcTransport {
    return new GrpcTransport(createGrpcOperations(endpoint));
}
