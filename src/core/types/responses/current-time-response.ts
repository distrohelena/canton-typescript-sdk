export class CurrentTimeResponse {
    public readonly currentTime: string;

    public constructor(init?: {
        currentTime?: string;
    }) {
        this.currentTime = init?.currentTime ?? "0";
    }
}
