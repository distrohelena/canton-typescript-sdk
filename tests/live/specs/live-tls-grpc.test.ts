import { afterAll, describe, expect, it } from "vitest";
import {
    AllocatePartyRequest,
    CantonManager,
    MemoryQueryCache,
    QuerySource,
} from "../../../src/index.js";
import { createLiveTestEnvironment } from "../runtime/live-test-environment.js";
import { TransportKind } from "../../../src/index.js";
import { createLiveIouAsync, grantLedgerUserActAsAsync } from "../runtime/live-query-manager-factory.js";
import { getLiveQueryModelFixtureAsync } from "../runtime/live-query-model-fixture.js";
import { UploadDarFileRequest } from "../../../src/transports/grpc/generated/canton/com/daml/ledger/api/v2/admin/package_management_service.js";

// The matrix runner sets these when the booted localnet serves gRPC over TLS with a generated CA.
const tlsActive = (process.env.SDK_TEST_GRPC_CHANNEL_SECURITY ?? "").toLowerCase() === "tls";

/**
 * Proves the full gRPC surface works over TLS with a custom root CA: channel establishment against the
 * localnet's generated certificate, admin writes (DAR upload, party allocation, rights), command
 * submission, ACS prewarm, and a cache-served typed query — all through the TLS channel.
 */
describe.skipIf(!tlsActive)("live gRPC over TLS", () => {
    let manager: CantonManager | undefined;

    afterAll(async () => {
        await manager?.disposeAsync();
    }, 30_000);

    it("runs writes, prewarm, and typed queries through a TLS channel with the localnet CA", async () => {
        expect((process.env.SDK_TEST_GRPC_TLS_ROOT_CERT_PATH ?? "").length).toBeGreaterThan(0);

        const environment = createLiveTestEnvironment({ transportKind: TransportKind.grpc });

        manager = new CantonManager({
            grpc: environment.options,
            querySource: QuerySource.grpc,
            cache: { store: new MemoryQueryCache(), ttlMs: 600_000 },
        });

        const model = await getLiveQueryModelFixtureAsync();

        await manager.grpc.packageManagementService.uploadDarFileAsync(
            UploadDarFileRequest.create({ darFile: model.darBytes }),
        );

        const partyHint = `sdk-tls-${Date.now()}`;

        const party = (await manager.grpc.partyManagementService.allocatePartyAsync(
            new AllocatePartyRequest({ partyIdHint: partyHint, displayName: partyHint }),
        )).party;

        await grantLedgerUserActAsAsync(manager, party);

        const contractId = await createLiveIouAsync(manager, party, party, model.packageId);

        await expect(manager.query.cacheContracts({ parties: [party] })).resolves.toMatchObject({ cached: true, refresh: "full" });

        const rows = await manager.query.contracts.findMany({
            parties: [party],
            where: { active: true },
            select: { contractId: true },
        });

        expect(rows.map((row) => row.contractId)).toContain(contractId);
    }, 300_000);
});
