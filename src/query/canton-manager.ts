import { CantonClient } from "../client/canton-client.js";
import { TransportKind } from "../core/types/transport-kind.js";
import { ValidationError } from "../core/errors/validation-error.js";
import { GrpcContractQueryClient } from "./grpc/grpc-contract-query-client.js";
import { PqsPool } from "./pqs/pqs-pool.js";
import { PqsQueryClient } from "./pqs/pqs-query-client.js";
import { PqsSchemaProfileV1 } from "./pqs/pqs-schema-profile.js";
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
        } else if (options.querySource === QuerySource.grpc && options.pqs !== undefined) {
            throw new ValidationError("PQS options require QuerySource.pqs.");
        } else if (options.querySource === QuerySource.pqs && options.pqs === undefined) {
            throw new ValidationError("QuerySource.pqs requires PQS options.");
        }

        this.grpc = new CantonClient(options.grpc);

        if (options.querySource === QuerySource.pqs) {
            this.pqsPool = PqsPool.create(options.pqs!.connectionString);
            this.query = new PqsQueryClient(
                this.pqsPool.pool as never,
                new PqsSchemaProfileV1(options.pqs!.schema),
            );
        } else {
            this.query = new GrpcContractQueryClient(
                this.grpc.stateService,
                options.cache?.store,
                options.cache?.ttlMs,
                options.grpc.ledgerEndpoint ?? "ledger",
            );
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
