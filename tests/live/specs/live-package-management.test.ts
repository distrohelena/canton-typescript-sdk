import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
    CantonClient,
    ListPackagesRequest,
    TransportKind,
    UploadDarFileRequest,
} from "../../../src/index.js";
import { createLiveClient } from "../runtime/live-client-factory.js";
import { createLiveTestEnvironment } from "../runtime/live-test-environment.js";
import { getLiveSeededContextAsync } from "../runtime/live-seeded-context.js";

describe("live package management", () => {
    let grpcClient: CantonClient;

    let jsonClient: CantonClient;

    beforeAll(() => {
        grpcClient = createLiveClient(
            createLiveTestEnvironment({
                transportKind: TransportKind.grpc,
            }),
        );
        jsonClient = createLiveClient(
            createLiveTestEnvironment({
                transportKind: TransportKind.json,
            }),
        );
    });

    afterAll(async () => {
        await Promise.allSettled([
            grpcClient.disposeAsync(),
            jsonClient.disposeAsync(),
        ]);
    });

    it("uploads the live dar through json and keeps the packages visible", async () => {
        const seeded = await getLiveSeededContextAsync();

        await expect(
            jsonClient.packageManagementService.uploadDarFileAsync(
                new UploadDarFileRequest({
                    bytes: seeded.uploadedDarBytes,
                }),
            ),
        ).resolves.toBeDefined();

        const packages = await grpcClient.packageService.listPackagesAsync(
            new ListPackagesRequest(),
        );

        expect(packages.packageIds).toEqual(
            expect.arrayContaining([...seeded.packageIds]),
        );
    });
});
