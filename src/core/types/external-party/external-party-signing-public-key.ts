import { ExternalPartyCryptoKeyFormat } from "./external-party-crypto-key-format.js";
import { ExternalPartySigningKeySpec } from "./external-party-signing-key-spec.js";

export class ExternalPartySigningPublicKey {
    public readonly format: ExternalPartyCryptoKeyFormat;
    public readonly keyData: Uint8Array;
    public readonly keySpec: ExternalPartySigningKeySpec;

    public constructor(
        init: {
            format?: ExternalPartyCryptoKeyFormat;
            keyData?: Uint8Array;
            keySpec?: ExternalPartySigningKeySpec;
        } = {},
    ) {
        this.format = init.format ?? ExternalPartyCryptoKeyFormat.unspecified;
        this.keyData = new Uint8Array(init.keyData ?? []);
        this.keySpec = init.keySpec ?? ExternalPartySigningKeySpec.unspecified;
    }
}
