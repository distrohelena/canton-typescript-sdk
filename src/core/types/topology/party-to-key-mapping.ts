import { TopologySigningPublicKey } from "./topology-public-key.js";

export class PartyToKeyMapping {
    public readonly party: string;
    public readonly threshold: number;
    public readonly signingKeys: TopologySigningPublicKey[];

    public constructor(init: {
        party: string;
        threshold?: number;
        signingKeys?: TopologySigningPublicKey[];
    }) {
        this.party = init.party;
        this.threshold = init.threshold ?? 0;
        this.signingKeys = [...(init.signingKeys ?? [])];
    }
}
