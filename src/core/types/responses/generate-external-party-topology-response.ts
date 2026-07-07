export class GenerateExternalPartyTopologyResponse {
    public readonly partyId: string;
    public readonly publicKeyFingerprint: string;
    public readonly topologyTransactions: Uint8Array[];
    public readonly multiHash: Uint8Array;

    public constructor(
        init: {
            partyId?: string;
            publicKeyFingerprint?: string;
            topologyTransactions?: Uint8Array[];
            multiHash?: Uint8Array;
        } = {},
    ) {
        this.partyId = init.partyId ?? "";
        this.publicKeyFingerprint = init.publicKeyFingerprint ?? "";
        this.topologyTransactions = (init.topologyTransactions ?? []).map(
            (item) => new Uint8Array(item),
        );
        this.multiHash = new Uint8Array(init.multiHash ?? []);
    }
}
