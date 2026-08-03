import { describe, expect, it, vi } from "vitest";
import { Archive } from "../../../src/transports/grpc/generated/canton/com/digitalasset/daml/lf/archive/daml_lf.js";
import { HashFunction } from "../../../src/transports/grpc/generated/canton/com/daml/ledger/api/v2/package_service.js";
import { SampleLfPackageFixture } from "../../fixtures/daml-lf/sample-lf-package-fixture.js";
import { GrpcPackageRelationReader } from "../../../src/query/grpc/grpc-package-relation-reader.js";

function packageResponse(id = "sample-hash") {
    const archive = Archive.fromBinary(SampleLfPackageFixture.createLf2ArchiveBytes());

    return {
        hashFunction: HashFunction.SHA256,
        archivePayload: archive.payload,
        hash: id,
    };
}

describe("GrpcPackageRelationReader", () => {
    it("loads all listed LF2 packages and maps package/template/choice metadata", async () => {
        const listPackagesAsync = vi.fn(async () => ({ packageIds: ["sample-hash"] }));

        const getPackageAsync = vi.fn(async ({ packageId }: { packageId: string }) => packageResponse(packageId));

        const reader = new GrpcPackageRelationReader({ listPackagesAsync, getPackageAsync });

        await expect(reader.readAllAsync()).resolves.toEqual([expect.objectContaining({
            id: "sample-hash",
            name: "sample-package",
            version: "1.0.0",
            templates: [expect.objectContaining({
                moduleName: "Sample.Module",
                entityName: "Iou",
                payloadType: "template",
                aliases: ["Sample.Module:Iou"],
                templateFqn: "sample-package:Sample.Module:Iou",
                choices: [expect.objectContaining({
                    choice: "Transfer",
                    consuming: true,
                    aliases: ["Sample.Module:Iou:Transfer"],
                    choiceFqn: "sample-package:Sample.Module:Iou:Transfer",
                })],
            })],
        })]);
        expect(listPackagesAsync).toHaveBeenCalledExactlyOnceWith({});
        expect(getPackageAsync).toHaveBeenCalledExactlyOnceWith({ packageId: "sample-hash" });
    });

    it("loads only referenced packages and deduplicates repeated package identities in one query", async () => {
        const listPackagesAsync = vi.fn(async () => ({ packageIds: ["ignored"] }));

        const getPackageAsync = vi.fn(async ({ packageId }: { packageId: string }) => packageResponse(packageId));

        const reader = new GrpcPackageRelationReader({ listPackagesAsync, getPackageAsync });

        const packages = await reader.readPackagesAsync(["second", "sample-hash", "second"]);

        expect(packages.map((item) => item.id)).toEqual(["sample-hash", "second"]);
        expect(listPackagesAsync).not.toHaveBeenCalled();
        expect(getPackageAsync).toHaveBeenCalledTimes(2);
        expect(getPackageAsync.mock.calls).toEqual([[{ packageId: "second" }], [{ packageId: "sample-hash" }]]);
    });

    it("turns malformed package data into an explicit typed failure without a partial result", async () => {
        const reader = new GrpcPackageRelationReader({
            listPackagesAsync: async () => ({ packageIds: ["bad"] }),
            getPackageAsync: async () => ({ hashFunction: HashFunction.SHA256, archivePayload: new Uint8Array([1]), hash: "bad" }),
        });

        await expect(reader.readAllAsync()).rejects.toMatchObject({ name: "GrpcPackageRelationError", packageId: "bad" });
    });
});
