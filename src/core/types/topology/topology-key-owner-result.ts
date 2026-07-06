import {
    TopologyEncryptionPublicKey,
    TopologySigningPublicKey,
} from "./topology-public-key.js";

export class TopologyKeyOwnerResult {
    public readonly synchronizerId: string;
    public readonly keyOwner: string;
    public readonly signingKeys: TopologySigningPublicKey[];
    public readonly encryptionKeys: TopologyEncryptionPublicKey[];
    public readonly physicalSynchronizerId: string;

    public constructor(init: {
        synchronizerId: string;
        keyOwner: string;
        signingKeys?: TopologySigningPublicKey[];
        encryptionKeys?: TopologyEncryptionPublicKey[];
        physicalSynchronizerId?: string;
    }) {
        this.synchronizerId = init.synchronizerId;
        this.keyOwner = init.keyOwner;
        this.signingKeys = [...(init.signingKeys ?? [])];
        this.encryptionKeys = [...(init.encryptionKeys ?? [])];
        this.physicalSynchronizerId = init.physicalSynchronizerId ?? "";
    }
}
