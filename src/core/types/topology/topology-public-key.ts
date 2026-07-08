export class TopologySigningPublicKey {
    public readonly fingerprint?: string;
    public readonly format?: string;
    public readonly publicKey: Uint8Array;
    public readonly scheme?: string;
    public readonly usage: string[];
    public readonly keySpec?: string;

    public constructor(init: {
        fingerprint?: string;
        format?: string;
        publicKey?: Uint8Array;
        scheme?: string;
        usage?: string[];
        keySpec?: string;
    } = {}) {
        this.fingerprint = init.fingerprint;
        this.format = init.format;
        this.publicKey = new Uint8Array(init.publicKey ?? []);
        this.scheme = init.scheme;
        this.usage = [...(init.usage ?? [])];
        this.keySpec = init.keySpec;
    }
}

export class TopologyEncryptionPublicKey {
    public readonly fingerprint?: string;
    public readonly format?: string;
    public readonly publicKey: Uint8Array;
    public readonly scheme?: string;
    public readonly keySpec?: string;

    public constructor(init: {
        fingerprint?: string;
        format?: string;
        publicKey?: Uint8Array;
        scheme?: string;
        keySpec?: string;
    } = {}) {
        this.fingerprint = init.fingerprint;
        this.format = init.format;
        this.publicKey = new Uint8Array(init.publicKey ?? []);
        this.scheme = init.scheme;
        this.keySpec = init.keySpec;
    }
}

export class TopologyPublicKey {
    public readonly signingPublicKey?: TopologySigningPublicKey;
    public readonly encryptionPublicKey?: TopologyEncryptionPublicKey;

    public constructor(init: {
        signingPublicKey?: TopologySigningPublicKey;
        encryptionPublicKey?: TopologyEncryptionPublicKey;
    } = {}) {
        this.signingPublicKey = init.signingPublicKey;
        this.encryptionPublicKey = init.encryptionPublicKey;
    }
}

export class TopologySigningKeysWithThreshold {
    public readonly threshold: number;
    public readonly keys: TopologySigningPublicKey[];

    public constructor(init: {
        threshold?: number;
        keys?: TopologySigningPublicKey[];
    } = {}) {
        this.threshold = init.threshold ?? 0;
        this.keys = [...(init.keys ?? [])];
    }
}
