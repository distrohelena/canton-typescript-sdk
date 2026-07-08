import { PartyToParticipant } from "../core/types/topology/party-to-participant.js";

export class ExternalPartyActivationResponse {
    public readonly partyId: string;
    public readonly synchronizerId: string;
    public readonly transactionHash: string;
    public readonly mapping: PartyToParticipant;

    public constructor(init: {
        partyId: string;
        synchronizerId: string;
        transactionHash: string;
        mapping: PartyToParticipant;
    }) {
        this.partyId = init.partyId;
        this.synchronizerId = init.synchronizerId;
        this.transactionHash = init.transactionHash;
        this.mapping = init.mapping;
    }
}
