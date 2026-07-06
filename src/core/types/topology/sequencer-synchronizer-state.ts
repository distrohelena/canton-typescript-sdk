export class SequencerSynchronizerState {
    public readonly synchronizerId: string;
    public readonly threshold: number;
    public readonly active: string[];
    public readonly observers: string[];

    public constructor(init: {
        synchronizerId: string;
        threshold?: number;
        active?: string[];
        observers?: string[];
    }) {
        this.synchronizerId = init.synchronizerId;
        this.threshold = init.threshold ?? 0;
        this.active = [...(init.active ?? [])];
        this.observers = [...(init.observers ?? [])];
    }
}
