export class MediatorSynchronizerState {
    public readonly synchronizerId: string;
    public readonly group: number;
    public readonly threshold: number;
    public readonly active: string[];
    public readonly observers: string[];

    public constructor(init: {
        synchronizerId: string;
        group?: number;
        threshold?: number;
        active?: string[];
        observers?: string[];
    }) {
        this.synchronizerId = init.synchronizerId;
        this.group = init.group ?? 0;
        this.threshold = init.threshold ?? 0;
        this.active = [...(init.active ?? [])];
        this.observers = [...(init.observers ?? [])];
    }
}
