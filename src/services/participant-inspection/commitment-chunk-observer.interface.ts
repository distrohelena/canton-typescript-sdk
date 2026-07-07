export interface CommitmentChunkObserver<TChunk = unknown> {
    nextAsync(chunk: TChunk): Promise<void>;
}
