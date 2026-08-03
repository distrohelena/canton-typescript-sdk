import { PqsSchemaProfileError } from "../errors/pqs-schema-profile-error.js";
import {
    queryRelationEdges,
    queryRelationMetadata,
    type QueryRelation,
} from "../canonical/query-schema.js";

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

const queryRelationByPqsRelation: Readonly<Record<PqsRelation, QueryRelation>> = {
    __contracts: "contracts",
    __contract_tpe: "contractTypes",
    __events: "events",
    __exercises: "exercises",
    __exercise_tpe: "exerciseTypes",
    __packages: "packages",
    __transactions: "transactions",
    __watermark: "watermark",
};

const pqsRelationByQueryRelation: Readonly<Record<QueryRelation, PqsRelation>> = {
    contracts: "__contracts",
    contractTypes: "__contract_tpe",
    events: "__events",
    exercises: "__exercises",
    exerciseTypes: "__exercise_tpe",
    packages: "__packages",
    transactions: "__transactions",
    watermark: "__watermark",
};

export interface PqsRelationEdge {
    readonly target: PqsRelation;
    readonly sourceColumn: string;
    readonly targetColumn: string;
    readonly cardinality: "one" | "many";
    readonly nullable: boolean;
}

const pqsEdgeColumns: Readonly<Partial<Record<PqsRelation, Readonly<Record<string, { readonly sourceColumn: string; readonly targetColumn: string }>>>>> = {
    __contracts: { contractType: { sourceColumn: "tpe_pk", targetColumn: "pk" }, createdTransaction: { sourceColumn: "created_at_ix", targetColumn: "ix" }, archivedTransaction: { sourceColumn: "archived_at_ix", targetColumn: "ix" }, exercises: { sourceColumn: "contract_id", targetColumn: "contract_id" } },
    __contract_tpe: { contracts: { sourceColumn: "pk", targetColumn: "tpe_pk" }, exercises: { sourceColumn: "pk", targetColumn: "contract_tpe_pk" } },
    __events: { transaction: { sourceColumn: "tx_ix", targetColumn: "ix" }, exercises: { sourceColumn: "pk", targetColumn: "exercise_event_pk" } },
    __exercises: { exerciseType: { sourceColumn: "tpe_pk", targetColumn: "pk" }, contractType: { sourceColumn: "contract_tpe_pk", targetColumn: "pk" }, event: { sourceColumn: "exercise_event_pk", targetColumn: "pk" }, transaction: { sourceColumn: "exercised_at_ix", targetColumn: "ix" }, package: { sourceColumn: "package_pk", targetColumn: "pk" }, contract: { sourceColumn: "contract_id", targetColumn: "contract_id" } },
    __exercise_tpe: { exercises: { sourceColumn: "pk", targetColumn: "tpe_pk" } },
    __packages: { exercises: { sourceColumn: "pk", targetColumn: "package_pk" } },
    __transactions: { events: { sourceColumn: "ix", targetColumn: "tx_ix" }, createdContracts: { sourceColumn: "ix", targetColumn: "created_at_ix" }, archivedContracts: { sourceColumn: "ix", targetColumn: "archived_at_ix" }, exercises: { sourceColumn: "ix", targetColumn: "exercised_at_ix" } },
};

export const pqsRelationEdges: Readonly<Partial<Record<PqsRelation, Readonly<Record<string, PqsRelationEdge>>>>> = Object.fromEntries(
    requiredPqsRelations.map((relation) => [relation, Object.fromEntries(
        Object.entries(queryRelationEdges[queryRelationByPqsRelation[relation]] ?? {}).map(([name, edge]) => {
            const columns = pqsEdgeColumns[relation]?.[name];

            if (columns === undefined) {
                throw new Error(`Missing physical PQS edge mapping for ${relation}.${name}`);
            }

            return [name, { target: pqsRelationByQueryRelation[edge.target], ...columns, cardinality: edge.cardinality, nullable: edge.nullable }];
        }),
    )]),
);

export interface PqsRelationMetadata {
    readonly fields: Readonly<Record<string, string>>;
    readonly uniqueKeys: readonly (readonly string[])[];
    readonly numericFields: readonly string[];
    readonly arrayFields: readonly string[];
    readonly dateFields: readonly string[];
    readonly binaryFields: readonly string[];
    readonly stringFields?: readonly string[];
}

const pqsFields: Readonly<Record<PqsRelation, Readonly<Record<string, string>>>> = {
    __contracts: {},
    __contract_tpe: { pk: "pk", payloadType: "payload_type", aliases: "aliases", packageName: "package_name", moduleName: "module_name", entityName: "entity_name", templateFqn: "template_fqn" },
    __events: { pk: "pk", txIx: "tx_ix", eventId: "event_id", type: "type" },
    __exercises: { tpePk: "tpe_pk", contractTpePk: "contract_tpe_pk", exerciseEventPk: "exercise_event_pk", exercisedAtIx: "exercised_at_ix", contractId: "contract_id", argument: "argument", result: "result", redactionId: "redaction_id", packagePk: "package_pk", controllers: "controllers", lastDescendantNodeId: "last_descendant_node_id", witnesses: "witnesses" },
    __exercise_tpe: { pk: "pk", choice: "choice", consuming: "consuming", aliases: "aliases", packageName: "package_name", moduleName: "module_name", entityName: "entity_name", templateFqn: "template_fqn", choiceFqn: "choice_fqn" },
    __packages: { pk: "pk", name: "name", version: "version", id: "id" },
    __transactions: { ix: "ix", offset: "offset", transactionId: "transaction_id", effectiveAt: "effective_at", workflowId: "workflow_id", domainId: "domain_id", traceContext: "trace_context", externalTransactionHash: "external_transaction_hash", paidTrafficCost: "paid_traffic_cost" },
    __watermark: { singleton: "singleton", ix: "ix", offset: "offset", instanceId: "instance_id" },
};

export const pqsRelationMetadata: Readonly<Record<PqsRelation, PqsRelationMetadata>> = Object.fromEntries(
    requiredPqsRelations.map((relation) => {
        const logical = queryRelationMetadata[queryRelationByPqsRelation[relation]];

        return [relation, { fields: pqsFields[relation], uniqueKeys: logical.uniqueKeys, numericFields: logical.numericFields, arrayFields: logical.arrayFields, dateFields: logical.dateFields, binaryFields: logical.binaryFields, stringFields: logical.stringFields }];
    }),
) as Record<PqsRelation, PqsRelationMetadata>;

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

    public static jsonField(relation: PqsRelation, field: string): boolean {
        return queryRelationMetadata[queryRelationByPqsRelation[relation]].jsonFields.includes(field);
    }

    public static bucketField(relation: PqsRelation, field: string): boolean {
        return queryRelationMetadata[queryRelationByPqsRelation[relation]].bucketFields.includes(field);
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
