import { TopologySigningPublicKey } from "./topology-public-key.js";
import { TopologyMappingCode } from "./topology-mapping-code.js";

export enum NamespaceDelegationRestrictionKind {
    canSignAllMappings = "canSignAllMappings",
    canSignAllButNamespaceDelegations = "canSignAllButNamespaceDelegations",
    canSignSpecificMappings = "canSignSpecificMappings",
}

export class NamespaceDelegationRestriction {
    public readonly kind: NamespaceDelegationRestrictionKind;
    public readonly mappings: TopologyMappingCode[];

    public constructor(init: {
        kind: NamespaceDelegationRestrictionKind;
        mappings?: TopologyMappingCode[];
    }) {
        this.kind = init.kind;
        this.mappings = [...(init.mappings ?? [])];
    }
}

export class NamespaceDelegation {
    public readonly namespace: string;
    public readonly targetKey?: TopologySigningPublicKey;
    public readonly isRootDelegation: boolean;
    public readonly restriction?: NamespaceDelegationRestriction;

    public constructor(init: {
        namespace: string;
        targetKey?: TopologySigningPublicKey;
        isRootDelegation?: boolean;
        restriction?: NamespaceDelegationRestriction;
    }) {
        this.namespace = init.namespace;
        this.targetKey = init.targetKey;
        this.isRootDelegation = init.isRootDelegation ?? false;
        this.restriction = init.restriction;
    }
}
