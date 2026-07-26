import type {
    ContractFindUniqueArgs,
    EventGroupByArgs,
    TransactionOrderBy,
} from "../../src/query/model-types.js";
import type { QueryClient } from "../../src/query/query-client.js";

const contractDetail: ContractFindUniqueArgs = {
    where: { contractId: "cid" },
    include: {
        contractType: true,
        createdTransaction: true,
        archivedTransaction: true,
        exercises: {
            take: 50,
            include: { transaction: true },
        },
    },
};

const transactionOrder: TransactionOrderBy = [
    { effectiveAt: "desc" },
    { ix: "asc" },
];

const eventDayBucket: EventGroupByArgs = {
    by: ["type", { transaction: { effectiveAt: { bucket: "day" } } }],
    aggregate: { count: true },
};

// @ts-expect-error unknown profile edge
const unknownEdge: ContractFindUniqueArgs = { where: { contractId: "cid" }, include: { package: true } };

// @ts-expect-error to-many include must be bounded
const unboundedMany: ContractFindUniqueArgs = { where: { contractId: "cid" }, include: { exercises: true } };

void contractDetail;
void transactionOrder;
void eventDayBucket;
void unknownEdge;
void unboundedMany;

declare const query: QueryClient;
void query.events.groupBy(eventDayBucket);

void query.transactions.findMany({
    where: { exercises: { some: { witnesses: { has: "Alice" } } } },
});

void query.exercises.findMany({
    where: { argument: { path: ["owner"], equals: "Alice" } },
});
