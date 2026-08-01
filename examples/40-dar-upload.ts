import { ledgerApiV2 } from "@distrohelena/canton-typescript-sdk/protobuf";
import {
    loadExampleApplicationFixtureAsync,
    provePackageVisibility,
} from "./shared/application-fixture.js";
import { createExampleClient } from "./shared/localnet.js";
import { runExampleAsync } from "./shared/run.js";

runExampleAsync("dar-upload", async () => {
    const client = createExampleClient();

    try {
        const fixture = await loadExampleApplicationFixtureAsync();

        console.warn(
            "Warning: uploading a DAR creates durable localnet package state and is not cleaned up.",
        );

        const before = await client.packageService.listPackagesAsync(
            ledgerApiV2.ListPackagesRequest.create(),
        );

        await client.packageManagementService.uploadDarFileAsync(
            ledgerApiV2.admin.UploadDarFileRequest.create({
                darFile: fixture.darBytes,
            }),
        );

        const after = await client.packageService.listPackagesAsync(
            ledgerApiV2.ListPackagesRequest.create(),
        );

        const { alreadyInstalled } = provePackageVisibility({
            mainPackageId: fixture.mainPackageId,
            before: before.packageIds,
            after: after.packageIds,
        });

        console.log(`Main package ID: ${fixture.mainPackageId}`);
        console.log(
            `Package visibility: ${alreadyInstalled ? "already installed" : "newly visible"}`,
        );
    } finally {
        await client.disposeAsync();
    }
});
