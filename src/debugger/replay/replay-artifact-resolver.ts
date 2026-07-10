import { createHash } from "node:crypto";
import { GetDarRequest } from "../../core/types/requests/get-dar-request.js";
import { GetPackageReferencesRequest } from "../../core/types/requests/get-package-references-request.js";
import { ParticipantDarDescription } from "../../core/types/participant-dar-description.js";
import { DarSourceBundleLoader } from "../../daml-lf/container/dar-source-bundle-loader.js";
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
        const seenPackageIds = new Set<string>();
        const resolvedDars = new Map<string, ParticipantDarDescription>();
        const packageFingerprints = new Map<string, string>();

        while (pending.length > 0) {
            const packageId = pending.shift();

            if (packageId === undefined || seenPackageIds.has(packageId)) {
                continue;
            }

            seenPackageIds.add(packageId);

            const references =
                await this.dependencies.participantPackageService.getPackageReferencesAsync(
                    new GetPackageReferencesRequest({
                        packageId,
                    }),
                );

            for (const dar of references.dars) {
                resolvedDars.set(dar.main, dar);

                const response =
                    await this.dependencies.participantPackageService.getDarAsync(
                        new GetDarRequest({
                            mainPackageId: dar.main,
                        }),
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

                for (const importedPackageId of metadata.importedPackages) {
                    if (!seenPackageIds.has(importedPackageId)) {
                        pending.push(importedPackageId);
                    }
                }
            }
        }

        return {
            dars: [...resolvedDars.values()],
            packageIds: [...seenPackageIds.values()],
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
}
