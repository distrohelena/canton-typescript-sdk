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
        readonly rows: readonly {
            readonly table_name: string;
            readonly column_name: string;
        }[];
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
        result.rows.map((row) => `${row.table_name}.${row.column_name}`),
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
