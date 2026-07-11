import { DamlLfExpression } from "./daml-lf-expression.js";

// This child ordering is the compiler/SDK sidecar wire contract.
export function getDamlLfExpressionAtPath(
    root: DamlLfExpression,
    path: readonly number[],
): DamlLfExpression | undefined {
    let expression: DamlLfExpression | undefined = root;

    for (const childIndex of path) {
        if (!Number.isSafeInteger(childIndex) || childIndex < 0) {
            return undefined;
        }

        expression = getDamlLfExpressionChildren(expression)[childIndex];

        if (expression === undefined) {
            return undefined;
        }
    }

    return expression;
}

function getDamlLfExpressionChildren(
    expression: DamlLfExpression,
): readonly DamlLfExpression[] {
    if (expression.lambda !== undefined) {
        return [expression.lambda.body];
    }

    if (expression.application !== undefined) {
        return [
            expression.application.function,
            ...expression.application.arguments,
        ];
    }

    if (expression.letExpression !== undefined) {
        return [
            ...expression.letExpression.bindings.map((binding) => binding.value),
            expression.letExpression.body,
        ];
    }

    if (expression.recordConstruction !== undefined) {
        return expression.recordConstruction.fields.map((field) => field.value);
    }

    if (expression.recordProjection !== undefined) {
        return [expression.recordProjection.record];
    }

    if (expression.recordUpdate !== undefined) {
        return [
            expression.recordUpdate.record,
            expression.recordUpdate.value,
        ];
    }

    if (expression.caseExpression !== undefined) {
        return [
            expression.caseExpression.scrutinee,
            ...expression.caseExpression.alternatives.map(
                (alternative) => alternative.body,
            ),
        ];
    }

    if (expression.variantConstruction !== undefined) {
        return [expression.variantConstruction.argument];
    }

    if (expression.optionalConstruction?.value !== undefined) {
        return [expression.optionalConstruction.value];
    }

    if (expression.listConstruction !== undefined) {
        return [
            ...expression.listConstruction.front,
            ...(expression.listConstruction.tail === undefined
                ? []
                : [expression.listConstruction.tail]),
        ];
    }

    if (expression.updateExpression !== undefined) {
        return [
            ...(expression.updateExpression.expression === undefined
                ? []
                : [expression.updateExpression.expression]),
            ...(expression.updateExpression.bindings?.map(
                (binding) => binding.value,
            ) ?? []),
            ...(expression.updateExpression.body === undefined
                ? []
                : [expression.updateExpression.body]),
            ...(expression.updateExpression.contractId === undefined
                ? []
                : [expression.updateExpression.contractId]),
            ...(expression.updateExpression.argument === undefined
                ? []
                : [expression.updateExpression.argument]),
        ];
    }

    return [];
}
