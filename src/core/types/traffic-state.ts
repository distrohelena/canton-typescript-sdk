export class TrafficState {
    public readonly extraTrafficPurchased: string;
    public readonly extraTrafficConsumed: string;
    public readonly baseTrafficRemainder: string;
    public readonly lastConsumedCost: string;
    public readonly timestamp: string;
    public readonly serial?: number;

    public constructor(init?: {
        extraTrafficPurchased?: string;
        extraTrafficConsumed?: string;
        baseTrafficRemainder?: string;
        lastConsumedCost?: string;
        timestamp?: string;
        serial?: number;
    }) {
        this.extraTrafficPurchased = init?.extraTrafficPurchased ?? "";
        this.extraTrafficConsumed = init?.extraTrafficConsumed ?? "";
        this.baseTrafficRemainder = init?.baseTrafficRemainder ?? "";
        this.lastConsumedCost = init?.lastConsumedCost ?? "";
        this.timestamp = init?.timestamp ?? "";
        this.serial = init?.serial;
    }
}
