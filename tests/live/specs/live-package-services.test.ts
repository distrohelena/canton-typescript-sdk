import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
    CantonClient,
    GetPackageRequest,
    GetPackageStatusRequest,
    ListPackagesRequest,
    PackageStatus,
    TransportKind,
} from "../../../src/index.js";
import { createLiveClient } from "../runtime/live-client-factory.js";
import { createLiveTestEnvironment } from "../runtime/live-test-environment.js";
import { getLiveSeededContextAsync } from "../runtime/live-seeded-context.js";

describe("live package services", () => {
    let grpcClient: CantonClient;

    beforeAll(() => {
        grpcClient = createLiveClient(
            createLiveTestEnvironment({
                transportKind: TransportKind.grpc,
            }),
        );
    });

    afterAll(async () => {
        await grpcClient.disposeAsync();
    });

    it("lists the seeded package ids", async () => {
        const seeded = await getLiveSeededContextAsync();

        const response = await grpcClient.packageService.listPackagesAsync(
            new ListPackagesRequest(),
        );

        expect(response.packageIds).toEqual(
            expect.arrayContaining([...seeded.packageIds]),
        );
    });

    it("reads a seeded package archive", async () => {
        const seeded = await getLiveSeededContextAsync();

        const response = await grpcClient.packageService.getPackageAsync(
            new GetPackageRequest({
                packageId: seeded.packageIds[0],
            }),
        );

        expect(response.hash).toBe(seeded.packageIds[0]);
        expect(response.archivePayload.length).toBeGreaterThan(0);
    });

    it("reads the seeded package registration status", async () => {
        const seeded = await getLiveSeededContextAsync();

        const response = await grpcClient.packageService.getPackageStatusAsync(
            new GetPackageStatusRequest({
                packageId: seeded.packageIds[0],
            }),
        );

        expect(response.packageStatus).toBe(PackageStatus.registered);
    });
});
