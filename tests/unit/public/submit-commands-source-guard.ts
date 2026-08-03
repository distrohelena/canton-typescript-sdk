import ts from "typescript";

const removedRequestName = "Submit" + "CommandRequest";

const removedModuleName = ["submit", "command", "request"].join("-");

interface ReceiverScope {
    readonly parent?: ReceiverScope;
    readonly requestReceivers: Map<string, boolean>;
    varScope: ReceiverScope;
}

function isSubmitCommandsRequestName(name: ts.EntityName): boolean {
    return ts.isIdentifier(name)
        ? name.text === "SubmitCommandsRequest"
        : name.right.text === "SubmitCommandsRequest";
}

function isDirectSubmitCommandsRequestType(
    type: ts.TypeNode | undefined,
): boolean {
    if (type === undefined) {
        return false;
    } else if (ts.isParenthesizedTypeNode(type)) {
        return isDirectSubmitCommandsRequestType(type.type);
    } else if (ts.isUnionTypeNode(type) || ts.isIntersectionTypeNode(type)) {
        return type.types.some(isDirectSubmitCommandsRequestType);
    } else {
        return ts.isTypeReferenceNode(type) &&
            type.typeArguments === undefined &&
            isSubmitCommandsRequestName(type.typeName);
    }
}

function isSubmitCommandsRequestConstruction(
    initializer: ts.Expression | undefined,
): boolean {
    return initializer !== undefined &&
        ts.isNewExpression(initializer) &&
        (ts.isIdentifier(initializer.expression) &&
            initializer.expression.text === "SubmitCommandsRequest" ||
            ts.isPropertyAccessExpression(initializer.expression) &&
            initializer.expression.name.text === "SubmitCommandsRequest");
}

function bindNames(
    scope: ReceiverScope,
    name: ts.BindingName | undefined,
    isRequest: boolean,
): void {
    if (name === undefined) {
        return;
    } else if (ts.isIdentifier(name)) {
        scope.requestReceivers.set(name.text, isRequest);
    } else {
        for (const element of name.elements) {
            bindNames(scope, element.name, false);
        }
    }
}

function bindNamesFromType(
    scope: ReceiverScope,
    name: ts.BindingName | undefined,
    type: ts.TypeNode | undefined,
): void {
    if (name === undefined) {
        return;
    } else if (ts.isIdentifier(name)) {
        bindNames(scope, name, isDirectSubmitCommandsRequestType(type));
    } else if (type !== undefined && ts.isTypeLiteralNode(type)) {
        for (const element of name.elements) {
            const key = element.propertyName ?? element.name;

            const member = type.members.find(member =>
                ts.isPropertySignature(member) &&
                member.name !== undefined &&
                member.name.getText() === key.getText(),
            );

            bindNamesFromType(
                scope,
                element.name,
                ts.isPropertySignature(member) ? member.type : undefined,
            );
        }
    } else {
        bindNames(scope, name, false);
    }
}

function createScope(parent?: ReceiverScope, isVarScope = false): ReceiverScope {
    const scope = {
        parent,
        requestReceivers: new Map<string, boolean>(),
    } as ReceiverScope;

    scope.varScope = isVarScope || parent === undefined ? scope : parent.varScope;

    return scope;
}

function findReceiver(scope: ReceiverScope, name: string): boolean {
    let current: ReceiverScope | undefined = scope;

    while (current !== undefined) {
        const receiver = current.requestReceivers.get(name);

        if (receiver !== undefined) {
            return receiver;
        }

        current = current.parent;
    }

    return false;
}

function recordModuleName(
    usages: Set<string>,
    moduleSpecifier: ts.Node | undefined,
): void {
    if (moduleSpecifier === undefined) {
        return;
    }

    const literal = ts.isStringLiteral(moduleSpecifier)
        ? moduleSpecifier
        : ts.isLiteralTypeNode(moduleSpecifier) && ts.isStringLiteral(moduleSpecifier.literal)
            ? moduleSpecifier.literal
            : undefined;

    if (
        literal !== undefined &&
        literal.text
            .split("/")
            .some((part) => part.split(".")[0] === removedModuleName)
    ) {
        usages.add(removedModuleName);
    }
}

export function findRemovedSubmitCommandUsages(source: string): string[] {
    const sourceFile = ts.createSourceFile(
        "source.ts",
        source,
        ts.ScriptTarget.Latest,
        true,
        ts.ScriptKind.TS,
    );

    const usages = new Set<string>();

    const visit = (node: ts.Node, scope: ReceiverScope): void => {
        if (ts.isFunctionLike(node)) {
            const functionScope = createScope(scope, true);

            const signature = node as ts.SignatureDeclarationBase;

            if (
                "name" in node &&
                node.name !== undefined &&
                ts.isIdentifier(node.name)
            ) {
                if (node.name.text === removedRequestName) {
                    usages.add(removedRequestName);
                }
            }

            if (signature.typeParameters !== undefined) {
                for (const typeParameter of signature.typeParameters) {
                    visit(typeParameter, functionScope);
                }
            }

            for (const parameter of node.parameters) {
                if (ts.isIdentifier(parameter.name)) {
                    if (parameter.name.text === removedRequestName) {
                        usages.add(removedRequestName);
                    }

                    functionScope.requestReceivers.set(
                        parameter.name.text,
                        isDirectSubmitCommandsRequestType(parameter.type),
                    );
                } else {
                    bindNamesFromType(functionScope, parameter.name, parameter.type);
                }

                if (parameter.type !== undefined) {
                    visit(parameter.type, functionScope);
                }

                if (parameter.initializer !== undefined) {
                    visit(parameter.initializer, functionScope);
                }
            }

            if (signature.type !== undefined) {
                visit(signature.type, functionScope);
            }

            if (node.body !== undefined) {
                visit(node.body, functionScope);
            }

            return;
        } else if (ts.isBlock(node)) {
            const blockScope = createScope(scope);

            for (const statement of node.statements) {
                if (ts.isVariableStatement(statement)) {
                    for (const declaration of statement.declarationList.declarations) {
                        const targetScope = statement.declarationList.flags & ts.NodeFlags.BlockScoped
                            ? blockScope
                            : blockScope.varScope;

                        bindNames(
                            targetScope,
                            declaration.name,
                            false,
                        );
                        bindNamesFromType(blockScope, declaration.name, declaration.type);
                    }
                }
            }

            for (const statement of node.statements) {
                visit(statement, blockScope);
            }

            return;
        } else if (
            ts.isForStatement(node) ||
            ts.isForInStatement(node) ||
            ts.isForOfStatement(node)
        ) {
            const loopScope = createScope(scope);

            const initializer = node.initializer;

            if (initializer !== undefined && ts.isVariableDeclarationList(initializer)) {
                for (const declaration of initializer.declarations) {
                    const targetScope = initializer.flags & ts.NodeFlags.BlockScoped
                        ? loopScope
                        : scope;

                    bindNames(
                        targetScope,
                        declaration.name,
                        isDirectSubmitCommandsRequestType(declaration.type) ||
                            isSubmitCommandsRequestConstruction(declaration.initializer),
                    );
                }
            }

            ts.forEachChild(node, child => visit(child, loopScope));

            return;
        } else if (ts.isCatchClause(node)) {
            const catchScope = createScope(scope);

            if (node.variableDeclaration !== undefined) {
                bindNames(catchScope, node.variableDeclaration.name, false);
            }

            visit(node.block, catchScope);

            return;
        } else if (ts.isVariableDeclaration(node)) {
            if (ts.isIdentifier(node.name)) {
                if (node.name.text === removedRequestName) {
                    usages.add(removedRequestName);
                }
            }

            const declarationList = node.parent;

            const targetScope = ts.isVariableDeclarationList(declarationList) &&
                declarationList.flags & ts.NodeFlags.BlockScoped
                ? scope
                : scope.varScope;

            bindNamesFromType(targetScope, node.name, node.type);

            if (node.type === undefined) {
                bindNames(
                    targetScope,
                    node.name,
                    isSubmitCommandsRequestConstruction(node.initializer),
                );
            }

            if (node.type !== undefined) {
                visit(node.type, scope);
            }

            if (node.initializer !== undefined) {
                visit(node.initializer, scope);
            }

            return;
        } else {
            if (ts.isIdentifier(node) && node.text === removedRequestName) {
                usages.add(removedRequestName);
            }

            if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) {
                recordModuleName(usages, node.moduleSpecifier);
            } else if (ts.isImportTypeNode(node)) {
                recordModuleName(usages, node.argument);
            } else if (
                ts.isCallExpression(node) &&
                node.expression.kind === ts.SyntaxKind.ImportKeyword
            ) {
                recordModuleName(usages, node.arguments[0]);
            }

            if (
                ts.isPropertyAccessExpression(node) &&
                node.name.text === "command" &&
                ts.isIdentifier(node.expression) &&
                findReceiver(scope, node.expression.text)
            ) {
                usages.add(node.getText(sourceFile));
            }

            ts.forEachChild(node, child => visit(child, scope));
        }
    };

    visit(sourceFile, createScope());

    return [...usages];
}
