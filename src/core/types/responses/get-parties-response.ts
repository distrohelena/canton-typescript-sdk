import { PartyDetails } from "../party-details.js";

export class GetPartiesResponse {
    public readonly partyDetails: readonly PartyDetails[];

    public constructor(init: { partyDetails: readonly PartyDetails[] }) {
        this.partyDetails = init.partyDetails;
    }
}
