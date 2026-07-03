import { PartyDetails } from "../party-details.js";

export class ListKnownPartiesResponse {
    public readonly partyDetails: PartyDetails[];
    public readonly nextPageToken?: string;

    public constructor(init: {
        partyDetails: PartyDetails[];
        nextPageToken?: string;
    }) {
        this.partyDetails = init.partyDetails;
        this.nextPageToken = init.nextPageToken;
    }
}
