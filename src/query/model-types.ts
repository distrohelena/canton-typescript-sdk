export type QueryOrder = "asc" | "desc";

export interface ScalarFilter<T> {
    readonly equals?: T;
    readonly in?: readonly T[];
}

export interface QueryPageArgs {
    readonly skip?: number;
    readonly take?: number;
}

export interface ContractRow {
    readonly contractId: string;
    readonly templateId: string;
    readonly packageId: string | null;
    readonly payload: unknown;
    readonly witnesses: readonly string[];
    readonly createdEventOffset: string;
    readonly createdAt: Date | null;
    readonly archivedEventOffset: string | null;
    readonly archivedAt: Date | null;
    readonly active: boolean;
}

export interface ContractWhere {
    readonly contractId?: ScalarFilter<string>;
    readonly templateId?: ScalarFilter<string>;
    readonly packageId?: ScalarFilter<string>;
    readonly active?: boolean;
    readonly witnesses?: { readonly has: string };
}

export type ContractOrderField =
    | "contractId"
    | "createdEventOffset"
    | "createdAt"
    | "archivedEventOffset"
    | "archivedAt";

export type ContractOrderBy = Partial<Record<ContractOrderField, QueryOrder>>;

export type ContractSelect = Partial<Record<keyof ContractRow, boolean>>;

export interface ContractFindManyArgs extends QueryPageArgs {
    readonly parties?: readonly string[];
    readonly where?: ContractWhere;
    readonly orderBy?: ContractOrderBy;
    readonly select?: ContractSelect;
}

export interface ContractFindUniqueArgs {
    readonly where: { readonly contractId: string };
    readonly select?: ContractSelect;
}

export interface ContractCountArgs {
    readonly parties?: readonly string[];
    readonly where?: ContractWhere;
}

export interface ContractTypeRow {
    readonly pk: string;
    readonly payloadType: string;
    readonly aliases: readonly string[];
    readonly packageName: string;
    readonly moduleName: string;
    readonly entityName: string;
    readonly templateFqn: string;
}

export interface EventRow {
    readonly pk: string;
    readonly txIx: string;
    readonly eventId: string;
    readonly type: string;
}

export interface ExerciseRow {
    readonly tpePk: string;
    readonly contractTpePk: string;
    readonly exerciseEventPk: string | null;
    readonly exercisedAtIx: string | null;
    readonly contractId: string;
    readonly argument: unknown;
    readonly result: unknown;
    readonly redactionId: string | null;
    readonly packagePk: string;
    readonly controllers: readonly string[];
    readonly lastDescendantNodeId: number;
    readonly witnesses: readonly string[];
}

export interface ExerciseTypeRow {
    readonly pk: string;
    readonly choice: string;
    readonly consuming: boolean;
    readonly aliases: readonly string[];
    readonly packageName: string;
    readonly moduleName: string;
    readonly entityName: string;
    readonly templateFqn: string;
    readonly choiceFqn: string;
}

export interface PackageRow {
    readonly pk: string;
    readonly name: string;
    readonly version: string;
    readonly id: string;
}

export interface TransactionRow {
    readonly ix: string;
    readonly offset: string;
    readonly transactionId: string | null;
    readonly effectiveAt: Date | null;
    readonly workflowId: string | null;
    readonly domainId: string | null;
    readonly traceContext: unknown;
    readonly externalTransactionHash: Uint8Array | null;
    readonly paidTrafficCost: string | null;
}

export interface WatermarkRow {
    readonly singleton: boolean;
    readonly ix: string | null;
    readonly offset: string | null;
    readonly instanceId: string | null;
}

export function assertQueryPageArgs(args: QueryPageArgs): void {
    assertPageValue(args.skip, "skip");
    assertPageValue(args.take, "take");
}

export function assertQueryOrderBy(
    orderBy: Readonly<Record<string, QueryOrder>>,
): void {
    if (Object.keys(orderBy).length !== 1) {
        throw new Error("orderBy must specify exactly one field");
    }
}

function assertPageValue(value: number | undefined, name: string): void {
    if (value !== undefined && (!Number.isInteger(value) || value < 0)) {
        throw new Error(`${name} must be a non-negative integer`);
    }
}
