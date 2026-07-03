export class ParticipantDarDescription {
    public readonly main: string;
    public readonly name: string;
    public readonly version: string;
    public readonly description: string;

    public constructor(init: {
        main: string;
        name: string;
        version: string;
        description: string;
    }) {
        this.main = init.main;
        this.name = init.name;
        this.version = init.version;
        this.description = init.description;
    }
}
