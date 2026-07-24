export type QueryOrder = "asc" | "desc";

export interface ScalarFilter<T> {
    readonly equals?: T;
    readonly in?: readonly T[];
    readonly is?: null;
    readonly isNot?: null;
}

export interface OrderedFilter<T> extends ScalarFilter<T> {
    readonly lt?: T;
    readonly lte?: T;
    readonly gt?: T;
    readonly gte?: T;
}

export interface StringFilter extends OrderedFilter<string> {
    readonly like?: string;
    readonly ilike?: string;
}

export interface ArrayMembershipFilter {
    readonly has: string;
}

export type WhereExpression<TFields> = TFields & {
    readonly and?: readonly WhereExpression<TFields>[];
    readonly or?: readonly WhereExpression<TFields>[];
    readonly not?: WhereExpression<TFields>;
};

export type RowWhere<TRow, TOrdered extends keyof TRow = never, TPattern extends keyof TRow = never> = WhereExpression<Partial<{
    readonly [TField in keyof TRow]: TRow[TField] extends readonly string[]
        ? ScalarFilter<TRow[TField]> | ArrayMembershipFilter
        : TField extends TPattern ? StringFilter
        : TField extends TOrdered ? OrderedFilter<TRow[TField]>
        : ScalarFilter<TRow[TField]>;
}>>;

export type RowSelect<TRow> = Partial<Record<keyof TRow, boolean>>;

export type RowOrderBy<TRow> = Partial<Record<keyof TRow, QueryOrder>>;

export interface QueryPageArgs {
    readonly skip?: number;
    readonly take?: number;
}

export interface ContractRow {
    readonly contractId: string;
    readonly templateId: TemplateId;
    readonly packageId: string | null;
    readonly payload: unknown;
    readonly witnesses: readonly string[];
    readonly createdEventOffset: string;
    readonly createdAt: Date | null;
    readonly archivedEventOffset: string | null;
    readonly archivedAt: Date | null;
    readonly active: boolean;
}

export interface TemplateId {
    readonly packageId: string;
    readonly moduleName: string;
    readonly entityName: string;
}

type PayloadValueFilter =
    | { readonly equals: string; readonly lt?: never; readonly lte?: never; readonly gt?: never; readonly gte?: never; readonly like?: never; readonly ilike?: never }
    | { readonly lt: string; readonly equals?: never; readonly lte?: never; readonly gt?: never; readonly gte?: never; readonly like?: never; readonly ilike?: never }
    | { readonly lte: string; readonly equals?: never; readonly lt?: never; readonly gt?: never; readonly gte?: never; readonly like?: never; readonly ilike?: never }
    | { readonly gt: string; readonly equals?: never; readonly lt?: never; readonly lte?: never; readonly gte?: never; readonly like?: never; readonly ilike?: never }
    | { readonly gte: string; readonly equals?: never; readonly lt?: never; readonly lte?: never; readonly gt?: never; readonly like?: never; readonly ilike?: never }
    | { readonly like: string; readonly equals?: never; readonly lt?: never; readonly lte?: never; readonly gt?: never; readonly gte?: never; readonly ilike?: never }
    | { readonly ilike: string; readonly equals?: never; readonly lt?: never; readonly lte?: never; readonly gt?: never; readonly gte?: never; readonly like?: never };

export type ContractPayloadFilter = { readonly path: string } & PayloadValueFilter;

type ContractWhereFields = {
    readonly contractId?: StringFilter;
    readonly templateId?: Partial<{ readonly packageId: StringFilter; readonly moduleName: StringFilter; readonly entityName: StringFilter }>;
    readonly packageId?: StringFilter;
    readonly createdEventOffset?: OrderedFilter<string>;
    readonly createdAt?: OrderedFilter<Date | null>;
    readonly archivedEventOffset?: OrderedFilter<string | null>;
    readonly archivedAt?: OrderedFilter<Date | null>;
    readonly active?: boolean | ScalarFilter<boolean>;
    readonly witnesses?: { readonly has: string };
    readonly payload?: ContractPayloadFilter;
};

export type ContractWhere = WhereExpression<ContractWhereFields>;

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

export type ContractTypeWhere = RowWhere<ContractTypeRow, "pk", "payloadType" | "packageName" | "moduleName" | "entityName" | "templateFqn">;
export type ContractTypeSelect = RowSelect<ContractTypeRow>;
export type ContractTypeOrderBy = RowOrderBy<ContractTypeRow>;
export type ContractTypeUnique = { readonly pk: string };
export type EventWhere = RowWhere<EventRow, "pk" | "txIx", "eventId" | "type">;
export type EventSelect = RowSelect<EventRow>;
export type EventOrderBy = RowOrderBy<EventRow>;
export type EventUnique = { readonly pk: string };
export type ExerciseWhere = RowWhere<ExerciseRow, "tpePk" | "contractTpePk" | "exerciseEventPk" | "exercisedAtIx" | "packagePk" | "lastDescendantNodeId", "contractId" | "redactionId">;
export type ExerciseSelect = RowSelect<ExerciseRow>;
export type ExerciseOrderBy = RowOrderBy<ExerciseRow>;
export type ExerciseTypeWhere = RowWhere<ExerciseTypeRow, "pk", "choice" | "packageName" | "moduleName" | "entityName" | "templateFqn" | "choiceFqn">;
export type ExerciseTypeSelect = RowSelect<ExerciseTypeRow>;
export type ExerciseTypeOrderBy = RowOrderBy<ExerciseTypeRow>;
export type ExerciseTypeUnique = { readonly pk: string };
export type PackageWhere = RowWhere<PackageRow, "pk", "name" | "version" | "id">;
export type PackageSelect = RowSelect<PackageRow>;
export type PackageOrderBy = RowOrderBy<PackageRow>;
export type PackageUnique = { readonly pk: string } | { readonly id: string };
export type TransactionWhere = RowWhere<TransactionRow, "ix" | "offset" | "effectiveAt" | "paidTrafficCost", "transactionId" | "workflowId" | "domainId">;
export type TransactionSelect = RowSelect<TransactionRow>;
export type TransactionOrderBy = RowOrderBy<TransactionRow>;
export type TransactionUnique = { readonly ix: string } | { readonly offset: string };
export type WatermarkWhere = RowWhere<WatermarkRow, "ix" | "offset", "instanceId">;
export type WatermarkSelect = RowSelect<WatermarkRow>;
export type WatermarkOrderBy = RowOrderBy<WatermarkRow>;
export type WatermarkUnique = { readonly singleton: boolean };

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
