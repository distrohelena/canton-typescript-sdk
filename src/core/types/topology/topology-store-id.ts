export enum TopologyStoreKind {
    authorized = "authorized",
    synchronizer = "synchronizer",
    temporary = "temporary",
}

export class TopologyStoreAuthorized {
    public constructor(_init: Record<string, never> = {}) {
        void _init;
    }
}

export class TopologyStoreSynchronizer {
    public readonly id?: string;
    public readonly physicalId?: string;

    public constructor(init: {
        id?: string;
        physicalId?: string;
    } = {}) {
        this.id = init.id;
        this.physicalId = init.physicalId;
    }
}

export class TopologyStoreTemporary {
    public readonly name: string;

    public constructor(init: {
        name: string;
    }) {
        this.name = init.name;
    }
}

export class TopologyStoreId {
    public readonly kind: TopologyStoreKind;
    public readonly authorized?: TopologyStoreAuthorized;
    public readonly synchronizer?: TopologyStoreSynchronizer;
    public readonly temporary?: TopologyStoreTemporary;

    public constructor(init: {
        kind: TopologyStoreKind;
        authorized?: TopologyStoreAuthorized;
        synchronizer?: TopologyStoreSynchronizer;
        temporary?: TopologyStoreTemporary;
    }) {
        this.kind = init.kind;
        this.authorized = init.authorized;
        this.synchronizer = init.synchronizer;
        this.temporary = init.temporary;
    }
}
