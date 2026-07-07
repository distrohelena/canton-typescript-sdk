import { readFile } from "node:fs/promises";

const liveDarAssetUrl = new URL("../assets/sdk-live-test-model.dar", import.meta.url);

let liveDarBytesPromise: Promise<Uint8Array> | undefined;

/** Reads and caches the committed live DAR fixture bytes. */
export function readLiveDarBytesAsync(): Promise<Uint8Array> {
    liveDarBytesPromise ??= readLiveDarBytesCoreAsync();

    return liveDarBytesPromise;
}

async function readLiveDarBytesCoreAsync(): Promise<Uint8Array> {
    const bytes = await readFile(liveDarAssetUrl);

    return new Uint8Array(bytes);
}
