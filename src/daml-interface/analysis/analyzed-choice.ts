import { AnalyzedDamlType } from "./analyzed-daml-type.js";

export class AnalyzedChoice {
    public readonly name: string;
    public readonly methodName: string;
    public readonly parameterName: string;
    public readonly parameterType: AnalyzedDamlType;
    public readonly returnType: AnalyzedDamlType;

    public constructor(init: {
        name: string;
        methodName: string;
        parameterName: string;
        parameterType: AnalyzedDamlType;
        returnType: AnalyzedDamlType;
    }) {
        this.name = init.name;
        this.methodName = init.methodName;
        this.parameterName = init.parameterName;
        this.parameterType = init.parameterType;
        this.returnType = init.returnType;
    }
}
