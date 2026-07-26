import {
    assertQueryPageArgs,
    ContractFindManyArgs,
    ContractGroupByArgs,
    ContractOrderBy,
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

    const include = args.include;
    const included = [
        include?.contractType === undefined ? undefined : "to_jsonb(contract_tpe_row) as contract_type",
        include?.createdTransaction === undefined ? undefined : "to_jsonb(created_tx) as created_transaction",
        include?.archivedTransaction === undefined ? undefined : "to_jsonb(archived_tx) as archived_transaction",
        include?.exercises === undefined ? undefined : "exercise_rows.exercises",
    ].filter((field): field is string => field !== undefined);
    const exercisesJoin = include?.exercises === undefined ? "" : `
left join lateral (
  select coalesce(jsonb_agg(to_jsonb(exercise_row)), '[]'::jsonb) as exercises
  from (
    select * from ${profile.relation("__exercises")} exercise_row
    where exercise_row.contract_id = contract_row.contract_id
    limit ${addValue(include.exercises.take)}
  ) exercise_row
) exercise_rows on true`;

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
  contract_tpe_row.entity_name as template_entity_name${included.length === 0 ? "" : `,\n  ${included.join(",\n  ")}`}
from ${profile.relation("__contracts")} contract_row
join ${profile.relation("__contract_tpe")} contract_tpe_row on contract_tpe_row.pk = contract_row.tpe_pk
left join ${profile.relation("__transactions")} created_tx on created_tx.ix = contract_row.created_at_ix
left join ${profile.relation("__transactions")} archived_tx on archived_tx.ix = contract_row.archived_at_ix
${exercisesJoin}
${whereSql}
${orderBy}
${limitSql}
${offsetSql}`,
        values,
    };
}

export function compileContractGroupBy(
    args: ContractGroupByArgs,
    profile: PqsSchemaProfileV1,
): CompiledPqsQuery {
    if (args.by.length === 0 || (!args.aggregate.count && !args.aggregate.min && !args.aggregate.max && !args.aggregate.sum)) throw new Error("groupBy requires keys and an aggregate");
    const values: unknown[] = [];
    const add = (value: unknown) => { values.push(value); return `$${values.length}`; };
    const where = args.where === undefined ? undefined : compileWhere(args.where as Record<string, unknown>, add);
    const fields: Readonly<Record<string, string>> = {
        contractId: "contract_row.contract_id",
        createdEventOffset: "contract_row.created_at_ix",
        archivedEventOffset: "contract_row.archived_at_ix",
    };
    const expressions: string[] = [];
    const select: string[] = [];
    let unnestWitnesses = false;
    for (const key of args.by) {
        if (key === "witnesses") {
            unnestWitnesses = true;
            expressions.push("witness.value");
            select.push("witness.value as \"witnesses\"");
        } else if (typeof key === "string") {
            const expression = fields[key];
            if (expression === undefined) throw new Error(`${key} is not a contract group key`);
            expressions.push(expression);
            select.push(`${expression} as "${key}"`);
        } else {
            const payload = key.payload;
            if (payload.path.length === 0 || payload.path.some((segment) => segment.length === 0)) throw new Error("payload group path must be non-empty");
            const base = `contract_row.payload #>> ${add(payload.path)}::text[]`;
            const cast = payload.as === "text" ? base : `(${base})::${payload.as === "numeric" ? "numeric" : payload.as === "boolean" ? "boolean" : "timestamptz"}`;
            expressions.push(cast);
            select.push(`${cast} as "${payload.name}"`);
        }
    }
    if (args.aggregate.count) select.push("count(*)::text as count");
    for (const [operation, requested] of [["min", args.aggregate.min], ["max", args.aggregate.max], ["sum", args.aggregate.sum]] as const) {
        for (const name of requested ?? []) {
            const expression = fields[name];
            select.push(`${operation}(${expression})::text as "${operation}_${name}"`);
        }
    }
    return {
        text: `select ${select.join(", ")} from ${profile.relation("__contracts")} contract_row${unnestWitnesses ? " cross join lateral unnest(contract_row.witnesses) as witness(value)" : ""}${where === undefined ? "" : ` where ${where}`} group by ${expressions.join(", ")}`,
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
        if (key === "payload") { const payload = value as Record<string, unknown>; const compilePayload = (path: string[], filter: Record<string, unknown>) => { const ops = ["equals", "lt", "lte", "gt", "gte", "like", "ilike"].filter((op) => filter[op] !== undefined); if (ops.length === 1) { const op = ({ equals: "=", lt: "<", lte: "<=", gt: ">", gte: ">=", like: "like", ilike: "ilike" } as Record<string,string>)[ops[0]]; parts.push(`contract_row.payload #>> ${addValue(path)}::text[] ${op} ${addValue(filter[ops[0]])}`); return; } for (const [name, child] of Object.entries(filter)) compilePayload([...path, name], child as Record<string, unknown>); }; if (payload.match === undefined) throw new Error("payload requires match"); compilePayload([], payload.match as Record<string, unknown>); continue; }
        if (key === "templateId") { const fields: Record<string, string> = { packageId: "contract_row.creation_package_id", moduleName: "contract_tpe_row.module_name", entityName: "contract_tpe_row.entity_name" }; for (const [name, filter] of Object.entries(value as Record<string, Record<string, unknown>>)) for (const [op, operand] of Object.entries(filter)) { const sql = ({ equals: "=", lt: "<", lte: "<=", gt: ">", gte: ">=", like: "like", ilike: "ilike" } as Record<string, string>)[op]; if (fields[name] === undefined || sql === undefined) throw new Error("invalid templateId filter"); parts.push(`${fields[name]} ${sql} ${addValue(operand)}`); } continue; }
        const column = columns[key]; if (column === undefined || value === null || typeof value !== "object") throw new Error(`${key} is not a supported contract filter`);
        for (const [op, operand] of Object.entries(value as Record<string, unknown>)) { const sql = ({ equals: "=", lt: "<", lte: "<=", gt: ">", gte: ">=", like: "like", ilike: "ilike" } as Record<string,string>)[op]; if (sql !== undefined) parts.push(`${column} ${sql} ${addValue(operand)}`); else if (op === "is" && operand === null) parts.push(`${column} is null`); else if (op === "isNot" && operand === null) parts.push(`${column} is not null`); else if (op === "in" && Array.isArray(operand)) parts.push(operand.length ? `${column} = any(${addValue(operand)})` : "false"); else throw new Error(`${op} is not supported for ${key}`); }
    }
    return parts.length === 0 ? "true" : parts.join(" and ");
}

function compileOrderBy(
    orderBy: ContractOrderBy | undefined,
): string {
    if (orderBy === undefined) {
        return "order by contract_row.contract_id asc";
    }

    const fields: Readonly<Record<string, string>> = {
        contractId: "contract_row.contract_id",
        createdEventOffset: "contract_row.created_at_ix",
        createdAt: "created_tx.effective_at",
        archivedEventOffset: "contract_row.archived_at_ix",
        archivedAt: "archived_tx.effective_at",
    };

    const entries = orderBy.flatMap((entry) => Object.entries(entry));

    if (entries.some(([field, direction]) => fields[field] === undefined || (direction !== "asc" && direction !== "desc"))) {
        throw new Error("orderBy must contain valid one-field entries");
    }

    return `order by ${entries.map(([field, direction]) => `${fields[field]} ${direction}`).join(", ")}`;
}
