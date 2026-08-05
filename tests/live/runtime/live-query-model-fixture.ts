import { readFile } from "node:fs/promises";
import {
    DamlLfPackageLoader,
    DarArchiveLoader,
} from "../../../src/daml-lf/index.js";

const liveQueryDarAssetUrl = new URL(
    "../assets/sdk-query-live-model.dar",
    import.meta.url,
);

const liveQueryDarV2AssetUrl = new URL(
    "../assets/sdk-query-live-model-v2.dar",
    import.meta.url,
);

export interface LiveQueryModelFixture {
    readonly darBytes: Uint8Array;
    readonly packageId: string;
    readonly templateId: {
        readonly packageId: string;
        readonly moduleName: "Main";
        readonly entityName: "Iou";
    };
}

let liveQueryModelFixturePromise: Promise<LiveQueryModelFixture> | undefined;

let liveQueryModelV2FixturePromise: Promise<LiveQueryModelFixture> | undefined;

/** Reads the dedicated query DAR and resolves its main package identity. */
export function getLiveQueryModelFixtureAsync(): Promise<LiveQueryModelFixture> {
    liveQueryModelFixturePromise ??= loadLiveQueryModelFixtureAsync(liveQueryDarAssetUrl);

    return liveQueryModelFixturePromise;
}

/** Reads the version-2 build of the same package name — a distinct package id sharing one name. */
export function getLiveQueryModelV2FixtureAsync(): Promise<LiveQueryModelFixture> {
    liveQueryModelV2FixturePromise ??= loadLiveQueryModelFixtureAsync(liveQueryDarV2AssetUrl);

    return liveQueryModelV2FixturePromise;
}

async function loadLiveQueryModelFixtureAsync(assetUrl: URL): Promise<LiveQueryModelFixture> {
    const darBytes = new Uint8Array(await readFile(assetUrl));

    const archive = await new DarArchiveLoader().loadDarOrThrowAsync(darBytes);

    const packageId = new DamlLfPackageLoader().loadRawPackageOrThrow(
        archive.mainPackageEntry.bytes,
    ).packageId;

    return {
        darBytes,
        packageId,
        templateId: {
            packageId,
            moduleName: "Main",
            entityName: "Iou",
        },
    };
}
