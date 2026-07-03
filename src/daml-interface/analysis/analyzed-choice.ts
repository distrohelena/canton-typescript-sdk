import { DamlLfType } from "../../daml-lf/model/daml-lf-type.js";

export class AnalyzedChoice {
    public readonly name: string;
    public readonly methodName: string;
    public readonly parameterName: string;
    public readonly parameterType: DamlLfType;
    public readonly returnType: DamlLfType;

    public constructor(init: {
        name: string;
        methodName: string;
        parameterName: string;
        parameterType: DamlLfType;
        returnType: DamlLfType;
    }) {
        this.name = init.name;
        this.methodName = init.methodName;
        this.parameterName = init.parameterName;
        this.parameterType = init.parameterType;
        this.returnType = init.returnType;
    }
}
