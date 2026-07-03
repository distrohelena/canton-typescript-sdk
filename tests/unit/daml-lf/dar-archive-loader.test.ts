import { describe, expect, it } from "vitest";
import {
    DamlLfArchiveException,
    DarArchiveLoader,
} from "../../../src/daml-lf/index.js";

const sampleDarBytes = new Uint8Array([
    80, 75, 3, 4, 20, 0, 0, 0, 8, 0, 180, 108, 227, 92, 88, 33, 88, 228,
    46, 0, 0, 0, 46, 0, 0, 0, 20, 0, 0, 0, 77, 69, 84, 65, 45, 73, 78, 70,
    47, 77, 65, 78, 73, 70, 69, 83, 84, 46, 77, 70, 243, 77, 204, 203, 76,
    75, 45, 46, 209, 13, 75, 45, 42, 206, 204, 207, 179, 82, 48, 212, 51,
    224, 242, 77, 204, 204, 211, 117, 73, 204, 73, 179, 82, 8, 78, 204, 45,
    200, 73, 213, 75, 1, 114, 184, 184, 0, 80, 75, 3, 4, 20, 0, 0, 0, 8, 0,
    180, 108, 227, 92, 153, 254, 140, 177, 6, 0, 0, 0, 4, 0, 0, 0, 11, 0, 0,
    0, 83, 97, 109, 112, 108, 101, 46, 100, 97, 108, 102, 75, 73, 204, 73,
    3, 0, 80, 75, 1, 2, 20, 3, 20, 0, 0, 0, 8, 0, 180, 108, 227, 92, 88, 33,
    88, 228, 46, 0, 0, 0, 46, 0, 0, 0, 20, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    128, 1, 0, 0, 0, 0, 77, 69, 84, 65, 45, 73, 78, 70, 47, 77, 65, 78, 73,
    70, 69, 83, 84, 46, 77, 70, 80, 75, 1, 2, 20, 3, 20, 0, 0, 0, 8, 0, 180,
    108, 227, 92, 153, 254, 140, 177, 6, 0, 0, 0, 4, 0, 0, 0, 11, 0, 0, 0,
    0, 0, 0, 0, 0, 0, 0, 0, 128, 1, 96, 0, 0, 0, 83, 97, 109, 112, 108, 101,
    46, 100, 97, 108, 102, 80, 75, 5, 6, 0, 0, 0, 0, 2, 0, 2, 0, 123, 0, 0,
    0, 143, 0, 0, 0, 0, 0,
]);

describe("DarArchiveLoader", () => {
    it("loads the manifest and dalf package entries from a dar archive", async () => {
        const loader = new DarArchiveLoader() as DarArchiveLoader & {
            loadDarOrThrowAsync(bytes: Uint8Array): Promise<{
                manifest: { mainDalfPath: string };
                mainPackageEntry: { path: string };
                packageEntries: readonly { path: string }[];
            }>;
        };

        const archive = await loader.loadDarOrThrowAsync(sampleDarBytes);

        expect(archive.mainPackageEntry.path).toBe("Sample.dalf");
        expect(archive.packageEntries).toHaveLength(1);
        expect(archive.manifest.mainDalfPath).toBe("Sample.dalf");
    });

    it("rejects archives without a valid manifest", async () => {
        const loader = new DarArchiveLoader() as DarArchiveLoader & {
            loadDarOrThrowAsync(bytes: Uint8Array): Promise<unknown>;
        };

        await expect(
            loader.loadDarOrThrowAsync(new Uint8Array([1, 2, 3])),
        ).rejects.toThrow(DamlLfArchiveException);
    });
});
