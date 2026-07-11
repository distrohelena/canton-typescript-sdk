import { SourceIndexedCompilation } from "./source-indexed-compilation.js";
import { DamlLfExpression } from "../../daml-lf/model/daml-lf-expression.js";
import { DamlLfValueDefinition } from "../../daml-lf/model/daml-lf-value-definition.js";

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

    public getModuleSourceOrThrow(
        packageId: string,
        moduleName: string,
    ) {
        return this.indexedCompilation.getModuleSourceOrThrow(
            packageId,
            moduleName,
        );
    }

    public getExpressionSource(expression: DamlLfExpression) {
        return this.indexedCompilation.getExpressionSource(expression);
    }

    public getValueDefinitionOrThrow(
        packageId: string,
        moduleName: string,
        definitionName: string,
    ): DamlLfValueDefinition {
        return this.indexedCompilation.compilation.getValueDefinitionOrThrow(
            packageId,
            moduleName,
            definitionName,
        );
    }

    public findExecutableSourceAt(
        path: string,
        line: number,
        column: number,
    ) {
        return this.indexedCompilation.findExecutableSourceAt(
            path,
            line,
            column,
        );
    }
}
