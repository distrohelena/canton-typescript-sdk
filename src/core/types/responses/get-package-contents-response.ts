import { ParticipantModuleDescription } from "../participant-module-description.js";
import { ParticipantPackageDescription } from "../participant-package-description.js";

export class GetPackageContentsResponse {
    public readonly description?: ParticipantPackageDescription;
    public readonly modules: ParticipantModuleDescription[];
    public readonly isUtilityPackage: boolean;
    public readonly languageVersion: string;

    public constructor(init: {
        description?: ParticipantPackageDescription;
        modules: ParticipantModuleDescription[];
        isUtilityPackage: boolean;
        languageVersion: string;
    }) {
        this.description = init.description;
        this.modules = [...init.modules];
        this.isUtilityPackage = init.isUtilityPackage;
        this.languageVersion = init.languageVersion;
    }
}
