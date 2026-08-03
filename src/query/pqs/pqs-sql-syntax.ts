export function quotePqsIdentifier(value: string): string {
    return `"${value.replaceAll('"', '""')}"`;
}

export function quotePqsString(value: string): string {
    return `'${value.replaceAll("'", "''")}'`;
}
