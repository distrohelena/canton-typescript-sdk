import { randomBytes } from "node:crypto";
import type { Parameters } from "fast-check";
import { propertyParameters } from "../../property/property-test-options.js";

const DEFAULT_MAX_COMMANDS = 8;

const DEFAULT_POLL_TIMEOUT_MS = 10_000;

const DEFAULT_POLL_INTERVAL_MS = 100;

const DEFAULT_TEST_TIMEOUT_MS = 300_000;

const DEFAULT_CLEANUP_TIMEOUT_MS = 5_000;

export interface LiveFuzzConfig extends Parameters {
    readonly enabled: boolean;
    readonly maxCommands: number;
    readonly pollTimeoutMs: number;
    readonly pollIntervalMs: number;
    readonly testTimeoutMs: number;
    readonly cleanupTimeoutMs: number;
    readonly requireArchive: boolean;
    readonly runId: string;
    readonly issuerParty?: string;
    readonly ownerParty?: string;
}

let invocationRunId: string | undefined;

export function readLiveFuzzConfig(): LiveFuzzConfig {
    const issuerParty = process.env.FUZZ_LIVE_ISSUER_PARTY;

    const ownerParty = process.env.FUZZ_LIVE_OWNER_PARTY;

    if ((issuerParty === undefined) !== (ownerParty === undefined)) {
        throw new Error(
            "FUZZ_LIVE_ISSUER_PARTY and FUZZ_LIVE_OWNER_PARTY must be supplied together.",
        );
    }

    return {
        enabled: process.env.SDK_TEST_ENABLE_LIVE_FUZZING === "1",
        ...propertyParameters({ defaultNumRuns: 20 }),
        maxCommands: parsePositiveInteger(
            "FUZZ_LIVE_MAX_COMMANDS",
            process.env.FUZZ_LIVE_MAX_COMMANDS,
            DEFAULT_MAX_COMMANDS,
        ),
        pollTimeoutMs: parsePositiveInteger(
            "FUZZ_LIVE_POLL_TIMEOUT_MS",
            process.env.FUZZ_LIVE_POLL_TIMEOUT_MS,
            DEFAULT_POLL_TIMEOUT_MS,
        ),
        pollIntervalMs: parsePositiveInteger(
            "FUZZ_LIVE_POLL_INTERVAL_MS",
            process.env.FUZZ_LIVE_POLL_INTERVAL_MS,
            DEFAULT_POLL_INTERVAL_MS,
        ),
        testTimeoutMs: parsePositiveInteger(
            "FUZZ_LIVE_TEST_TIMEOUT_MS",
            process.env.FUZZ_LIVE_TEST_TIMEOUT_MS,
            DEFAULT_TEST_TIMEOUT_MS,
        ),
        cleanupTimeoutMs: parsePositiveInteger(
            "FUZZ_LIVE_CLEANUP_TIMEOUT_MS",
            process.env.FUZZ_LIVE_CLEANUP_TIMEOUT_MS,
            DEFAULT_CLEANUP_TIMEOUT_MS,
        ),
        requireArchive: parseBoolean(
            "FUZZ_LIVE_REQUIRE_ARCHIVE",
            process.env.FUZZ_LIVE_REQUIRE_ARCHIVE,
        ),
        runId: getRunId(),
        issuerParty,
        ownerParty,
    };
}

function getRunId(): string {
    if (process.env.FUZZ_LIVE_RUN_ID !== undefined) {
        return process.env.FUZZ_LIVE_RUN_ID;
    }

    invocationRunId ??= `live-fuzz-${Date.now().toString(36)}-${randomBytes(4).toString("hex")}`;

    return invocationRunId;
}

function parsePositiveInteger(
    key: string,
    value: string | undefined,
    fallback: number,
): number {
    if (value === undefined) {
        return fallback;
    } else if (!/^[1-9]\d*$/.test(value)) {
        throw new Error(`${key} must be a positive safe integer.`);
    }

    const parsed = Number(value);

    if (!Number.isSafeInteger(parsed)) {
        throw new Error(`${key} must be a positive safe integer.`);
    }

    return parsed;
}

function parseBoolean(key: string, value: string | undefined): boolean {
    if (value === undefined) {
        return false;
    } else if (value === "1" || value.toLowerCase() === "true") {
        return true;
    } else if (value === "0" || value.toLowerCase() === "false") {
        return false;
    }

    throw new Error(`${key} must be true, false, 1, or 0.`);
}
