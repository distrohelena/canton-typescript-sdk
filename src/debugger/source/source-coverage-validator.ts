import { ReplaySourceMapException } from "../errors/replay-source-map.exception.js";
import { SourceIndexedCompilation } from "./source-indexed-compilation.js";

export class SourceCoverageValidator {
    public static validateOrThrow(
        indexedCompilation: SourceIndexedCompilation,
        requiredSymbols: readonly {
            packageId: string;
            moduleName: string;
            definitionName: string;
        }[],
    ): void {
        for (const symbol of requiredSymbols) {
            try {
                indexedCompilation.getDefinitionSourceOrThrow(
                    symbol.packageId,
                    symbol.moduleName,
                    symbol.definitionName,
                );
            } catch (error) {
                if (error instanceof ReplaySourceMapException) {
                    throw error;
                }

                throw new ReplaySourceMapException(
                    `failed to validate source coverage for '${symbol.packageId}::${symbol.moduleName}::${symbol.definitionName}'`,
                );
            }
        }
    }
}
