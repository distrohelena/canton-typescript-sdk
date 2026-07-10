import { describe, expect, it } from "vitest";
import { GetDarRequest } from "../../../../src/core/types/requests/get-dar-request.js";
import { GetPackageReferencesRequest } from "../../../../src/core/types/requests/get-package-references-request.js";
import { ParticipantDarDescription } from "../../../../src/core/types/participant-dar-description.js";
import { GetDarResponse } from "../../../../src/core/types/responses/get-dar-response.js";
import { GetPackageReferencesResponse } from "../../../../src/core/types/responses/get-package-references-response.js";
import { ReplayMissingSourceException } from "../../../../src/debugger/index.js";
import { ReplayArtifactResolver } from "../../../../src/debugger/replay/replay-artifact-resolver.js";
import { createSourceMappedDarFixture } from "../../../fixtures/daml-lf/source-mapped-dar-fixture.js";

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
