/** Base class for generated DAML template bindings. */
export class DamlTemplate {
    readonly #contractId: string;

    public constructor(contractId: string) {
        this.#contractId = contractId;
    }

    public get contractId(): string {
        return this.#contractId;
    }
}
