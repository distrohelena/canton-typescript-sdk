import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

interface PackageJsonShape {
    readonly bin?: Record<string, string>;
    readonly files?: readonly string[];
    readonly license?: string;
    readonly name?: string;
    readonly private?: boolean;
    readonly publishConfig?: {
        readonly access?: string;
    };
    readonly scripts?: Record<string, string>;
}

async function readPackageJsonAsync(): Promise<PackageJsonShape> {
    const packageJsonPath = new URL("../../../package.json", import.meta.url);

    const packageJsonContent = await readFile(packageJsonPath, "utf8");

    return JSON.parse(packageJsonContent) as PackageJsonShape;
}

async function loadVerifyPackModuleAsync(): Promise<{
    createNpmPackArguments: (
        cacheDirectoryPath: string,
        packDestinationPath: string,
    ) => string[];
    getHelpText: () => string;
    getExpectedExportKeys: () => readonly string[];
    getExpectedLocalnetBinEntries: () => Readonly<Record<string, string>>;
    getPackedTarballFileName: (packageName: string, packageVersion: string) => string;
    isAllowedPackedPath: (value: string) => boolean;
}> {
    const verifyPackModulePath = new URL(
        "../../../scripts/verify-npm-pack.mjs",
        import.meta.url,
    );

    return (await import(verifyPackModulePath.href)) as {
        createNpmPackArguments: (
            cacheDirectoryPath: string,
            packDestinationPath: string,
        ) => string[];
        getHelpText: () => string;
        getExpectedExportKeys: () => readonly string[];
        getExpectedLocalnetBinEntries: () => Readonly<Record<string, string>>;
        getPackedTarballFileName: (
            packageName: string,
            packageVersion: string,
        ) => string;
        isAllowedPackedPath: (value: string) => boolean;
    };
}

describe("npm publish metadata", () => {
    it("matches the intended public package identity", async () => {
        const packageJson = await readPackageJsonAsync();

        expect(packageJson.name).toBe("@distrohelena/canton-typescript-sdk");
        expect(packageJson.private).toBeUndefined();
        expect(packageJson.license).toBe("Apache-2.0");
        expect(packageJson.publishConfig?.access).toBe("public");
        expect(packageJson.files).toEqual([
            "dist",
            "node",
            "README.md",
            "LICENSE",
        ]);
        expect(packageJson.bin).toEqual({
            "canton-localnet-start": "node/start-local.sh",
            "canton-localnet-stop": "node/stop-local.sh",
        });
        expect(packageJson.scripts?.build).toBe(
            "node ./scripts/clean-dist.mjs && tsc -p tsconfig.json",
        );
        expect(packageJson.scripts?.["test:stop-local-script"]).toBe(
            "bash node/test-stop-local.sh",
        );
    });

    it("wires the pack verification script into package metadata", async () => {
        const packageJson = await readPackageJsonAsync();

        expect(packageJson.scripts?.["verify:pack"]).toBe(
            "node ./scripts/verify-npm-pack.mjs",
        );
    });
});

describe("npm pack verifier", () => {
    it("describes itself through the help output", async () => {
        const verifyPackModule = await loadVerifyPackModuleAsync();

        expect(verifyPackModule.getHelpText()).toContain("package verification");
    });

    it("requires the experimental testing entry point in packed exports", async () => {
        const verifyPackModule = await loadVerifyPackModuleAsync();

        expect(verifyPackModule.getExpectedExportKeys()).toContain("./testing");
    });

    it("requires both published localnet launcher commands", async () => {
        const verifyPackModule = await loadVerifyPackModuleAsync();

        expect(verifyPackModule.getExpectedLocalnetBinEntries()).toEqual({
            "canton-localnet-start": "node/start-local.sh",
            "canton-localnet-stop": "node/stop-local.sh",
        });
    });

    it("recognizes allowed packed paths", async () => {
        const verifyPackModule = await loadVerifyPackModuleAsync();

        expect(
            verifyPackModule.isAllowedPackedPath("package/dist/index.js"),
        ).toBe(true);
        expect(verifyPackModule.isAllowedPackedPath("package/dist/src/index.js")).toBe(
            false,
        );
        expect(
            verifyPackModule.isAllowedPackedPath(
                "package/dist/tests/unit/example.test.js",
            ),
        ).toBe(false);
        expect(
            verifyPackModule.isAllowedPackedPath("package/node/start-local.sh"),
        ).toBe(true);
        expect(
            verifyPackModule.isAllowedPackedPath("package/node/stop-local.sh"),
        ).toBe(true);
        expect(
            verifyPackModule.isAllowedPackedPath(
                "package/node/test-start-local.sh",
            ),
        ).toBe(true);
        expect(
            verifyPackModule.isAllowedPackedPath(
                "package/node/test-stop-local.sh",
            ),
        ).toBe(true);
        expect(
            verifyPackModule.isAllowedPackedPath("package/node/es256-jwt.mjs"),
        ).toBe(true);
        expect(
            verifyPackModule.isAllowedPackedPath("package/node/unexpected.sh"),
        ).toBe(false);
        expect(verifyPackModule.isAllowedPackedPath("package/src/index.ts")).toBe(
            false,
        );
    });

    it("forces npm pack to use an explicit cache directory", async () => {
        const verifyPackModule = await loadVerifyPackModuleAsync();

        expect(
            verifyPackModule.createNpmPackArguments(
                "/tmp/npm-pack-cache",
                "/tmp/npm-pack-output",
            ),
        ).toEqual([
            "pack",
            "--json",
            "--cache",
            "/tmp/npm-pack-cache",
            "--pack-destination",
            "/tmp/npm-pack-output",
        ]);
    });

    it("computes the packed tarball file name from package identity", async () => {
        const verifyPackModule = await loadVerifyPackModuleAsync();

        expect(
            verifyPackModule.getPackedTarballFileName(
                "@distrohelena/canton-typescript-sdk",
                "0.1.0",
            ),
        ).toBe("distrohelena-canton-typescript-sdk-0.1.0.tgz");
    });
});
