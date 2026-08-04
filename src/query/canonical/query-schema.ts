export const queryRelations = [
    "contracts",
    "contractTypes",
    "events",
    "exercises",
    "exerciseTypes",
    "packages",
    "transactions",
    "watermark",
] as const;

export type QueryRelation = (typeof queryRelations)[number];

export interface QueryRelationEdge {
    readonly target: QueryRelation;
    readonly cardinality: "one" | "many";
    readonly nullable: boolean;
}

export interface QueryRelationMetadata {
    readonly fields: readonly string[];
    readonly uniqueKeys: readonly (readonly string[])[];
    readonly stableOrder: readonly string[];
    readonly orderFields: readonly string[];
    readonly groupFields: readonly string[];
    readonly numericFields: readonly string[];
    readonly arrayFields: readonly string[];
    readonly dateFields: readonly string[];
    readonly binaryFields: readonly string[];
    readonly booleanFields: readonly string[];
    readonly nullableFields: readonly string[];
    readonly stringFields: readonly string[];
    readonly jsonFields: readonly string[];
    readonly bucketFields: readonly string[];
}

export const queryRelationEdges: Readonly<Partial<Record<QueryRelation, Readonly<Record<string, QueryRelationEdge>>>>> = {
    contracts: {
        contractType: { target: "contractTypes", cardinality: "one", nullable: false },
        createdTransaction: { target: "transactions", cardinality: "one", nullable: false },
        archivedTransaction: { target: "transactions", cardinality: "one", nullable: true },
        exercises: { target: "exercises", cardinality: "many", nullable: false },
    },
    contractTypes: {
        contracts: { target: "contracts", cardinality: "many", nullable: false },
        exercises: { target: "exercises", cardinality: "many", nullable: false },
    },
    events: {
        transaction: { target: "transactions", cardinality: "one", nullable: false },
        exercises: { target: "exercises", cardinality: "many", nullable: false },
    },
    exercises: {
        exerciseType: { target: "exerciseTypes", cardinality: "one", nullable: false },
        contractType: { target: "contractTypes", cardinality: "one", nullable: false },
        event: { target: "events", cardinality: "one", nullable: true },
        transaction: { target: "transactions", cardinality: "one", nullable: true },
        package: { target: "packages", cardinality: "one", nullable: false },
        contract: { target: "contracts", cardinality: "one", nullable: true },
    },
    exerciseTypes: { exercises: { target: "exercises", cardinality: "many", nullable: false } },
    packages: { exercises: { target: "exercises", cardinality: "many", nullable: false } },
    transactions: {
        events: { target: "events", cardinality: "many", nullable: false },
        createdContracts: { target: "contracts", cardinality: "many", nullable: false },
        archivedContracts: { target: "contracts", cardinality: "many", nullable: false },
        exercises: { target: "exercises", cardinality: "many", nullable: false },
    },
};

export const queryRelationMetadata: Readonly<Record<QueryRelation, QueryRelationMetadata>> = {
    contracts: {
        fields: ["contractId", "templateId", "packageId", "payload", "witnesses", "createdEventOffset", "createdAt", "archivedEventOffset", "archivedAt", "active"],
        uniqueKeys: [["contractId"]], stableOrder: ["contractId"],
        orderFields: ["contractId", "createdEventOffset", "createdAt", "archivedEventOffset", "archivedAt"],
        groupFields: ["contractId", "createdEventOffset", "createdAt", "archivedEventOffset", "archivedAt", "witnesses"],
        numericFields: ["createdEventOffset", "archivedEventOffset"], arrayFields: ["witnesses"], dateFields: ["createdAt", "archivedAt"], binaryFields: [], booleanFields: ["active"], nullableFields: ["packageId", "createdAt", "archivedEventOffset", "archivedAt"], stringFields: ["contractId", "packageId"], jsonFields: ["payload"], bucketFields: [],
    },
    contractTypes: {
        fields: ["pk", "payloadType", "aliases", "packageName", "moduleName", "entityName", "templateFqn"],
        uniqueKeys: [["pk"]], stableOrder: ["pk"], orderFields: ["pk", "payloadType", "aliases", "packageName", "moduleName", "entityName", "templateFqn"], groupFields: ["pk", "payloadType", "aliases", "packageName", "moduleName", "entityName", "templateFqn"],
        numericFields: ["pk"], arrayFields: ["aliases"], dateFields: [], binaryFields: [], booleanFields: [], nullableFields: [], stringFields: ["payloadType", "packageName", "moduleName", "entityName", "templateFqn"], jsonFields: [], bucketFields: [],
    },
    events: {
        fields: ["pk", "txIx", "eventId", "type"], uniqueKeys: [["pk"]], stableOrder: ["pk"], orderFields: ["pk", "txIx", "eventId", "type"], groupFields: ["pk", "txIx", "eventId", "type"],
        numericFields: ["pk", "txIx"], arrayFields: [], dateFields: [], binaryFields: [], booleanFields: [], nullableFields: [], stringFields: ["eventId", "type"], jsonFields: [], bucketFields: [],
    },
    exercises: {
        fields: ["tpePk", "contractTpePk", "exerciseEventPk", "exercisedAtIx", "contractId", "argument", "result", "redactionId", "packagePk", "controllers", "lastDescendantNodeId", "witnesses"],
        uniqueKeys: [], stableOrder: ["tpePk", "contractTpePk", "exerciseEventPk", "contractId"], orderFields: ["tpePk", "contractTpePk", "exerciseEventPk", "exercisedAtIx", "contractId", "argument", "result", "redactionId", "packagePk", "controllers", "lastDescendantNodeId", "witnesses"], groupFields: ["tpePk", "contractTpePk", "exerciseEventPk", "exercisedAtIx", "contractId", "argument", "result", "redactionId", "packagePk", "controllers", "lastDescendantNodeId", "witnesses"],
        numericFields: ["tpePk", "contractTpePk", "exerciseEventPk", "exercisedAtIx", "packagePk", "lastDescendantNodeId"], arrayFields: ["controllers", "witnesses"], dateFields: [], binaryFields: [], booleanFields: [], nullableFields: ["exerciseEventPk", "exercisedAtIx", "redactionId"], stringFields: ["contractId", "redactionId"], jsonFields: ["argument", "result"], bucketFields: [],
    },
    exerciseTypes: {
        fields: ["pk", "choice", "consuming", "aliases", "packageName", "moduleName", "entityName", "templateFqn", "choiceFqn"],
        uniqueKeys: [["pk"]], stableOrder: ["pk"], orderFields: ["pk", "choice", "consuming", "aliases", "packageName", "moduleName", "entityName", "templateFqn", "choiceFqn"], groupFields: ["pk", "choice", "consuming", "aliases", "packageName", "moduleName", "entityName", "templateFqn", "choiceFqn"],
        numericFields: ["pk"], arrayFields: ["aliases"], dateFields: [], binaryFields: [], booleanFields: ["consuming"], nullableFields: [], stringFields: ["choice", "packageName", "moduleName", "entityName", "templateFqn", "choiceFqn"], jsonFields: [], bucketFields: [],
    },
    packages: {
        fields: ["pk", "name", "version", "id"], uniqueKeys: [["pk"], ["id"]], stableOrder: ["pk"], orderFields: ["pk", "name", "version", "id"], groupFields: ["pk", "name", "version", "id"],
        numericFields: ["pk"], arrayFields: [], dateFields: [], binaryFields: [], booleanFields: [], nullableFields: [], stringFields: ["name", "version", "id"], jsonFields: [], bucketFields: [],
    },
    transactions: {
        fields: ["ix", "offset", "transactionId", "effectiveAt", "workflowId", "domainId", "traceContext", "externalTransactionHash", "paidTrafficCost"],
        uniqueKeys: [["ix"], ["offset"]], stableOrder: ["ix"], orderFields: ["ix", "offset", "transactionId", "effectiveAt", "workflowId", "domainId", "traceContext", "externalTransactionHash", "paidTrafficCost"], groupFields: ["ix", "offset", "transactionId", "effectiveAt", "workflowId", "domainId", "traceContext", "externalTransactionHash", "paidTrafficCost"],
        numericFields: ["ix", "offset", "paidTrafficCost"], arrayFields: [], dateFields: ["effectiveAt"], binaryFields: ["externalTransactionHash"], booleanFields: [], nullableFields: ["transactionId", "effectiveAt", "workflowId", "domainId", "traceContext", "externalTransactionHash", "paidTrafficCost"], stringFields: ["transactionId", "workflowId", "domainId"], jsonFields: ["traceContext"], bucketFields: ["effectiveAt"],
    },
    watermark: {
        fields: ["singleton", "ix", "offset", "instanceId"], uniqueKeys: [["singleton"]], stableOrder: ["singleton"], orderFields: ["singleton", "ix", "offset", "instanceId"], groupFields: ["singleton", "ix", "offset", "instanceId"],
        numericFields: ["ix", "offset"], arrayFields: [], dateFields: [], binaryFields: [], booleanFields: ["singleton"], nullableFields: ["ix", "offset", "instanceId"], stringFields: ["instanceId"], jsonFields: [], bucketFields: [],
    },
};
