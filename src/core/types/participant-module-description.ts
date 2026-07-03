export class ParticipantModuleDescription {
    public readonly name: string;

    public constructor(init: { name: string }) {
        this.name = init.name;
    }
}
