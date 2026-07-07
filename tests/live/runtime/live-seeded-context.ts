import {
    LiveSeededContext,
    seedLiveContextAsync,
} from "../scenarios/seed-live-context.js";

let liveSeededContextPromise: Promise<LiveSeededContext> | undefined;

/** Creates and caches the shared seeded live quickstart context. */
export function getLiveSeededContextAsync(): Promise<LiveSeededContext> {
    liveSeededContextPromise ??= seedLiveContextAsync();

    return liveSeededContextPromise;
}

export type { LiveAllocatedParty, LiveSeededContext } from "../scenarios/seed-live-context.js";
