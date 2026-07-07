import {
    AllocatePartyRequest,
    GetDarContentsRequest,
    ListDarsRequest,
    ListKnownPartiesRequest,
    ListPackagesRequest,
    TransportKind,
    UploadDarFileRequest,
} from "../../../src/index.js";
import {
    DamlLfPackageLoader,
    DarArchiveLoader,
} from "../../../src/daml-lf/index.js";
import { createLiveClient } from "../runtime/live-client-factory.js";
import {
    LiveTestEnvironment,
    createLiveTestEnvironment,
} from "../runtime/live-test-environment.js";
import { assertLiveConnectivityAsync } from "../runtime/live-connectivity-preflight.js";
import { readLiveDarBytesAsync } from "./read-live-dar-bytes.js";

export interface LiveAllocatedParty {
    readonly identifier: string;
    readonly transportKind: TransportKind;
}

export interface LiveSeededContext {
    readonly runId: string;
    readonly grpcEnvironment: LiveTestEnvironment;
    readonly jsonEnvironment: LiveTestEnvironment;
    readonly jsonAllocatedParty: LiveAllocatedParty;
    readonly uploadedDarBytes: Uint8Array;
    readonly jsonUploadPackageId?: string;
    readonly mainPackageId: string;
    readonly packageIds: readonly string[];
    readonly participantDarMainPackageId: string;
    readonly participantPackageIds: readonly string[];
    readonly darName?: string;
    readonly darVersion?: string;
}

/** Seeds stable live data through the public SDK for downstream integration specs. */
export async function seedLiveContextAsync(): Promise<LiveSeededContext> {
    const grpcEnvironment = createLiveTestEnvironment({
        transportKind: TransportKind.grpc,
    });

    const jsonEnvironment = createLiveTestEnvironment({
        transportKind: TransportKind.json,
        runId: grpcEnvironment.runId,
    });

    await Promise.all([
        assertLiveConnectivityAsync(grpcEnvironment),
        assertLiveConnectivityAsync(jsonEnvironment),
    ]);

    const grpcClient = createLiveClient(grpcEnvironment);

    const jsonClient = createLiveClient(jsonEnvironment);

    try {
        const uploadedDarBytes = await readLiveDarBytesAsync();

        const darMetadata = await loadDarMetadataOrThrowAsync(uploadedDarBytes);

        const packagesBefore = await grpcClient.packageService.listPackagesAsync(
            new ListPackagesRequest(),
        );

        const jsonAllocatedParty = await allocateSeededPartyAsync(
            jsonClient,
            jsonEnvironment.runId,
            TransportKind.json,
        );

        await assertJsonPartyVisibleAsync(jsonClient, jsonAllocatedParty.identifier);

        const jsonUploadResponse =
            await jsonClient.packageManagementService.uploadDarFileAsync(
                new UploadDarFileRequest({
                    bytes: uploadedDarBytes,
                }),
            );

        const packagesAfterFirstUpload =
            await grpcClient.packageService.listPackagesAsync(
                new ListPackagesRequest(),
            );

        const discoveredPackageVisibility = discoverUploadedPackageVisibility(
            {
                darMetadata,
                packageIdsBeforeUpload: packagesBefore.packageIds,
                packageIdsAfterUpload: packagesAfterFirstUpload.packageIds,
            },
        );

        const discoveredParticipantDar = await discoverParticipantDarAsync(
            grpcClient,
            darMetadata.mainPackageId,
        );

        return {
            runId: grpcEnvironment.runId,
            grpcEnvironment,
            jsonEnvironment,
            jsonAllocatedParty,
            uploadedDarBytes,
            jsonUploadPackageId: jsonUploadResponse.packageId,
            mainPackageId: darMetadata.mainPackageId,
            packageIds: discoveredPackageVisibility.packageIds,
            participantDarMainPackageId:
                discoveredParticipantDar.participantDarMainPackageId,
            participantPackageIds: discoveredParticipantDar.participantPackageIds,
            darName: discoveredParticipantDar.darName,
            darVersion: discoveredParticipantDar.darVersion,
        };
    } finally {
        await Promise.allSettled([
            grpcClient.disposeAsync(),
            jsonClient.disposeAsync(),
        ]);
    }
}

function discoverUploadedPackageVisibility(init: {
    darMetadata: {
        mainPackageId: string;
        packageIds: readonly string[];
    };
    packageIdsBeforeUpload: readonly string[];
    packageIdsAfterUpload: readonly string[];
}): {
    packageIds: readonly string[];
} {
    const visiblePackageIds = init.darMetadata.packageIds.filter((packageId) =>
        init.packageIdsAfterUpload.includes(packageId),
    );

    if (visiblePackageIds.length !== 0) {
        return {
                packageIds: visiblePackageIds,
            };
    }

    const addedPackageIds = init.packageIdsAfterUpload.filter(
        (packageId) => !init.packageIdsBeforeUpload.includes(packageId),
    );

    throw new Error(
        `Live seeded context could not prove uploaded package visibility. Expected ${init.darMetadata.packageIds.length} package ids, observed 0, added ${addedPackageIds.length}, main package ${init.darMetadata.mainPackageId}.`,
    );
}

async function discoverParticipantDarAsync(
    client: ReturnType<typeof createLiveClient>,
    preferredMainPackageId: string,
): Promise<{
    participantDarMainPackageId: string;
    participantPackageIds: readonly string[];
    darName?: string;
    darVersion?: string;
}> {
    const dars = await client.participantPackageService.listDarsAsync(
        new ListDarsRequest(),
    );

    const selectedDar =
        dars.dars.find((item) => item.main === preferredMainPackageId)
        ?? dars.dars[0];

    if (selectedDar === undefined) {
        throw new Error(
            "Live seeded context could not discover any participant-admin DAR archives.",
        );
    }

    const darContents = await client.participantPackageService.getDarContentsAsync(
        new GetDarContentsRequest({
            mainPackageId: selectedDar.main,
        }),
    );

    return {
        participantDarMainPackageId: selectedDar.main,
        participantPackageIds: deduplicateValues(
            darContents.packages.map((item) => item.packageId),
        ),
        darName: darContents.description?.name,
        darVersion: darContents.description?.version,
    };
}

async function allocateSeededPartyAsync(
    client: ReturnType<typeof createLiveClient>,
    runId: string,
    transportKind: TransportKind,
): Promise<LiveAllocatedParty> {
    const partyLabel = createSeededPartyLabel(runId, transportKind);

    const response = await client.partyManagementService.allocatePartyAsync(
        new AllocatePartyRequest({
            partyIdHint: partyLabel,
            displayName: partyLabel,
        }),
    );

    return {
        identifier: response.party,
        transportKind,
    };
}

async function assertJsonPartyVisibleAsync(
    client: ReturnType<typeof createLiveClient>,
    party: string,
): Promise<void> {
    const response = await client.partyManagementService.listKnownPartiesAsync(
        new ListKnownPartiesRequest({
            filterParty: party,
            pageSize: 10,
        }),
    );

    if (!response.partyDetails.some((item) => item.party === party)) {
        throw new Error(
            `Live seeded context could not read back the allocated json party '${party}'.`,
        );
    }
}

function createSeededPartyLabel(
    runId: string,
    transportKind: TransportKind,
): string {
    return `sdk-live-party-${runId}-${transportKind}`;
}

function deduplicateValues(values: readonly string[]): readonly string[] {
    return [...new Set(values)];
}

async function loadDarMetadataOrThrowAsync(archiveBytes: Uint8Array): Promise<{
    mainPackageId: string;
    packageIds: readonly string[];
}> {
    const loader = new DarArchiveLoader();

    const packageLoader = new DamlLfPackageLoader();

    const darArchive = await loader.loadDarOrThrowAsync(archiveBytes);

    let mainPackageId = "";

    const packageIds: string[] = [];

    for (const packageEntry of darArchive.packageEntries) {
        const packageId = packageLoader.loadRawPackageOrThrow(
            packageEntry.bytes,
        ).packageId;

        packageIds.push(packageId);

        if (packageEntry.path === darArchive.mainPackageEntry.path) {
            mainPackageId = packageId;
        }
    }

    if (mainPackageId.length === 0) {
        throw new Error(
            "Live DAR metadata parsing did not resolve a main package id.",
        );
    }

    return {
        mainPackageId,
        packageIds: deduplicateValues(packageIds),
    };
}
