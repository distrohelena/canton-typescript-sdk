export class ParticipantPackageDescription {
    public readonly packageId: string;
    public readonly name: string;
    public readonly version: string;
    public readonly uploadedAt?: Date;
    public readonly size: number;

    public constructor(init: {
        packageId: string;
        name: string;
        version: string;
        uploadedAt?: Date;
        size: number;
    }) {
        this.packageId = init.packageId;
        this.name = init.name;
        this.version = init.version;
        this.uploadedAt = init.uploadedAt;
        this.size = init.size;
    }
}
