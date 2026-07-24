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
    const where = args.where === undefined ? undefined : compileWhere(args.where as Record<string, unknown>, addValue);
    if (where !== undefined) conditions.push(where);

    if (args.parties !== undefined) {
        conditions.push(`contract_row.witnesses && ${addValue(args.parties)}::text[]`);
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
  contract_row.creation_package_id as template_package_id,
  contract_tpe_row.module_name as template_module_name,
  contract_tpe_row.entity_name as template_entity_name
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

function compileWhere(where: Record<string, unknown>, addValue: (value: unknown) => string): string {
    const columns: Record<string, string> = { contractId: "contract_row.contract_id", packageId: "contract_row.creation_package_id", createdEventOffset: "contract_row.created_at_ix", createdAt: "created_tx.effective_at", archivedEventOffset: "contract_row.archived_at_ix", archivedAt: "archived_tx.effective_at" };
    const parts: string[] = [];
    for (const [key, value] of Object.entries(where)) {
        if (key === "and" || key === "or") { if (!Array.isArray(value)) throw new Error(`${key} must be an array`); parts.push(value.length === 0 ? key === "and" ? "true" : "false" : `(${value.map((child) => compileWhere(child as Record<string, unknown>, addValue)).join(` ${key} `)})`); continue; }
        if (key === "not") { parts.push(`not (${compileWhere(value as Record<string, unknown>, addValue)})`); continue; }
        if (key === "active") { const active = typeof value === "boolean" ? value : (value as { equals?: boolean }).equals; if (typeof active !== "boolean") throw new Error("active supports only equals"); parts.push(active ? "contract_row.archived_at_ix is null" : "contract_row.archived_at_ix is not null"); continue; }
        if (key === "witnesses") { const has = (value as { has?: string }).has; if (has === undefined) throw new Error("witnesses supports only has"); parts.push(`${addValue(has)} = any(contract_row.witnesses)`); continue; }
        if (key === "payload") { const payload = value as Record<string, unknown>; const path = payload.path; if (typeof path !== "string" || path.split(".").some((x) => x.length === 0)) throw new Error("payload path must contain non-empty segments"); const ops = ["equals", "lt", "lte", "gt", "gte", "like", "ilike"].filter((op) => payload[op] !== undefined); if (ops.length !== 1 || typeof payload[ops[0]] !== "string") throw new Error("payload requires exactly one string predicate"); const op = ({ equals: "=", lt: "<", lte: "<=", gt: ">", gte: ">=", like: "like", ilike: "ilike" } as Record<string,string>)[ops[0]]; parts.push(`contract_row.payload #>> ${addValue(path.split("."))}::text[] ${op} ${addValue(payload[ops[0]])}`); continue; }
        if (key === "templateId") { const fields: Record<string, string> = { packageId: "contract_row.creation_package_id", moduleName: "contract_tpe_row.module_name", entityName: "contract_tpe_row.entity_name" }; for (const [name, filter] of Object.entries(value as Record<string, Record<string, unknown>>)) for (const [op, operand] of Object.entries(filter)) { const sql = ({ equals: "=", lt: "<", lte: "<=", gt: ">", gte: ">=", like: "like", ilike: "ilike" } as Record<string, string>)[op]; if (fields[name] === undefined || sql === undefined) throw new Error("invalid templateId filter"); parts.push(`${fields[name]} ${sql} ${addValue(operand)}`); } continue; }
        const column = columns[key]; if (column === undefined || value === null || typeof value !== "object") throw new Error(`${key} is not a supported contract filter`);
        for (const [op, operand] of Object.entries(value as Record<string, unknown>)) { const sql = ({ equals: "=", lt: "<", lte: "<=", gt: ">", gte: ">=", like: "like", ilike: "ilike" } as Record<string,string>)[op]; if (sql !== undefined) parts.push(`${column} ${sql} ${addValue(operand)}`); else if (op === "is" && operand === null) parts.push(`${column} is null`); else if (op === "isNot" && operand === null) parts.push(`${column} is not null`); else if (op === "in" && Array.isArray(operand)) parts.push(operand.length ? `${column} = any(${addValue(operand)})` : "false"); else throw new Error(`${op} is not supported for ${key}`); }
    }
    return parts.length === 0 ? "true" : parts.join(" and ");
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
