export function canonicalize(value: unknown): unknown {
    if (Array.isArray(value)) {
        return value.map((item) => canonicalize(item));
    } else if (value !== null && typeof value === "object") {
        return Object.fromEntries(
            Object.entries(value)
                .sort(([left], [right]) => left.localeCompare(right))
                .map(([key, child]) => [key, canonicalize(child)]),
        );
    }

    return value;
}
