import { TopologyDuration } from "../topology/topology-duration.js";

export class ClearPartyOnboardingFlagRequest {
    public readonly partyId: string;
    public readonly synchronizerId: string;
    public readonly beginOffsetExclusive: string;
    public readonly waitForActivationTimeout?: TopologyDuration;

    public constructor(init: {
        partyId: string;
        synchronizerId: string;
        beginOffsetExclusive: string;
        waitForActivationTimeout?: TopologyDuration;
    }) {
        this.partyId = init.partyId;
        this.synchronizerId = init.synchronizerId;
        this.beginOffsetExclusive = init.beginOffsetExclusive;
        this.waitForActivationTimeout = init.waitForActivationTimeout;
    }
}
