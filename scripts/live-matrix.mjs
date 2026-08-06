import { execFile, spawn } from "node:child_process";
import { existsSync, mkdirSync, createWriteStream } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const repoRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));

const logDir = join(repoRoot, ".generated", "live-matrix");

/**
 * Boots every localnet configuration in turn and runs the live suite against each — the suite never
 * depends on a manually started node. All legs run the same splice version; auth- and TLS-specific specs
 * activate on the legs that provide their preconditions, so every configuration is genuinely exercised.
 *
 * Usage: node scripts/live-matrix.mjs [--configs plain,es256,tls,es256-tls] [--keep]
 */
const ALL_SPECS = [
    "tests/live/specs/live-connectivity.test.ts",
    "tests/live/specs/live-system-services.test.ts",
    "tests/live/specs/live-package-services.test.ts",
    "tests/live/specs/live-package-management.test.ts",
    "tests/live/specs/live-participant-services.test.ts",
    "tests/live/specs/live-party-management.test.ts",
    "tests/live/specs/live-seeded-context.test.ts",
    "tests/live/specs/live-external-party-management.test.ts",
    "tests/live/specs/live-query-regressions.test.ts",
    "tests/live/specs/live-query-parity.test.ts",
    "tests/live/specs/live-auth-token-lifecycle.test.ts",
    "tests/live/specs/live-tls-grpc.test.ts",
];

// TLS legs verify the gRPC surface end-to-end; the JSON-transport seeded specs still assume plain HTTP,
// so those legs run the gRPC-focused subset until the JSON environment learns TLS.
const TLS_LEG_SPECS = [
    "tests/live/specs/live-tls-grpc.test.ts",
    "tests/live/specs/live-auth-token-lifecycle.test.ts",
];

const CONFIGS = {
    "plain": { env: {}, auth: "none", tls: false, pqs: true, specs: ALL_SPECS },
    "no-pqs": { env: { LOCALNET_PQS: "0" }, auth: "none", tls: false, pqs: false, specs: ALL_SPECS },
    "es256": { env: { LOCALNET_ES256_JWT: "1" }, auth: "es256", tls: false, pqs: true, specs: ALL_SPECS },
    "tls": { env: { LOCALNET_TLS: "1" }, auth: "none", tls: true, pqs: true, specs: TLS_LEG_SPECS },
    "es256-tls": { env: { LOCALNET_ES256_JWT: "1", LOCALNET_TLS: "1" }, auth: "es256", tls: true, pqs: true, specs: TLS_LEG_SPECS },
};

function resolveQuickstartDir() {
    const candidates = [
        process.env.CN_QUICKSTART_DIR,
        resolve(repoRoot, "..", "cn-quickstart", "quickstart"),
        resolve(repoRoot, "..", "..", "cn-quickstart", "quickstart"),
    ].filter(Boolean);

    for (const candidate of candidates) {
        if (existsSync(join(candidate, "compose.yaml"))) {
            return candidate;
        }
    }

    throw new Error("CN Quickstart checkout not found. Set CN_QUICKSTART_DIR.");
}

function runToLogAsync(command, args, env, logPath) {
    return new Promise((resolvePromise) => {
        const log = createWriteStream(logPath, { flags: "a" });

        const child = spawn(command, args, { cwd: repoRoot, env: { ...process.env, ...env } });

        child.stdout.pipe(log, { end: false });
        child.stderr.pipe(log, { end: false });
        child.on("close", (code) => {
            log.end();
            resolvePromise(code ?? 1);
        });
    });
}

async function mintTokenAsync(ttlSeconds) {
    const { stdout } = await execFileAsync("node", [
        join(repoRoot, "node", "es256-jwt.mjs"),
        "mint",
        "--private-key-path", join(repoRoot, ".generated", "localnet-es256", "es256-private-key.pem"),
        "--subject", process.env.LOCALNET_ES256_SUBJECT ?? "ledger-api-user",
        "--audience", "https://canton.network.global/es256",
        "--ttl-seconds", String(ttlSeconds),
    ]);

    return stdout.trim();
}

async function runLegAsync(name, config, quickstartDir) {
    const startEnv = { CN_QUICKSTART_DIR: quickstartDir, IMAGE_TAG: process.env.IMAGE_TAG ?? "0.7.0", ...config.env };

    const logPath = join(logDir, `${name}.log`);

    console.log(`\n=== [${name}] stopping any running localnet...`);

    await runToLogAsync("bash", [join(repoRoot, "node", "stop-local.sh")], startEnv, logPath);

    console.log(`=== [${name}] starting localnet (${JSON.stringify(config.env)})...`);

    const startCode = await runToLogAsync("bash", [join(repoRoot, "node", "start-local.sh")], startEnv, logPath);

    if (startCode !== 0) {
        console.error(`=== [${name}] localnet failed to start (exit ${startCode}); see ${logPath}`);

        return { name, ok: false, reason: "localnet-start" };
    }

    const testEnv = { SDK_TEST_PQS_AVAILABLE: config.pqs ? "1" : "0" };

    if (config.auth === "es256") {
        const token = await mintTokenAsync(600);

        testEnv.SDK_TEST_LEDGER_BEARER_TOKEN = token;
        testEnv.SDK_TEST_LEDGER_ADMIN_BEARER_TOKEN = token;
        testEnv.SDK_TEST_PARTICIPANT_ADMIN_BEARER_TOKEN = token;
        testEnv.SDK_TEST_LOCALNET_AUTH = "es256";
    }

    if (config.tls) {
        testEnv.SDK_TEST_GRPC_CHANNEL_SECURITY = "tls";
        testEnv.SDK_TEST_GRPC_TLS_ROOT_CERT_PATH = join(repoRoot, ".generated", "localnet-tls", "ca.crt");
    }

    console.log(`=== [${name}] running ${config.specs.length} spec file(s)...`);

    const vitestCode = await runToLogAsync(
        "npx",
        ["vitest", "run", ...config.specs, "--maxWorkers=1"],
        testEnv,
        logPath,
    );

    console.log(`=== [${name}] ${vitestCode === 0 ? "PASSED" : `FAILED (exit ${vitestCode}); see ${logPath}`}`);

    if (vitestCode !== 0) {
        // Capture the participant-side story so a failed leg explains itself instead of just timing out.
        for (const container of ["canton", "splice", "splice-onboarding", "pqs-app-provider"]) {
            await runToLogAsync("bash", ["-c", `echo; echo "=== docker logs --tail 120 ${container} ==="; docker logs --tail 120 ${container} 2>&1 || true`], {}, logPath);
        }
    }

    return { name, ok: vitestCode === 0, reason: vitestCode === 0 ? undefined : "tests" };
}

const requested = (process.argv.find((argument) => argument.startsWith("--configs="))?.slice("--configs=".length) ?? "plain,no-pqs,es256,tls,es256-tls")
    .split(",")
    .map((value) => value.trim())
    .filter((value) => value.length > 0);

for (const name of requested) {
    if (!(name in CONFIGS)) {
        console.error(`Unknown config '${name}'. Known: ${Object.keys(CONFIGS).join(", ")}`);
        process.exit(2);
    }
}

mkdirSync(logDir, { recursive: true });

const quickstartDir = resolveQuickstartDir();

const results = [];

for (const name of requested) {
    results.push(await runLegAsync(name, CONFIGS[name], quickstartDir));
}

if (!process.argv.includes("--keep")) {
    console.log("\n=== stopping localnet...");

    const lastConfig = CONFIGS[requested.at(-1)];

    await runToLogAsync("bash", [join(repoRoot, "node", "stop-local.sh")], { CN_QUICKSTART_DIR: quickstartDir, IMAGE_TAG: process.env.IMAGE_TAG ?? "0.7.0", ...lastConfig.env }, join(logDir, "shutdown.log"));
}

console.log("\n=== live matrix summary");

for (const result of results) {
    console.log(`  ${result.ok ? "PASS" : "FAIL"}  ${result.name}${result.reason && result.reason !== "tests" ? ` (${result.reason})` : ""}`);
}

process.exit(results.every((result) => result.ok) ? 0 : 1);
