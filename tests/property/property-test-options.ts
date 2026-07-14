import type { Parameters } from "fast-check";

const DEFAULT_NUM_RUNS = 100;

export function propertyParameters(): Parameters {
    return {
        numRuns: parsePositiveInteger(
            "FUZZ_NUM_RUNS",
            process.env.FUZZ_NUM_RUNS,
            DEFAULT_NUM_RUNS,
        ),
        ...(process.env.FUZZ_SEED === undefined
            ? {}
            : {
                seed: parseInteger("FUZZ_SEED", process.env.FUZZ_SEED),
            }),
        ...(process.env.FUZZ_PATH === undefined
            ? {}
            : {
                path: parsePath(process.env.FUZZ_PATH),
            }),
    };
}

function parsePositiveInteger(
    key: string,
    value: string | undefined,
    fallback: number,
): number {
    if (value === undefined) {
        return fallback;
    } else if (!/^[1-9]\d*$/.test(value)) {
        throw new Error(`${key} must be a positive integer.`);
    }

    const parsed = Number(value);

    if (!Number.isSafeInteger(parsed)) {
        throw new Error(`${key} must be a safe integer.`);
    }

    return parsed;
}

function parseInteger(key: string, value: string): number {
    if (!/^-?\d+$/.test(value)) {
        throw new Error(`${key} must be an integer.`);
    }

    const parsed = Number(value);

    if (!Number.isSafeInteger(parsed)) {
        throw new Error(`${key} must be a safe integer.`);
    }

    return parsed;
}

function parsePath(value: string): string {
    if (!/^\d+(?::\d+)*$/.test(value)) {
        throw new Error("FUZZ_PATH must be a non-empty shrink path.");
    }

    return value;
}
