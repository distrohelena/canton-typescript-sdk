import { DamlLfLanguageVersion } from "./daml-lf-language-version.js";

export class ArchivePayloadEnvelope {
    public readonly languageVersion: DamlLfLanguageVersion;
    public readonly packagePayload: Uint8Array;

    public constructor(init: {
        languageVersion: DamlLfLanguageVersion;
        packagePayload: Uint8Array;
    }) {
        this.languageVersion = init.languageVersion;
        this.packagePayload = init.packagePayload;
    }
}
