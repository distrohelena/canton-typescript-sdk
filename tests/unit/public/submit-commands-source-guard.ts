import ts from "typescript";

const removedRequestName = "Submit" + "CommandRequest";

const removedModuleName = ["submit", "command", "request"].join("-");

export function findRemovedSubmitCommandUsages(source: string): string[] {
    const sourceFile = ts.createSourceFile(
        "source.ts",
        source,
        ts.ScriptTarget.Latest,
        true,
        ts.ScriptKind.TS,
    );

    const requestVariables = new Set<string>();

    const collectsSubmitCommandsRequest = (node: ts.Node | undefined): boolean => {
        if (node === undefined) {
            return false;
        }

        let found = false;

        const visit = (child: ts.Node): void => {
            if (ts.isIdentifier(child) && child.text === "SubmitCommandsRequest") {
                found = true;

                return;
            }

            ts.forEachChild(child, visit);
        };

        visit(node);

        return found;
    };

    const collectRequestVariables = (node: ts.Node): void => {
        if (
            (ts.isVariableDeclaration(node) || ts.isParameter(node)) &&
            ts.isIdentifier(node.name) &&
            (collectsSubmitCommandsRequest(node.type) ||
                (ts.isVariableDeclaration(node) &&
                    node.initializer !== undefined &&
                    ts.isNewExpression(node.initializer) &&
                    ts.isIdentifier(node.initializer.expression) &&
                    node.initializer.expression.text === "SubmitCommandsRequest"))
        ) {
            requestVariables.add(node.name.text);
        }

        ts.forEachChild(node, collectRequestVariables);
    };

    collectRequestVariables(sourceFile);

    const usages = new Set<string>();

    const recordModuleName = (moduleSpecifier: ts.Expression | undefined): void => {
        if (
            moduleSpecifier !== undefined &&
            ts.isStringLiteral(moduleSpecifier) &&
            moduleSpecifier.text
                .split("/")
                .some((part) => part.split(".")[0] === removedModuleName)
        ) {
            usages.add(removedModuleName);
        }
    };

    const findUsages = (node: ts.Node): void => {
        if (ts.isIdentifier(node) && node.text === removedRequestName) {
            usages.add(removedRequestName);
        }

        if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) {
            recordModuleName(node.moduleSpecifier);
        }

        if (
            ts.isPropertyAccessExpression(node) &&
            node.name.text === "command" &&
            ts.isIdentifier(node.expression) &&
            requestVariables.has(node.expression.text)
        ) {
            usages.add(node.getText(sourceFile));
        }

        ts.forEachChild(node, findUsages);
    };

    findUsages(sourceFile);

    return [...usages];
}
