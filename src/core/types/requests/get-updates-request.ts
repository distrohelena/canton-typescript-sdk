export class GetUpdatesRequest {
    public readonly party: string;
    public readonly beginOffset?: string;
    public readonly endOffset?: string;
    public readonly templateId?: string;

    public constructor(init: {
        party: string;
        beginOffset?: string;
        endOffset?: string;
        templateId?: string;
    }) {
        this.party = init.party;
        this.beginOffset = init.beginOffset;
        this.endOffset = init.endOffset;
        this.templateId = init.templateId;
    }
}
