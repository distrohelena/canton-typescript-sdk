import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { afterAll, describe, expect, it } from "vitest";
import {
    AllocatePartyRequest,
    BearerTokenAuthProvider,
    CantonClientOptions,
    CantonManager,
    MemoryQueryCache,
    QuerySource,
    RefreshingBearerTokenAuthProvider,
    TransportKind,
} from "../../../src/index.js";
import type { IAuthProvider } from "../../../src/core/auth/auth-provider.interface.js";
import { getLiveEndpointDefaults, resolveLiveGrpcChannelSecurity, resolveLiveTlsRootCertificates } from "../fixtures/live-endpoint-defaults.js";
import { createLiveIouAsync, grantLedgerUserActAsAsync } from "../runtime/live-query-manager-factory.js";
import { getLiveQueryModelFixtureAsync } from "../runtime/live-query-model-fixture.js";
import { UploadDarFileRequest } from "../../../src/transports/grpc/generated/canton/com/daml/ledger/api/v2/admin/package_management_service.js";

const execFileAsync = promisify(execFile);

const mintScriptPath = fileURLToPath(new URL("../../../node/es256-jwt.mjs", import.meta.url));

const privateKeyPath = fileURLToPath(new URL("../../../.generated/localnet-es256/es256-private-key.pem", import.meta.url));

// The matrix runner sets SDK_TEST_LOCALNET_AUTH=es256 when the booted localnet validates ES256 JWTs; a
// mere key file on disk is not enough, since a no-auth localnet accepts expired tokens and would fail the
// UNAUTHENTICATED expectation.
const es256Active = process.env.SDK_TEST_LOCALNET_AUTH === "es256";

async function mintTokenAsync(ttlSeconds: number): Promise<string> {
    const { stdout } = await execFileAsync("node", [
        mintScriptPath,
        "mint",
        "--private-key-path", privateKeyPath,
        "--subject", process.env.LOCALNET_ES256_SUBJECT ?? "ledger-api-user",
        "--audience", "https://canton.network.global/es256",
        "--ttl-seconds", String(ttlSeconds),
    ]);

    return stdout.trim();
}

function managerWith(provider: IAuthProvider): CantonManager {
    const defaults = getLiveEndpointDefaults(TransportKind.grpc);

    return new CantonManager({
        grpc: new CantonClientOptions({
            transportKind: TransportKind.grpc,
            ledgerEndpoint: process.env.SDK_TEST_LEDGER_ENDPOINT ?? defaults.ledgerEndpoint,
            ledgerAdminEndpoint: process.env.SDK_TEST_LEDGER_ADMIN_ENDPOINT ?? defaults.ledgerAdminEndpoint,
            participantAdminEndpoint: process.env.SDK_TEST_PARTICIPANT_ADMIN_ENDPOINT ?? defaults.participantAdminEndpoint,
            grpcChannelSecurity: resolveLiveGrpcChannelSecurity(defaults.grpcChannelSecurity),
            grpcTlsRootCertificates: resolveLiveTlsRootCertificates(),
            ledgerAuthProvider: provider,
            ledgerAdminAuthProvider: provider,
            participantAdminAuthProvider: provider,
        }),
        querySource: QuerySource.grpc,
        cache: { store: new MemoryQueryCache(), ttlMs: 600_000 },
    });
}

function delayAsync(milliseconds: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

/**
 * Reproduces the production failure where a TTL-driven cache re-warm died with UNAUTHENTICATED: auth
 * headers are fetched per request, but a static bearer provider keeps presenting the boot-time token
 * forever, so the first refresh after its exp claim is rejected. Only runs against an ES256 localnet
 * (LOCALNET_ES256_JWT=1), whose minting key lets the test control token lifetimes exactly.
 */
describe.skipIf(!es256Active)("live bearer token lifecycle", () => {
    const managers: CantonManager[] = [];

    afterAll(async () => {
        await Promise.allSettled(managers.map((manager) => manager.disposeAsync()));
    }, 30_000);

    it("static tokens die at expiry mid-lifecycle; a refreshing provider keeps re-warms alive", async () => {
        expect(existsSync(privateKeyPath)).toBe(true);

        // Seed with a comfortably long-lived token.
        const setupManager = managerWith(new BearerTokenAuthProvider(await mintTokenAsync(300)));

        managers.push(setupManager);

        const model = await getLiveQueryModelFixtureAsync();

        await setupManager.grpc.packageManagementService.uploadDarFileAsync(
            UploadDarFileRequest.create({ darFile: model.darBytes }),
        );

        const partyHint = `sdk-auth-lifecycle-${Date.now()}`;

        const party = (await setupManager.grpc.partyManagementService.allocatePartyAsync(
            new AllocatePartyRequest({ partyIdHint: partyHint, displayName: partyHint }),
        )).party;

        await grantLedgerUserActAsAsync(setupManager, party);
        await createLiveIouAsync(setupManager, party, party, model.packageId);

        // A manager whose static token outlives the first prewarm but not the re-warm.
        const shortLived = managerWith(new BearerTokenAuthProvider(await mintTokenAsync(4)));

        managers.push(shortLived);

        await expect(shortLived.query.cacheContracts({ parties: [party] })).resolves.toMatchObject({ cached: true });

        await delayAsync(6_000);

        // The exact production symptom: the TTL re-warm's full refresh dies UNAUTHENTICATED.
        await expect(shortLived.query.cacheContracts({ parties: [party] })).rejects.toThrow(/UNAUTHENTICATED/);

        // Same lifecycle with a refreshing provider: every request mints a current token, so the re-warm
        // that just failed above succeeds.
        const refreshing = managerWith(new RefreshingBearerTokenAuthProvider(async () => mintTokenAsync(4)));

        managers.push(refreshing);

        await expect(refreshing.query.cacheContracts({ parties: [party] })).resolves.toMatchObject({ cached: true });

        await delayAsync(6_000);

        await expect(refreshing.query.cacheContracts({ parties: [party] })).resolves.toMatchObject({ cached: true, refresh: "full" });
    }, 300_000);
});
