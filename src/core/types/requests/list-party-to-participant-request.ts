import { TopologyBaseQuery } from "../topology/topology-base-query.js";

export class ListPartyToParticipantRequest {
    public readonly baseQuery?: TopologyBaseQuery;
    public readonly filterParty?: string;
    public readonly filterParticipant?: string;

    public constructor(init: {
        baseQuery?: TopologyBaseQuery;
        filterParty?: string;
        filterParticipant?: string;
    } = {}) {
        this.baseQuery = init.baseQuery;
        this.filterParty = init.filterParty;
        this.filterParticipant = init.filterParticipant;
    }
}
