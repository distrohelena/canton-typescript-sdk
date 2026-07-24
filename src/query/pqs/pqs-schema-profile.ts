import { PqsSchemaProfileError } from "../errors/pqs-schema-profile-error.js";

const schemaIdentifier = /^[A-Za-z_][A-Za-z0-9_]*$/;

export const requiredPqsRelations = [
    "__contracts",
    "__contract_tpe",
    "__events",
    "__exercises",
    "__exercise_tpe",
    "__packages",
    "__transactions",
    "__watermark",
] as const;

export type PqsRelation = (typeof requiredPqsRelations)[number];

export interface PqsRelationMetadata {
    readonly fields: Readonly<Record<string, string>>;
    readonly uniqueKeys: readonly (readonly string[])[];
    readonly numericFields: readonly string[];
    readonly arrayFields: readonly string[];
    readonly dateFields: readonly string[];
    readonly binaryFields: readonly string[];
}

export const pqsRelationMetadata: Readonly<Record<PqsRelation, PqsRelationMetadata>> = {
    __contracts: { fields: {}, uniqueKeys: [["contractId"]], numericFields: ["createdEventOffset", "archivedEventOffset"], arrayFields: ["witnesses"], dateFields: ["createdAt", "archivedAt"], binaryFields: [] },
    __contract_tpe: { fields: { pk: "pk", payloadType: "payload_type", aliases: "aliases", packageName: "package_name", moduleName: "module_name", entityName: "entity_name", templateFqn: "template_fqn" }, uniqueKeys: [["pk"]], numericFields: ["pk"], arrayFields: ["aliases"], dateFields: [], binaryFields: [] },
    __events: { fields: { pk: "pk", txIx: "tx_ix", eventId: "event_id", type: "type" }, uniqueKeys: [["pk"]], numericFields: ["pk", "txIx"], arrayFields: [], dateFields: [], binaryFields: [] },
    __exercises: { fields: { tpePk: "tpe_pk", contractTpePk: "contract_tpe_pk", exerciseEventPk: "exercise_event_pk", exercisedAtIx: "exercised_at_ix", contractId: "contract_id", argument: "argument", result: "result", redactionId: "redaction_id", packagePk: "package_pk", controllers: "controllers", lastDescendantNodeId: "last_descendant_node_id", witnesses: "witnesses" }, uniqueKeys: [], numericFields: ["tpePk", "contractTpePk", "exerciseEventPk", "exercisedAtIx", "packagePk", "lastDescendantNodeId"], arrayFields: ["controllers", "witnesses"], dateFields: [], binaryFields: [] },
    __exercise_tpe: { fields: { pk: "pk", choice: "choice", consuming: "consuming", aliases: "aliases", packageName: "package_name", moduleName: "module_name", entityName: "entity_name", templateFqn: "template_fqn", choiceFqn: "choice_fqn" }, uniqueKeys: [["pk"]], numericFields: ["pk"], arrayFields: ["aliases"], dateFields: [], binaryFields: [] },
    __packages: { fields: { pk: "pk", name: "name", version: "version", id: "id" }, uniqueKeys: [["pk"], ["id"]], numericFields: ["pk"], arrayFields: [], dateFields: [], binaryFields: [] },
    __transactions: { fields: { ix: "ix", offset: "offset", transactionId: "transaction_id", effectiveAt: "effective_at", workflowId: "workflow_id", domainId: "domain_id", traceContext: "trace_context", externalTransactionHash: "external_transaction_hash", paidTrafficCost: "paid_traffic_cost" }, uniqueKeys: [["ix"], ["offset"]], numericFields: ["ix", "offset", "paidTrafficCost"], arrayFields: [], dateFields: ["effectiveAt"], binaryFields: ["externalTransactionHash"] },
    __watermark: { fields: { singleton: "singleton", ix: "ix", offset: "offset", instanceId: "instance_id" }, uniqueKeys: [["singleton"]], numericFields: ["ix", "offset"], arrayFields: [], dateFields: [], binaryFields: [] },
};

export const requiredPqsColumns: Readonly<
    Record<PqsRelation, readonly string[]>
> = {
    __contracts: [
        "tpe_pk",
        "create_event_pk",
        "created_at_ix",
        "archive_event_pk",
        "archived_at_ix",
        "life_ix",
        "contract_id",
        "payload",
        "contract_key",
        "metadata",
        "redaction_id",
        "package_pk",
        "signatories",
        "observers",
        "witnesses",
        "divulged_only",
        "creation_package_id",
        "contract_key_hash",
    ],
    __contract_tpe: [
        "pk",
        "payload_type",
        "aliases",
        "package_name",
        "module_name",
        "entity_name",
        "template_fqn",
    ],
    __events: ["pk", "tx_ix", "event_id", "type"],
    __exercises: [
        "tpe_pk",
        "contract_tpe_pk",
        "exercise_event_pk",
        "exercised_at_ix",
        "contract_id",
        "argument",
        "result",
        "redaction_id",
        "package_pk",
        "controllers",
        "last_descendant_node_id",
        "witnesses",
    ],
    __exercise_tpe: [
        "pk",
        "choice",
        "consuming",
        "aliases",
        "package_name",
        "module_name",
        "entity_name",
        "template_fqn",
        "choice_fqn",
    ],
    __packages: ["pk", "name", "version", "id"],
    __transactions: [
        "ix",
        "offset",
        "transaction_id",
        "effective_at",
        "workflow_id",
        "domain_id",
        "trace_context",
        "external_transaction_hash",
        "paid_traffic_cost",
    ],
    __watermark: ["singleton", "ix", "offset", "instance_id"],
};

export class PqsSchemaProfileV1 {
    public readonly schema: string;

    public constructor(schema = "public") {
        assertPqsSchemaIdentifier(schema);
        this.schema = schema;
    }

    public relation(relation: PqsRelation): string {
        return `${quoteIdentifier(this.schema)}.${quoteIdentifier(relation)}`;
    }
}

export interface PqsSchemaClient {
    query(query: string, values: readonly unknown[]): Promise<{
        readonly rows: readonly Record<string, unknown>[];
    }>;
}

export async function validatePqsSchemaAsync(
    client: PqsSchemaClient,
    profile: PqsSchemaProfileV1,
): Promise<void> {
    const result = await client.query(
        "select table_name, column_name from information_schema.columns where table_schema = $1 and table_name = any($2::text[])",
        [profile.schema, requiredPqsRelations],
    );

    const actual = new Set(
        result.rows.map((row) => `${String(row.table_name)}.${String(row.column_name)}`),
    );

    const missing = requiredPqsRelations.flatMap((relation) =>
        requiredPqsColumns[relation]
            .filter((column) => !actual.has(`${relation}.${column}`))
            .map((column) => `${relation}.${column}`),
    );

    if (missing.length > 0) {
        throw new PqsSchemaProfileError(
            `PQS schema does not match v1 profile; missing: ${missing.join(", ")}`,
        );
    }
}

export function assertPqsSchemaIdentifier(schema: string): void {
    if (!schemaIdentifier.test(schema)) {
        throw new PqsSchemaProfileError(
            `Invalid PQS schema identifier: ${schema}`,
        );
    }
}

function quoteIdentifier(identifier: string): string {
    return `"${identifier.replaceAll('"', '""')}"`;
}
