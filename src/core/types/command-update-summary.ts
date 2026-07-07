import { CommandInspectionContract } from "./command-inspection-contract.js";

export class CommandUpdateSummary {
    public readonly created: readonly CommandInspectionContract[];
    public readonly archived: readonly CommandInspectionContract[];
    public readonly exercised: number;
    public readonly fetched: number;
    public readonly lookedUpByKey: number;

    public constructor(init?: {
        created?: readonly CommandInspectionContract[];
        archived?: readonly CommandInspectionContract[];
        exercised?: number;
        fetched?: number;
        lookedUpByKey?: number;
    }) {
        this.created = init?.created ?? [];
        this.archived = init?.archived ?? [];
        this.exercised = init?.exercised ?? 0;
        this.fetched = init?.fetched ?? 0;
        this.lookedUpByKey = init?.lookedUpByKey ?? 0;
    }
}
