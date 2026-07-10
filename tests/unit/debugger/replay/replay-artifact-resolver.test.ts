import { strToU8, zipSync } from "fflate";
import { describe, expect, it } from "vitest";
import { GetDarRequest } from "../../../../src/core/types/requests/get-dar-request.js";
import { GetPackageReferencesRequest } from "../../../../src/core/types/requests/get-package-references-request.js";
import { ParticipantDarDescription } from "../../../../src/core/types/participant-dar-description.js";
import { GetDarResponse } from "../../../../src/core/types/responses/get-dar-response.js";
import { GetPackageReferencesResponse } from "../../../../src/core/types/responses/get-package-references-response.js";
import { ReplayMissingSourceException } from "../../../../src/debugger/index.js";
import { ReplayArtifactResolver } from "../../../../src/debugger/replay/replay-artifact-resolver.js";
import { SampleLfPackageFixture } from "../../../fixtures/daml-lf/sample-lf-package-fixture.js";
import { createSourceMappedDarFixture } from "../../../fixtures/daml-lf/source-mapped-dar-fixture.js";
import { Archive, ArchivePayload, HashFunction } from "../../../../src/transports/grpc/generated/canton/com/digitalasset/daml/lf/archive/daml_lf.js";
import { Package } from "../../../../src/transports/grpc/generated/canton/com/digitalasset/daml/lf/archive/daml_lf2.js";

describe("ReplayArtifactResolver", () => {
    it("resolves required package ids to dar bytes through package references", async () => {
        const resolver = createResolver({
            "pkg-main": createSourceMappedDarFixture({
                packageId: "pkg-main",
            }),
        });

        const resolution = await resolver.resolveAsync(["pkg-main"]);

        expect(resolution.dars).toHaveLength(1);
        expect(resolution.packageIds).toContain("pkg-main");
    });

    it("recursively resolves transitive lf package dependencies", async () => {
        const resolver = createResolver({
            "pkg-main": createSourceMappedDarFixture({
                packageId: "pkg-main",
                importedPackages: ["pkg-dependency"],
            }),
            "pkg-dependency": createSourceMappedDarFixture({
                packageId: "pkg-dependency",
            }),
        });

        const resolution = await resolver.resolveAsync(["pkg-main"]);

        expect(resolution.packageIds).toContain("pkg-dependency");
    });

    it("discovers transitive dependencies from dalf imports when source-map metadata omits them", async () => {
        const resolver = createResolver({
            "pkg-main": createSourceMappedDarFixture({
                packageId: "pkg-main",
                mainDalfBytes: createArchiveBytesWithImportedPackageId(
                    "pkg-main",
                    "pkg-dependency",
                ),
            }),
            "pkg-dependency": createSourceMappedDarFixture({
                packageId: "pkg-dependency",
            }),
        });

        const resolution = await resolver.resolveAsync(["pkg-main"]);

        expect(resolution.packageIds).toContain("pkg-dependency");
    });

    it("includes valid package ids contained in the selected dar", async () => {
        const resolver = createResolver({
            "pkg-main": createSourceMappedDarFixture({
                packageId: "pkg-main",
                additionalEntries: {
                    "extra/Contained.dalf":
                        SampleLfPackageFixture.createLf2ArchiveBytes(),
                },
            }),
        });

        const resolution = await resolver.resolveAsync(["pkg-main"]);

        expect(resolution.packageIds).toContain("pkg-main");
        expect(resolution.packageIds).toContain("sample-hash");
    });

    it("prefers a sibling debug dar when a standard dar lacks source maps", async () => {
        const packagesByDarName: Record<string, Uint8Array> = {
            "pkg-main.dar": createDarFixtureWithoutSourceMap(),
            "pkg-main-debug.dar": createSourceMappedDarFixture({
                packageId: "pkg-main",
            }),
        };

        const resolver = new ReplayArtifactResolver({
            participantPackageService: {
                async getPackageReferencesAsync(
                    request: GetPackageReferencesRequest,
                ): Promise<GetPackageReferencesResponse> {
                    if (request.packageId !== "pkg-main") {
                        return new GetPackageReferencesResponse({ dars: [] });
                    }

                    return new GetPackageReferencesResponse({
                        dars: [
                            new ParticipantDarDescription({
                                main: "pkg-main.dar",
                                name: "pkg-main.dar",
                                version: "1.0.0",
                                description: "standard",
                            }),
                            new ParticipantDarDescription({
                                main: "pkg-main-debug.dar",
                                name: "pkg-main-debug.dar",
                                version: "1.0.0",
                                description: "debug",
                            }),
                        ],
                    });
                },
                async getDarAsync(request: GetDarRequest): Promise<GetDarResponse> {
                    return new GetDarResponse({
                        payload: packagesByDarName[request.mainPackageId],
                    });
                },
            },
        });

        const resolution = await resolver.resolveAsync(["pkg-main"]);

        expect(resolution.dars).toHaveLength(1);
        expect(resolution.dars[0]?.name).toBe("pkg-main-debug.dar");
        expect(resolution.packageIds).toContain("pkg-main");
    });

    it("rejects conflicting duplicate package provenance across dars", async () => {
        const resolver = new ReplayArtifactResolver({
            participantPackageService: {
                async getPackageReferencesAsync(
                    request: GetPackageReferencesRequest,
                ): Promise<GetPackageReferencesResponse> {
                    if (request.packageId !== "pkg-main") {
                        return new GetPackageReferencesResponse({ dars: [] });
                    }

                    return new GetPackageReferencesResponse({
                        dars: [
                            new ParticipantDarDescription({
                                main: "pkg-main-a",
                                name: "main-a",
                                version: "1.0.0",
                                description: "a",
                            }),
                            new ParticipantDarDescription({
                                main: "pkg-main-b",
                                name: "main-b",
                                version: "1.0.0",
                                description: "b",
                            }),
                        ],
                    });
                },
                async getDarAsync(request: GetDarRequest): Promise<GetDarResponse> {
                    return new GetDarResponse({
                        payload: createSourceMappedDarFixture({
                            packageId: "pkg-main",
                            definitionName:
                                request.mainPackageId === "pkg-main-a"
                                    ? "archiveA"
                                    : "archiveB",
                        }),
                    });
                },
            },
        });

        await expect(resolver.resolveAsync(["pkg-main"])).rejects.toThrow(
            ReplayMissingSourceException,
        );
    });
});

function createDarFixtureWithoutSourceMap(): Uint8Array {
    return zipSync({
        "META-INF/MANIFEST.MF": strToU8(
            "Manifest-Version: 1.0\nMain-Dalf: Sample.dalf\n",
        ),
        "Sample.dalf": new Uint8Array([1, 2, 3, 4]),
        "src/Main.daml": strToU8(
            "module Main where\n\narchive : ()\narchive = ()\n",
        ),
    });
}

function createResolver(
    packagesByMainPackageId: Record<string, Uint8Array>,
): ReplayArtifactResolver {
    return new ReplayArtifactResolver({
        participantPackageService: {
            async getPackageReferencesAsync(
                request: GetPackageReferencesRequest,
            ): Promise<GetPackageReferencesResponse> {
                if (!(request.packageId in packagesByMainPackageId)) {
                    return new GetPackageReferencesResponse({ dars: [] });
                }

                return new GetPackageReferencesResponse({
                    dars: [
                        new ParticipantDarDescription({
                            main: request.packageId,
                            name: `${request.packageId}.dar`,
                            version: "1.0.0",
                            description: request.packageId,
                        }),
                    ],
                });
            },
            async getDarAsync(request: GetDarRequest): Promise<GetDarResponse> {
                return new GetDarResponse({
                    payload: packagesByMainPackageId[request.mainPackageId],
                });
            },
        },
    });
}

function createArchiveBytesWithImportedPackageId(
    packageId: string,
    importedPackageId: string,
): Uint8Array {
    const packageBytes = Package.toBinary({
        modules: [
            {
                nameInternedDname: 0,
                synonyms: [],
                dataTypes: [],
                values: [
                    {
                        nameWithType: {
                            nameInternedDname: 1,
                            type: {
                                sum: {
                                    oneofKind: "con",
                                    con: {
                                        tycon: {
                                            module: {
                                                packageId: {
                                                    sum: {
                                                        oneofKind:
                                                            "importedPackageIdInternedStr",
                                                        importedPackageIdInternedStr: 4,
                                                    },
                                                },
                                                moduleNameInternedDname: 2,
                                            },
                                            nameInternedDname: 2,
                                        },
                                        args: [],
                                    },
                                },
                            },
                        },
                        expr: {
                            sum: {
                                oneofKind: "builtinLit",
                                builtinLit: {
                                    sum: {
                                        oneofKind: "textInternedStr",
                                        textInternedStr: 5,
                                    },
                                },
                            },
                        },
                    },
                ],
                templates: [],
                exceptions: [],
                interfaces: [],
            },
        ],
        internedStrings: [
            `${packageId}-package`,
            "1.0.0",
            "Dependency",
            "Module",
            importedPackageId,
            "hello",
            "usesDependency",
            "ForeignType",
        ],
        internedDottedNames: [
            {
                segmentsInternedStr: [2, 3],
            },
            {
                segmentsInternedStr: [6],
            },
            {
                segmentsInternedStr: [7],
            },
        ],
        metadata: {
            nameInternedStr: 0,
            versionInternedStr: 1,
        },
        internedTypes: [],
        internedKinds: [],
        internedExprs: [],
        importsSum: {
            oneofKind: undefined,
        },
    });

    const payloadBytes = ArchivePayload.toBinary({
        minor: "1",
        patch: 0,
        sum: {
            oneofKind: "damlLf2",
            damlLf2: packageBytes,
        },
    });

    return Archive.toBinary({
        hashFunction: HashFunction.SHA256,
        payload: payloadBytes,
        hash: packageId,
    });
}
