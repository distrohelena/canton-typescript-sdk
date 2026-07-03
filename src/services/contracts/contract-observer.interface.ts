export interface ContractObserver<TContract = unknown> {
    nextAsync(contract: TContract): Promise<void>;
}
