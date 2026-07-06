import { LsuAnnouncement } from "../topology/lsu-announcement.js";
import { TopologyMappingResult } from "../topology/topology-mapping-result.js";

export class ListLsuAnnouncementResponse {
    public readonly results: TopologyMappingResult<LsuAnnouncement>[];

    public constructor(init: {
        results: TopologyMappingResult<LsuAnnouncement>[];
    }) {
        this.results = [...init.results];
    }
}
