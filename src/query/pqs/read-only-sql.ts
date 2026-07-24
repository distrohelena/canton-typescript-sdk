const allowedStarts = new Set(["select", "with", "explain", "show"]);

const mutationTokens = new Set([
    "insert",
    "update",
    "delete",
    "merge",
    "create",
    "alter",
    "drop",
    "truncate",
    "grant",
    "revoke",
    "copy",
]);

export function assertReadOnlySql(sql: string): void {
    const normalized = stripLiteralsAndComments(sql).trim().toLowerCase();

    const tokens: readonly string[] = normalized.match(/[a-z_]+|;/g) ?? [];

    const firstToken = tokens[0];

    if (firstToken === undefined || !allowedStarts.has(firstToken)) {
        throw new Error("PQS raw queries must be read-only statements.");
    } else if (tokens.some((token) => token === ";")) {
        throw new Error("PQS raw queries must contain one read-only statement.");
    } else if (tokens.some((token) => mutationTokens.has(token))) {
        throw new Error("PQS raw queries must be read-only statements.");
    }
}

function stripLiteralsAndComments(sql: string): string {
    return sql
        .replace(/--[^\n]*/g, "")
        .replace(/\/\*[\s\S]*?\*\//g, "")
        .replace(/'(?:''|[^'])*'/g, "''")
        .replace(/"(?:""|[^"])*"/g, '""');
}
