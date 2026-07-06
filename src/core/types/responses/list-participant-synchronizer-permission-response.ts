import { ParticipantSynchronizerPermission } from "../topology/participant-synchronizer-permission.js";
import { TopologyMappingResult } from "../topology/topology-mapping-result.js";

export class ListParticipantSynchronizerPermissionResponse {
    public readonly results: TopologyMappingResult<ParticipantSynchronizerPermission>[];

    public constructor(init: {
        results: TopologyMappingResult<ParticipantSynchronizerPermission>[];
    }) {
        this.results = [...init.results];
    }
}
