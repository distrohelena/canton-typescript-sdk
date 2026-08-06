/** Minimal logging seam for SDK diagnostics; defaults to the global console when not provided. */
export interface CantonLogger {
    warn(message: string): void;
}
