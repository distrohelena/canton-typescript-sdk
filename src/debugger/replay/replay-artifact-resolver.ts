import { createHash } from "node:crypto";
import { GetDarRequest } from "../../core/types/requests/get-dar-request.js";
import { GetPackageReferencesRequest } from "../../core/types/requests/get-package-references-request.js";
import { ParticipantDarDescription } from "../../core/types/participant-dar-description.js";
import { DarArchiveLoader } from "../../daml-lf/container/dar-archive-loader.js";
import { DamlLfPackageLoader } from "../../daml-lf/daml-lf-package-loader.js";
import { DarSourceBundleLoader } from "../../daml-lf/container/dar-source-bundle-loader.js";
import { DamlLfArchiveException } from "../../daml-lf/errors/daml-lf-archive.exception.js";
import { DarSourceMapMetadata } from "../source/dar-source-map-metadata.js";
import { ReplayMissingSourceException } from "../errors/replay-missing-source.exception.js";

interface IParticipantPackageReadService {
    getPackageReferencesAsync(
        request: GetPackageReferencesRequest,
    ): Promise<{ dars: ParticipantDarDescription[] }>;
    getDarAsync(
        request: GetDarRequest,
    ): Promise<{ payload: Uint8Array }>;
}

export class ReplayArtifactResolver {
    private readonly archiveLoader = new DarArchiveLoader();
    private readonly packageLoader = new DamlLfPackageLoader();
    private readonly sourceBundleLoader = new DarSourceBundleLoader();

    public constructor(
        private readonly dependencies: {
            participantPackageService: IParticipantPackageReadService;
        },
    ) {}

    public async resolveAsync(requiredPackageIds: readonly string[]): Promise<{
        dars: readonly ParticipantDarDescription[];
        packageIds: readonly string[];
    }> {
        const pending = [...requiredPackageIds];
        const replayPackageIds = new Set<string>();
        const seenPackageIds = new Set<string>();
        const resolvedDars = new Map<string, ParticipantDarDescription>();
        const packageFingerprints = new Map<string, string>();
        const candidateByDarMainPackageId = new Map<
            string,
            {
                dar: ParticipantDarDescription;
                metadata: DarSourceMapMetadata;
                containedPackageIds: readonly string[];
                importedPackageIds: readonly string[];
            }
        >();
        const darMainPackageIdByContainedPackageId = new Map<string, string>();

        while (pending.length > 0) {
            const packageId = pending.shift();

            if (packageId === undefined || seenPackageIds.has(packageId)) {
                continue;
            }

            seenPackageIds.add(packageId);

            let candidate:
                | {
                      dar: ParticipantDarDescription;
                      metadata: DarSourceMapMetadata;
                      containedPackageIds: readonly string[];
                      importedPackageIds: readonly string[];
                  }
                | undefined;
            const knownDarMainPackageId =
                darMainPackageIdByContainedPackageId.get(packageId);

            if (knownDarMainPackageId !== undefined) {
                candidate =
                    candidateByDarMainPackageId.get(knownDarMainPackageId);
            }

            if (candidate === undefined) {
                const references =
                    await this.dependencies.participantPackageService.getPackageReferencesAsync(
                        new GetPackageReferencesRequest({
                            packageId,
                        }),
                    );

                candidate =
                    await this.resolveSourceMappedDarCandidateOrThrowAsync(
                        packageId,
                        references.dars,
                        packageFingerprints,
                        candidateByDarMainPackageId,
                    );
            }

            resolvedDars.set(candidate.dar.main, candidate.dar);
            for (const containedPackageId of candidate.containedPackageIds) {
                replayPackageIds.add(containedPackageId);
                darMainPackageIdByContainedPackageId.set(
                    containedPackageId,
                    candidate.dar.main,
                );
            }

            for (const importedPackageId of candidate.importedPackageIds) {
                if (!seenPackageIds.has(importedPackageId)) {
                    pending.push(importedPackageId);
                }
            }
        }

        return {
            dars: [...resolvedDars.values()],
            packageIds: [...replayPackageIds.values()],
        };
    }

    private static createFingerprint(
        sourceFiles: readonly { path: string; content: string }[],
        executables: readonly unknown[],
    ): string {
        return createHash("sha256")
            .update(
                JSON.stringify({
                    sourceFiles,
                    executables,
                }),
            )
            .digest("hex");
    }

    private async resolveSourceMappedDarCandidateOrThrowAsync(
        packageId: string,
        dars: readonly ParticipantDarDescription[],
        packageFingerprints: Map<string, string>,
        candidateByDarMainPackageId: Map<
            string,
            {
                dar: ParticipantDarDescription;
                metadata: DarSourceMapMetadata;
                containedPackageIds: readonly string[];
                importedPackageIds: readonly string[];
            }
        >,
    ): Promise<{
        dar: ParticipantDarDescription;
        metadata: DarSourceMapMetadata;
        containedPackageIds: readonly string[];
        importedPackageIds: readonly string[];
    }> {
        let selectedCandidate:
            | {
                  dar: ParticipantDarDescription;
                  metadata: DarSourceMapMetadata;
                  containedPackageIds: readonly string[];
                  importedPackageIds: readonly string[];
              }
            | undefined;
        let missingSourceMapError: DamlLfArchiveException | undefined;

        for (const dar of dars) {
            const cachedCandidate =
                candidateByDarMainPackageId.get(dar.main);

            if (cachedCandidate !== undefined) {
                if (selectedCandidate === undefined) {
                    selectedCandidate = cachedCandidate;
                }

                continue;
            }

            const response =
                await this.dependencies.participantPackageService.getDarAsync(
                    new GetDarRequest({
                        mainPackageId: dar.main,
                    }),
                );

            try {
                const archive = await this.archiveLoader.loadDarOrThrowAsync(
                    response.payload,
                );
                const bundle =
                    await this.sourceBundleLoader.loadSourceBundleOrThrowAsync(
                        response.payload,
                    );
                const metadata = new DarSourceMapMetadata(bundle.metadata);
                const metadataPackageId = metadata.packageId ?? packageId;
                const fingerprint = ReplayArtifactResolver.createFingerprint(
                    bundle.sourceFiles.map((file) => ({
                        path: file.path,
                        content: file.content,
                    })),
                    metadata.executables,
                );
                const previousFingerprint =
                    packageFingerprints.get(metadataPackageId);

                if (
                    previousFingerprint !== undefined &&
                    previousFingerprint !== fingerprint
                ) {
                    throw new ReplayMissingSourceException(
                        `conflicting dar provenance for package '${metadataPackageId}'`,
                    );
                }

                packageFingerprints.set(metadataPackageId, fingerprint);

                if (selectedCandidate === undefined) {
                    const packageGraph = this.readPackageGraph(
                        archive.packageEntries.map((entry) => entry.bytes),
                        metadataPackageId,
                    );

                    selectedCandidate = {
                        dar,
                        metadata,
                        containedPackageIds: packageGraph.containedPackageIds,
                        importedPackageIds: [
                            ...new Set([
                                ...metadata.importedPackages,
                                ...packageGraph.importedPackageIds,
                            ]),
                        ],
                    };
                    candidateByDarMainPackageId.set(
                        dar.main,
                        selectedCandidate,
                    );
                }
            } catch (error) {
                if (
                    error instanceof DamlLfArchiveException &&
                    error.message.includes("debug/source-map.json")
                ) {
                    missingSourceMapError ??= error;
                    continue;
                }

                throw error;
            }
        }

        if (selectedCandidate !== undefined) {
            return selectedCandidate;
        }

        if (missingSourceMapError !== undefined) {
            throw missingSourceMapError;
        }

        throw new ReplayMissingSourceException(
            `missing source-mapped dar for package '${packageId}'`,
        );
    }

    private readPackageGraph(
        packageArchives: readonly Uint8Array[],
        fallbackPackageId: string,
    ): {
        containedPackageIds: readonly string[];
        importedPackageIds: readonly string[];
    } {
        const containedPackageIds = new Set<string>([fallbackPackageId]);
        const importedPackageIds = new Set<string>();

        for (const packageArchive of packageArchives) {
            try {
                const packageLoadResult =
                    this.packageLoader.loadRawPackageOrThrow(packageArchive);

                containedPackageIds.add(packageLoadResult.packageId);

                for (const importedPackageId of this.readImportedPackageIds(
                    packageLoadResult.rawPackage,
                )) {
                    if (importedPackageId !== packageLoadResult.packageId) {
                        importedPackageIds.add(importedPackageId);
                    }
                }
            }

            catch {
                continue;
            }
        }

        return {
            containedPackageIds: [...containedPackageIds.values()],
            importedPackageIds: [...importedPackageIds.values()],
        };
    }

    private readImportedPackageIds(rawPackage: {
        internedStrings: readonly string[];
        importsSum?: {
            oneofKind?: string;
            packageImports?: {
                importedPackages: readonly string[];
            };
        };
    }): readonly string[] {
        const importedPackageIds = new Set<string>();
        const visited = new Set<object>();

        const visit = (value: unknown): void => {
            if (value === null || typeof value !== "object") {
                return;
            }

            if (visited.has(value)) {
                return;
            }

            visited.add(value);

            const importedPackageId =
                this.tryResolveImportedPackageId(rawPackage, value);

            if (importedPackageId !== undefined) {
                importedPackageIds.add(importedPackageId);
            }

            if (Array.isArray(value)) {
                for (const item of value) {
                    visit(item);
                }

                return;
            }

            for (const child of Object.values(value)) {
                visit(child);
            }
        };

        visit(rawPackage);

        return [...importedPackageIds.values()];
    }

    private tryResolveImportedPackageId(
        rawPackage: {
            internedStrings: readonly string[];
            importsSum?: {
                oneofKind?: string;
                packageImports?: {
                    importedPackages: readonly string[];
                };
            };
        },
        value: object,
    ): string | undefined {
        const candidate = value as {
            sum?: {
                oneofKind?: string;
                importedPackageIdInternedStr?: number;
                packageImportId?: number;
            };
        };

        if (candidate.sum?.oneofKind === "importedPackageIdInternedStr") {
            const index = candidate.sum.importedPackageIdInternedStr;

            return index === undefined
                ? undefined
                : rawPackage.internedStrings[index];
        }

        if (
            candidate.sum?.oneofKind === "packageImportId" &&
            rawPackage.importsSum?.oneofKind === "packageImports"
        ) {
            const index = candidate.sum.packageImportId;

            return index === undefined
                ? undefined
                : rawPackage.importsSum.packageImports?.importedPackages[index];
        }

        return undefined;
    }
}
