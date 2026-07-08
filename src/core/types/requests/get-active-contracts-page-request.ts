export class GetActiveContractsPageRequest {
    public readonly party: string;
    public readonly templateId?: string;
    public readonly interfaceId?: string;
    public readonly includeInterfaceView?: boolean;
    public readonly includeCreatedEventBlob?: boolean;
    public readonly activeAtOffset?: string;
    public readonly maxPageSize?: number;
    public readonly pageToken?: Uint8Array;

    public constructor(init: {
        party: string;
        templateId?: string;
        interfaceId?: string;
        includeInterfaceView?: boolean;
        includeCreatedEventBlob?: boolean;
        activeAtOffset?: string;
        maxPageSize?: number;
        pageToken?: Uint8Array;
    }) {
        this.party = init.party;
        this.templateId = init.templateId;
        this.interfaceId = init.interfaceId;
        this.includeInterfaceView = init.includeInterfaceView;
        this.includeCreatedEventBlob = init.includeCreatedEventBlob;
        this.activeAtOffset = init.activeAtOffset;
        this.maxPageSize = init.maxPageSize;
        this.pageToken = init.pageToken;
    }
}
