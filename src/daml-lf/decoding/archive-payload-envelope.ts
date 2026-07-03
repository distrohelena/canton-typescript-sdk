import { DamlLfLanguageVersion } from "./daml-lf-language-version.js";

export class ArchivePayloadEnvelope {
    public readonly packageId: string;
    public readonly languageVersion: DamlLfLanguageVersion;
    public readonly packagePayload: Uint8Array;

    public constructor(init: {
        packageId: string;
        languageVersion: DamlLfLanguageVersion;
        packagePayload: Uint8Array;
    }) {
        this.packageId = init.packageId;
        this.languageVersion = init.languageVersion;
        this.packagePayload = init.packagePayload;
    }
}
