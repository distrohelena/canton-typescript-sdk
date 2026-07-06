import { TopologyPublicKey } from "./topology-public-key.js";

export class OwnerToKeyMapping {
    public readonly member: string;
    public readonly publicKeys: TopologyPublicKey[];

    public constructor(init: {
        member: string;
        publicKeys?: TopologyPublicKey[];
    }) {
        this.member = init.member;
        this.publicKeys = [...(init.publicKeys ?? [])];
    }
}
