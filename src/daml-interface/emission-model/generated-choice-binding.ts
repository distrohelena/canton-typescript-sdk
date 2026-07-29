import { AnalyzedDamlType } from "../analysis/analyzed-daml-type.js";

export class GeneratedChoiceBinding {
    public readonly choiceIdentityKey: string;
    public readonly name: string;
    public readonly methodName: string;
    public readonly choiceTypeName: string;
    public readonly exercisedEventTypeName: string;
    public readonly parameterName: string;
    public readonly parameterTypeName: string;
    public readonly parameterType: AnalyzedDamlType;
    public readonly returnTypeName: string;
    public readonly returnType: AnalyzedDamlType;

    public constructor(init: {
        choiceIdentityKey?: string;
        name: string;
        methodName: string;
        choiceTypeName: string;
        exercisedEventTypeName: string;
        parameterName: string;
        parameterTypeName: string;
        parameterType: AnalyzedDamlType;
        returnTypeName: string;
        returnType: AnalyzedDamlType;
    }) {
        this.choiceIdentityKey = init.choiceIdentityKey ?? init.name;
        this.name = init.name;
        this.methodName = init.methodName;
        this.choiceTypeName = init.choiceTypeName;
        this.exercisedEventTypeName = init.exercisedEventTypeName;
        this.parameterName = init.parameterName;
        this.parameterTypeName = init.parameterTypeName;
        this.parameterType = init.parameterType;
        this.returnTypeName = init.returnTypeName;
        this.returnType = init.returnType;
    }
}
