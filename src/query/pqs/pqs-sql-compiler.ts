import {
    assertQueryPageArgs,
    ContractFindManyArgs,
    ContractOrderField,
} from "../model-types.js";
import { PqsSchemaProfileV1 } from "./pqs-schema-profile.js";

export interface CompiledPqsQuery {
    readonly text: string;
    readonly values: readonly unknown[];
}

export function compileContractFindMany(
    args: ContractFindManyArgs,
    profile: PqsSchemaProfileV1,
): CompiledPqsQuery {
    assertQueryPageArgs(args);

    const values: unknown[] = [];
    const addValue = (value: unknown): string => {
        values.push(value);
        return `$${values.length}`;
    };
    const conditions: string[] = [];
    const where = args.where;

    if (where?.contractId?.equals !== undefined) {
        conditions.push(`contract_row.contract_id = ${addValue(where.contractId.equals)}`);
    }
    if (where?.templateId?.equals !== undefined) {
        conditions.push(
            `(contract_row.creation_package_id || ':' || contract_tpe_row.module_name || ':' || contract_tpe_row.entity_name) = ${addValue(where.templateId.equals)}`,
        );
    }
    if (where?.packageId?.equals !== undefined) {
        conditions.push(
            `contract_row.creation_package_id = ${addValue(where.packageId.equals)}`,
        );
    }
    if (where?.active === true) {
        conditions.push("contract_row.archived_at_ix is null");
    }
    if (where?.active === false) {
        conditions.push("contract_row.archived_at_ix is not null");
    }
    if (where?.witnesses?.has !== undefined) {
        conditions.push(`${addValue(where.witnesses.has)} = any(contract_row.witnesses)`);
    }

    const orderBy = compileOrderBy(args.orderBy);
    const whereSql = conditions.length === 0 ? "" : `where ${conditions.join(" and ")}`;
    const limitSql = args.take === undefined ? "" : `limit ${addValue(args.take)}`;
    const offsetSql = args.skip === undefined ? "" : `offset ${addValue(args.skip)}`;

    return {
        text: `select
  contract_row.contract_id as contract_id,
  contract_row.creation_package_id as package_id,
  contract_row.payload,
  contract_row.witnesses,
  contract_row.created_at_ix::text as created_event_offset,
  created_tx.effective_at as created_at,
  contract_row.archived_at_ix::text as archived_event_offset,
  archived_tx.effective_at as archived_at,
  contract_row.archived_at_ix is null as active,
  (contract_row.creation_package_id || ':' || contract_tpe_row.module_name || ':' || contract_tpe_row.entity_name) as template_id
from ${profile.relation("__contracts")} contract_row
join ${profile.relation("__contract_tpe")} contract_tpe_row on contract_tpe_row.pk = contract_row.tpe_pk
left join ${profile.relation("__transactions")} created_tx on created_tx.ix = contract_row.created_at_ix
left join ${profile.relation("__transactions")} archived_tx on archived_tx.ix = contract_row.archived_at_ix
${whereSql}
${orderBy}
${limitSql}
${offsetSql}`,
        values,
    };
}

function compileOrderBy(
    orderBy: Partial<Record<ContractOrderField, "asc" | "desc">> | undefined,
): string {
    if (orderBy === undefined) {
        return "order by contract_row.contract_id asc";
    }

    const fields: Readonly<Record<ContractOrderField, string>> = {
        contractId: "contract_row.contract_id",
        createdEventOffset: "contract_row.created_at_ix",
        createdAt: "created_tx.effective_at",
        archivedEventOffset: "contract_row.archived_at_ix",
        archivedAt: "archived_tx.effective_at",
    };
    const entries = Object.entries(orderBy) as [ContractOrderField, "asc" | "desc"][];

    if (entries.length !== 1) {
        throw new Error("orderBy must specify exactly one field");
    }

    const [field, direction] = entries[0];
    return `order by ${fields[field]} ${direction}`;
}
