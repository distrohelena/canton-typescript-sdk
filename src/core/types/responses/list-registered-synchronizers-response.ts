import { RegisteredSynchronizer } from "../registered-synchronizer.js";

export class ListRegisteredSynchronizersResponse {
    public readonly registeredSynchronizers: readonly RegisteredSynchronizer[];

    public constructor(init: {
        registeredSynchronizers: readonly RegisteredSynchronizer[];
    }) {
        this.registeredSynchronizers = [...init.registeredSynchronizers];
    }
}
