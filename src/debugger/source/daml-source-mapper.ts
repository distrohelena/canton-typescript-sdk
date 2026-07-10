import { SourceIndexedCompilation } from "./source-indexed-compilation.js";

export class DamlSourceMapper {
    public constructor(
        private readonly indexedCompilation: SourceIndexedCompilation,
    ) {}

    public getDefinitionSourceOrThrow(
        packageId: string,
        moduleName: string,
        definitionName: string,
    ) {
        return this.indexedCompilation.getDefinitionSourceOrThrow(
            packageId,
            moduleName,
            definitionName,
        );
    }
}
