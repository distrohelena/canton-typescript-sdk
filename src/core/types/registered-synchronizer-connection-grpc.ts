export class RegisteredSynchronizerConnectionGrpc {
    public readonly connections: readonly string[];
    public readonly transportSecurity: boolean;
    public readonly customTrustCertificates?: Uint8Array;

    public constructor(init: {
        connections?: readonly string[];
        transportSecurity?: boolean;
        customTrustCertificates?: Uint8Array;
    } = {}) {
        this.connections = [...(init.connections ?? [])];
        this.transportSecurity = init.transportSecurity ?? false;
        this.customTrustCertificates =
            init.customTrustCertificates === undefined
                ? undefined
                : new Uint8Array(init.customTrustCertificates);
    }
}
