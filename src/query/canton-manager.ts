import { CantonClient } from "../client/canton-client.js";
import { TransportKind } from "../core/types/transport-kind.js";
import { ValidationError } from "../core/errors/validation-error.js";
import { GrpcQueryClient } from "./grpc/grpc-query-client.js";
import { GrpcContractCache } from "./grpc/grpc-contract-cache.js";
import { PqsPool } from "./pqs/pqs-pool.js";
import { PqsQueryClient } from "./pqs/pqs-query-client.js";
import { PqsSchemaProfileV1, validatePqsSchemaAsync } from "./pqs/pqs-schema-profile.js";
import { CantonManagerOptions } from "./canton-manager-options.js";
import { QueryClient } from "./query-client.js";
import { QuerySource } from "./query-source.js";

export class CantonManager {
    public readonly grpc: CantonClient;
    public readonly query: QueryClient;
    private readonly pqsPool?: PqsPool;
    private disposed = false;

    public constructor(options: CantonManagerOptions) {
        if (options.grpc.transportKind !== TransportKind.grpc) {
            throw new ValidationError("CantonManager requires grpc transport for writes.");
        } else if (options.querySource === QuerySource.pqs && options.pqs === undefined) {
            throw new ValidationError("QuerySource.pqs requires PQS options.");
        } else if (options.cache !== undefined && (!Number.isFinite(options.cache.ttlMs) || options.cache.ttlMs <= 0)) {
            throw new ValidationError("CantonManager cache ttlMs must be a positive finite number.");
        }

        this.grpc = new CantonClient(options.grpc);

        if (options.querySource === QuerySource.pqs) {
            this.pqsPool = PqsPool.create(options.pqs!.connectionString);

            const profile = new PqsSchemaProfileV1(options.pqs!.schema);

            this.query = new PqsQueryClient(
                this.pqsPool.pool,
                profile,
                validatePqsSchemaAsync(this.pqsPool.pool, profile),
            );
        } else {
            this.query = new GrpcQueryClient({
                stateService: this.grpc.stateService,
                updateService: this.grpc.updateService,
                packageService: this.grpc.packageService,
                endpointScope: options.grpc.ledgerEndpoint ?? "ledger",
                incrementalHistory: options.incrementalHistory,
                contractCache: options.cache === undefined
                    ? undefined
                    : new GrpcContractCache(
                        this.grpc.stateService,
                        options.cache.store,
                        options.cache.ttlMs,
                        options.grpc.ledgerEndpoint ?? "ledger",
                        undefined,
                        options.cache.maxPageSize,
                        this.grpc.updateService,
                        { enabled: options.cache.betaDeltaRefresh, maxOffsetGap: options.cache.maxDeltaOffsetGap, maxUpdates: options.cache.maxDeltaUpdates },
                    ),
            });
        }
    }

    public async disposeAsync(): Promise<void> {
        if (this.disposed) {
            return;
        }

        this.disposed = true;
        await this.pqsPool?.disposeAsync();
        await this.grpc.disposeAsync();
    }
}
