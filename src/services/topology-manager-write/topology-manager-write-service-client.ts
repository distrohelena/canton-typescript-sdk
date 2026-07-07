import { ITransport } from "../../core/transports/transport.interface.js";
import { RequestOptions } from "../../core/types/request-options.js";
import { AddTopologyTransactionsRequest } from "../../core/types/requests/add-topology-transactions-request.js";
import { AssembleSignedTopologyTransactionsRequest } from "../../core/types/requests/assemble-signed-topology-transactions-request.js";
import { AuthorizeTopologyTransactionsRequest } from "../../core/types/requests/authorize-topology-transactions-request.js";
import { CreateTemporaryTopologyStoreRequest } from "../../core/types/requests/create-temporary-topology-store-request.js";
import { DropTemporaryTopologyStoreRequest } from "../../core/types/requests/drop-temporary-topology-store-request.js";
import { GenerateTopologyTransactionsRequest } from "../../core/types/requests/generate-topology-transactions-request.js";
import { ImportTopologySnapshotRequest } from "../../core/types/requests/import-topology-snapshot-request.js";
import { ImportTopologySnapshotV2Request } from "../../core/types/requests/import-topology-snapshot-v2-request.js";
import { SignTopologyTransactionsRequest } from "../../core/types/requests/sign-topology-transactions-request.js";
import { AddTopologyTransactionsResponse } from "../../core/types/responses/add-topology-transactions-response.js";
import { AuthorizeTopologyTransactionsResponse } from "../../core/types/responses/authorize-topology-transactions-response.js";
import { CreateTemporaryTopologyStoreResponse } from "../../core/types/responses/create-temporary-topology-store-response.js";
import { DropTemporaryTopologyStoreResponse } from "../../core/types/responses/drop-temporary-topology-store-response.js";
import { GenerateTopologyTransactionsResponse } from "../../core/types/responses/generate-topology-transactions-response.js";
import { ImportTopologySnapshotResponse } from "../../core/types/responses/import-topology-snapshot-response.js";
import { ImportTopologySnapshotV2Response } from "../../core/types/responses/import-topology-snapshot-v2-response.js";
import { SignTopologyTransactionsResponse } from "../../core/types/responses/sign-topology-transactions-response.js";
import { SignedTopologyTransaction } from "../../core/types/topology/signed-topology-transaction.js";
import { assembleSignedTopologyTransactions } from "./topology-signed-transaction-assembler.js";

export class TopologyManagerWriteServiceClient {
    public constructor(private readonly transport: ITransport) {
        void this.transport;
    }

    /** Authorizes topology transactions. Supported on gRPC; JSON rejects it. */
    public authorizeAsync(
        request: AuthorizeTopologyTransactionsRequest,
        options?: RequestOptions,
    ): Promise<AuthorizeTopologyTransactionsResponse> {
        return this.transport.authorizeTopologyTransactionsAsync(
            request,
            options,
        );
    }

    /** Adds topology transactions to a topology store. Supported on gRPC; JSON rejects it. */
    public addTransactionsAsync(
        request: AddTopologyTransactionsRequest,
        options?: RequestOptions,
    ): Promise<AddTopologyTransactionsResponse> {
        return this.transport.addTopologyTransactionsAsync(request, options);
    }

    /** Imports a serialized topology snapshot. Supported on gRPC; JSON rejects it. */
    public importTopologySnapshotAsync(
        request: ImportTopologySnapshotRequest,
        options?: RequestOptions,
    ): Promise<ImportTopologySnapshotResponse> {
        return this.transport.importTopologySnapshotAsync(request, options);
    }

    /** Imports a serialized topology snapshot using the V2 RPC. Supported on gRPC; JSON rejects it. */
    public importTopologySnapshotV2Async(
        request: ImportTopologySnapshotV2Request,
        options?: RequestOptions,
    ): Promise<ImportTopologySnapshotV2Response> {
        return this.transport.importTopologySnapshotV2Async(request, options);
    }

    /** Adds local signatures to topology transactions. Supported on gRPC; JSON rejects it. */
    public signTransactionsAsync(
        request: SignTopologyTransactionsRequest,
        options?: RequestOptions,
    ): Promise<SignTopologyTransactionsResponse> {
        return this.transport.signTopologyTransactionsAsync(request, options);
    }

    /** Generates topology transactions from raw proposals. Supported on gRPC; JSON rejects it. */
    public generateTransactionsAsync(
        request: GenerateTopologyTransactionsRequest,
        options?: RequestOptions,
    ): Promise<GenerateTopologyTransactionsResponse> {
        return this.transport.generateTopologyTransactionsAsync(
            request,
            options,
        );
    }

    /** Creates a temporary topology store. Supported on gRPC; JSON rejects it. */
    public createTemporaryTopologyStoreAsync(
        request: CreateTemporaryTopologyStoreRequest,
        options?: RequestOptions,
    ): Promise<CreateTemporaryTopologyStoreResponse> {
        return this.transport.createTemporaryTopologyStoreAsync(
            request,
            options,
        );
    }

    /** Drops a temporary topology store. Supported on gRPC; JSON rejects it. */
    public dropTemporaryTopologyStoreAsync(
        request: DropTemporaryTopologyStoreRequest,
        options?: RequestOptions,
    ): Promise<DropTemporaryTopologyStoreResponse> {
        return this.transport.dropTemporaryTopologyStoreAsync(request, options);
    }

    /** Assembles SDK-owned signed topology transactions from detached signatures. SDK-local; transport independent. */
    public assembleSignedTransactions(
        request: AssembleSignedTopologyTransactionsRequest,
    ): SignedTopologyTransaction[] {
        return assembleSignedTopologyTransactions(request);
    }
}
