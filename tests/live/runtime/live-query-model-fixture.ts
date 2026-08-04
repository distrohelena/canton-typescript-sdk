import { readFile } from "node:fs/promises";
import {
    DamlLfPackageLoader,
    DarArchiveLoader,
} from "../../../src/daml-lf/index.js";

const liveQueryDarAssetUrl = new URL(
    "../assets/sdk-query-live-model.dar",
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

/** Reads the dedicated query DAR and resolves its main package identity. */
export function getLiveQueryModelFixtureAsync(): Promise<LiveQueryModelFixture> {
    liveQueryModelFixturePromise ??= loadLiveQueryModelFixtureAsync();

    return liveQueryModelFixturePromise;
}

async function loadLiveQueryModelFixtureAsync(): Promise<LiveQueryModelFixture> {
    const darBytes = new Uint8Array(await readFile(liveQueryDarAssetUrl));

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
