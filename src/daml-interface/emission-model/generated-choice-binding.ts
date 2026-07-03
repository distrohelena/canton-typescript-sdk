export class GeneratedChoiceBinding {
    public readonly name: string;
    public readonly methodName: string;
    public readonly choiceTypeName: string;
    public readonly exercisedEventTypeName: string;
    public readonly parameterName: string;
    public readonly parameterTypeName: string;
    public readonly returnTypeName: string;

    public constructor(init: {
        name: string;
        methodName: string;
        choiceTypeName: string;
        exercisedEventTypeName: string;
        parameterName: string;
        parameterTypeName: string;
        returnTypeName: string;
    }) {
        this.name = init.name;
        this.methodName = init.methodName;
        this.choiceTypeName = init.choiceTypeName;
        this.exercisedEventTypeName = init.exercisedEventTypeName;
        this.parameterName = init.parameterName;
        this.parameterTypeName = init.parameterTypeName;
        this.returnTypeName = init.returnTypeName;
    }
}
