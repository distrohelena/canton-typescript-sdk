import { TopologyBaseResult } from "./topology-base-result.js";

export class TopologyMappingResult<TItem> {
    public readonly context?: TopologyBaseResult;
    public readonly item: TItem;

    public constructor(init: {
        context?: TopologyBaseResult;
        item: TItem;
    }) {
        this.context = init.context;
        this.item = init.item;
    }
}
