import { Pool } from "pg";

export interface PqsPoolLike {
    query(text: string, values: readonly unknown[]): Promise<{ readonly rows: readonly Record<string, unknown>[] }>;
    end(): Promise<void>;
}

export class PqsPool {
    private disposed = false;

    public constructor(public readonly pool: PqsPoolLike) {}

    public static create(connectionString: string): PqsPool {
        return new PqsPool(new Pool({ connectionString }));
    }

    public async disposeAsync(): Promise<void> {
        if (this.disposed) {
            return;
        }

        this.disposed = true;
        await this.pool.end();
    }
}
