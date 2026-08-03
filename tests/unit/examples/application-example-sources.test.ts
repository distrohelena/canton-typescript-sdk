import { execFileSync } from "node:child_process";
import { readFileSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import {
    createSourceFile,
    forEachChild,
    isArrowFunction,
    isArrayLiteralExpression,
    isBinaryExpression,
    isCatchClause,
    isConditionalExpression,
    isCallExpression,
    isElementAccessExpression,
    isFunctionDeclaration,
    isIdentifier,
    isImportDeclaration,
    isIfStatement,
    isNamedImports,
    isNewExpression,
    isObjectLiteralExpression,
    isPropertyAssignment,
    isPropertyAccessExpression,
    isPrefixUnaryExpression,
    isShorthandPropertyAssignment,
    isThrowStatement,
    isVariableDeclaration,
    ScriptKind,
    ScriptTarget,
    SyntaxKind,
    type CallExpression,
    type Expression,
    type Node,
    type ObjectLiteralExpression,
} from "typescript";
import { describe, expect, it } from "vitest";

const listPackagesRequest =
    /client\.packageService\.listPackagesAsync\(\s*ledgerApiV2\.ListPackagesRequest\.create\(\),\s*\)/g;

const uploadDarRequest =
    /client\.packageManagementService\.uploadDarFileAsync\(\s*ledgerApiV2\.admin\.UploadDarFileRequest\.create\(\s*\{\s*darFile:\s*fixture\.darBytes,\s*\}\s*\),\s*\)/s;

const packageVisibilityProof =
    /provePackageVisibility\(\s*\{\s*mainPackageId:\s*fixture\.mainPackageId,\s*before:\s*before\.packageIds,\s*after:\s*after\.packageIds,\s*\}\s*\)/s;

const createMessageSubmission =
    /client\.commandService\.submitAndWaitForTransactionAsync\(\s*buildCreateMessageRequest\(\s*\{\s*party:\s*actor\.party,\s*templateId:\s*fixture\.templateId,\s*text:\s*"Hello from the Canton TypeScript SDK",\s*\}\s*\),\s*\)/s;

const deadlineBoundCreateMessageSubmission =
    /client\.commandService\.submitAndWaitForTransactionAsync\(\s*buildCreateMessageRequest\(\s*\{\s*party:\s*actor\.party,\s*templateId:\s*fixture\.templateId,\s*text:\s*"Hello from the Canton TypeScript SDK",\s*\}\s*\),\s*\w+\.createRequestOptions\(\),\s*\)/s;

const replaceMessageSubmission =
    /client\.commandService\.submitAndWaitForTransactionAsync\(\s*buildReplaceMessageTextRequest\(\s*\{\s*party:\s*actor\.party,\s*templateId:\s*fixture\.templateId,\s*contractId:\s*original\.contractId,\s*replacement:\s*"Updated by ReplaceText",\s*\}\s*\),\s*\)/s;

const archivedOriginalProof =
    /if\s*\(\s*archivedContractId\s*!==\s*original\.contractId\s*\)\s*\{/s;

const replacementContractProof =
    /else\s+if\s*\(\s*!replacementContractId\.trim\(\)\s*\|\|\s*replacementContractId\s*===\s*original\.contractId\s*\)\s*\{/s;

const examplesDirectory = fileURLToPath(
    new URL("../../../examples", import.meta.url),
);

const repositoryDirectory = fileURLToPath(
    new URL("../../../", import.meta.url),
);

const getLedgerEndRequest =
    /client\.stateService\.getLedgerEndAsync\(\s*new\s+GetLedgerEndRequest\(\),\s*new\s+RequestOptions\(\s*\{\s*timeoutMs\s*\}\s*\),\s*\)/s;

const updateStreamRequest =
    /client\.updateService\.getUpdatesAsync\(\s*buildUpdatesRequest\(\s*\{\s*beginExclusive:\s*ledgerEnd\.offset,\s*party:\s*actor\.party,\s*templateId:\s*fixture\.templateId,\s*\}\s*\),\s*new\s+RequestOptions\(\s*\{\s*timeoutMs\s*\}\s*\),\s*\)/s;

const userReadRequest =
    /client\.userManagementService\.(?:getUserAsync|listUserRightsAsync|listUsersAsync)\([\s\S]*?new\s+RequestOptions\(\s*\{\s*timeoutMs\s*\}\s*\),\s*\)/g;

const exactSynchronizerHeadStore =
    /const\s+baseQuery\s*=\s*new\s+TopologyBaseQuery\(\s*\{\s*headState:\s*true,\s*storeId:\s*new\s+TopologyStoreId\(\s*\{\s*kind:\s*TopologyStoreKind\.synchronizer,\s*synchronizer:\s*new\s+TopologyStoreSynchronizer\(\s*\{\s*id:\s*synchronizer\s*\}\s*\),\s*\}\s*\),\s*\}\s*\);/s;

const prohibitedCreateExerciseWorkarounds =
    /\b(?:Echo|LEDGER_EFFECTS|sleep|setTimeout|database|db|PQS|query)\b/i;

function readExampleSource(name: string): string {
    return readFileSync(new URL(`../../../examples/${name}`, import.meta.url), "utf8");
}

function readSharedExampleSource(name: string): string {
    return readFileSync(
        new URL(`../../../examples/shared/${name}`, import.meta.url),
        "utf8",
    );
}

function expectSdkActiveContractsTraversal(
    sourcePath: string,
    source: string,
): void {
    const sourceFile = createSourceFile(
        sourcePath,
        source,
        ScriptTarget.Latest,
        true,
        ScriptKind.TS,
    );

    const factoryNames = new Set<string>();

    const traversalCalls: Node[] = [];

    const directPageCalls: Node[] = [];

    const visit = (node: Node): void => {
        if (
            isImportDeclaration(node)
            && node.moduleSpecifier.text.endsWith("active-contracts-traversal.js")
            && node.importClause?.namedBindings !== undefined
            && isNamedImports(node.importClause.namedBindings)
        ) {
            for (const element of node.importClause.namedBindings.elements) {
                if (
                    (element.propertyName?.text ?? element.name.text)
                    === "createExampleActiveContractsTraversalOptions"
                ) {
                    factoryNames.add(element.name.text);
                }
            }
        } else if (
            isCallExpression(node)
            && isPropertyAccessExpression(node.expression)
            && node.expression.name.text === "getActiveContractsPagesAsync"
            && isPropertyAccessExpression(node.expression.expression)
            && node.expression.expression.name.text === "stateService"
            && node.arguments.length === 2
            && isCallExpression(node.arguments[1])
            && isIdentifier(node.arguments[1].expression)
            && factoryNames.has(node.arguments[1].expression.text)
        ) {
            traversalCalls.push(node);
        } else if (
            isCallExpression(node)
            && isPropertyAccessExpression(node.expression)
            && node.expression.name.text === "getActiveContractsPageAsync"
        ) {
            directPageCalls.push(node);
        }

        forEachChild(node, visit);
    };

    visit(sourceFile);

    expect(factoryNames.size).toBe(1);
    expect(traversalCalls).toHaveLength(1);
    expect(directPageCalls).toHaveLength(0);
}

function expectRawConfiguredUserAllocation(source: string): void {
    const sourceFile = createSourceFile(
        "application-fixture.ts",
        source,
        ScriptTarget.Latest,
        true,
        ScriptKind.TS,
    );

    let resolver: Node | undefined;

    const findResolver = (node: Node): void => {
        if (
            isFunctionDeclaration(node)
            && node.name?.text === "resolveExamplePartyAsync"
        ) {
            resolver = node;
        }

        forEachChild(node, findResolver);
    };

    findResolver(sourceFile);

    expect(resolver).toBeDefined();

    if (resolver === undefined) {
        return;
    }

    const initializers = new Map<string, Expression>();

    let allocationUserId: Expression | undefined;

    const inspectResolver = (node: Node): void => {
        if (
            isVariableDeclaration(node)
            && isIdentifier(node.name)
            && node.initializer !== undefined
        ) {
            initializers.set(node.name.text, node.initializer);
        } else if (
            isNewExpression(node)
            && isIdentifier(node.expression)
            && node.expression.text === "AllocatePartyRequest"
            && isObjectLiteralExpression(node.arguments?.[0])
        ) {
            for (const property of node.arguments[0].properties) {
                if (
                    isPropertyAssignment(property)
                    && property.name.getText(sourceFile) === "userId"
                ) {
                    allocationUserId = property.initializer;
                } else if (
                    isShorthandPropertyAssignment(property)
                    && property.name.text === "userId"
                ) {
                    allocationUserId = property.name;
                }
            }
        }

        forEachChild(node, inspectResolver);
    };

    inspectResolver(resolver);

    const resolveAlias = (expression: Expression): Expression => {
        const seen = new Set<string>();

        let resolved = expression;

        while (isIdentifier(resolved) && !seen.has(resolved.text)) {
            seen.add(resolved.text);

            const initializer = initializers.get(resolved.text);

            if (initializer === undefined) {
                break;
            }

            resolved = initializer;
        }

        return resolved;
    };

    const isConfiguredUserId = (expression: Expression): boolean => {
        const resolved = resolveAlias(expression);

        return (
            isPropertyAccessExpression(resolved)
            && resolved.name.text === "SDK_EXAMPLE_USER_ID"
        );
    };

    const countConfiguredUserTrims = (node: Node): number => {
        let count = 0;

        const visit = (candidate: Node): void => {
            if (
                isCallExpression(candidate)
                && isPropertyAccessExpression(candidate.expression)
                && candidate.expression.name.text === "trim"
                && isConfiguredUserId(candidate.expression.expression)
            ) {
                count += 1;
            }

            forEachChild(candidate, visit);
        };

        visit(node);

        return count;
    };

    expect(allocationUserId).toBeDefined();

    if (allocationUserId === undefined) {
        return;
    }

    const selection = resolveAlias(allocationUserId);

    expect(isConditionalExpression(selection)).toBe(true);

    if (!isConditionalExpression(selection)) {
        return;
    }

    expect(isConfiguredUserId(selection.whenTrue)).toBe(true);
    expect(countConfiguredUserTrims(selection.condition)).toBeGreaterThan(0);
    expect(countConfiguredUserTrims(selection.whenTrue)).toBe(0);
    expect(countConfiguredUserTrims(selection.whenFalse)).toBe(0);
}

function exampleSourcePaths(directory = examplesDirectory): readonly string[] {
    const paths: string[] = [];

    for (const entry of readdirSync(directory, { withFileTypes: true })) {
        const path = join(directory, entry.name);

        if (entry.isDirectory()) {
            paths.push(...exampleSourcePaths(path));
        } else if (entry.isFile() && path.endsWith(".ts")) {
            paths.push(path);
        }
    }

    return paths;
}

function importsActiveContractsTraversal(sourcePath: string): boolean {
    const sourceFile = createSourceFile(
        sourcePath,
        readFileSync(sourcePath, "utf8"),
        ScriptTarget.Latest,
        true,
        ScriptKind.TS,
    );

    return sourceFile.statements.some(statement =>
        isImportDeclaration(statement)
        && statement.moduleSpecifier.text.endsWith("active-contracts-traversal.js"),
    );
}

function readRootPackageJson(): {
    scripts: Record<string, string>;
    files: string[];
} {
    return JSON.parse(
        readFileSync(new URL("../../../package.json", import.meta.url), "utf8"),
    ) as { scripts: Record<string, string>; files: string[] };
}

function readReadme(): string {
    return readFileSync(new URL("../../../README.md", import.meta.url), "utf8");
}

function readRootGitignore(): readonly string[] {
    return readFileSync(new URL("../../../.gitignore", import.meta.url), "utf8")
        .split("\n")
        .map(line => line.replace(/\r$/, ""));
}

function readPublicIndex(): string {
    return readFileSync(new URL("../../../src/index.ts", import.meta.url), "utf8");
}

function readReadmeParagraph(readme: string, marker: string): string {
    const start = readme.indexOf(marker);

    if (start < 0) {
        throw new Error(`Expected README paragraph containing ${marker}.`);
    }

    const end = readme.indexOf("\n\n", start);

    return readme.slice(start, end < 0 ? undefined : end);
}

function readServiceMapEntry(readme: string, method: string): string {
    const serviceMapStart = readme.indexOf("## Service Map");

    if (serviceMapStart < 0) {
        throw new Error("Expected README service map.");
    }

    const entry = readme
        .slice(serviceMapStart)
        .split("\n")
        .find(line => line.startsWith("-") && line.includes(method));

    if (entry === undefined) {
        throw new Error(`Expected service map entry for ${method}.`);
    }

    return entry;
}

function expectActiveContractsTraversalDocumentation(readme: string): void {
    const traversalDocumentation = readReadmeParagraph(
        readme,
        "stateService.getActiveContractsPagesAsync",
    );

    expect(traversalDocumentation).toContain("gRPC-only");
    expect(traversalDocumentation).toContain("lazy");
    expect(traversalDocumentation).toContain("raw");
    expect(traversalDocumentation).toContain("bounded");
    expect(traversalDocumentation).toContain("caller");
    expect(traversalDocumentation).toContain("OperationDeadline");
    expect(traversalDocumentation).toContain("maximum pages");
    expect(traversalDocumentation).toContain("maximum contracts");
    expect(traversalDocumentation).toContain("collect-all");
    expect(traversalDocumentation).toContain("Transport errors");
    expect(traversalDocumentation).toContain("dispatched RPCs");
    expect(traversalDocumentation).toContain("propagate unchanged");
    expect(traversalDocumentation).toContain("ActiveContractsTraversalError");
    expect(traversalDocumentation).toContain("safety");
    expect(traversalDocumentation).toContain("invariant");
    expect(traversalDocumentation).toContain("bound failures");

    const jsonDocumentation = readReadmeParagraph(
        readme,
        "JSON does not implement either paginated gRPC API.",
    );

    expect(jsonDocumentation).toContain("getActiveContractsAsync");
    expect(jsonDocumentation).toContain("existing");
    expect(jsonDocumentation).toContain("streaming");

    expect(
        readServiceMapEntry(readme, "getActiveContractsPageAsync"),
    ).toContain("`grpc` only");
    expect(
        readServiceMapEntry(readme, "getActiveContractsPagesAsync"),
    ).toContain("`grpc` only");

    const jsonServiceMapEntry = readServiceMapEntry(
        readme,
        "getActiveContractsAsync",
    );

    expect(jsonServiceMapEntry).toContain("`json` only");
    expect(jsonServiceMapEntry).toContain("existing");
    expect(jsonServiceMapEntry).toContain("streaming");
}

function expectStandaloneCleanup(source: string): void {
    const runExampleWithCleanup =
        /runExampleAsync\(\s*"[^"]+",\s*async\s*\(\)\s*=>\s*\{[\s\S]*?const\s+client\s*=\s*createExampleClient\(\);[\s\S]*?try\s*\{[\s\S]*?\}\s*finally\s*\{\s*await\s+client\.disposeAsync\(\);\s*\}[\s\S]*?\}\s*\);/;

    expect(source).toMatch(runExampleWithCleanup);
}

function requireSourceMatch(
    source: string,
    expression: RegExp,
    description: string,
): RegExpMatchArray {
    const match = source.match(expression);

    if (match === null || match.index === undefined) {
        throw new Error(`Expected source to contain ${description}.`);
    }

    return match;
}

function expectResumeUpdateWorkflowSource(source: string): void {
    const savedOffset = source.match(
        /const\s+(\w+)\s*=\s*ledgerEnd\.offset\.trim\(\);/,
    )?.[1];

    if (savedOffset === undefined) {
        throw new Error("Expected a saved ledger-end offset.");
    }

    const savedOffsetPath = new RegExp(`beginExclusive\\s*:\\s*${savedOffset}`);

    expect(source).toMatch(/new\s+OperationDeadline/);
    expect(source).toMatch(/createRequestOptions\(\)/);
    expect(source).toMatch(/const\s+idleTimeoutMs\s*=\s*Math\.max\(\s*1,\s*Math\.min\(\s*2_000,\s*Math\.floor\(\s*\w+\.remainingTimeoutMs\(\)\s*\/\s*4\s*\)\s*\)\s*\)\s*;/s);
    expect(source).toMatch(/timeoutMs\s*:\s*idleTimeoutMs/);
    expect(source).toMatch(savedOffsetPath);
    expect(source).toMatch(/expectIdleUpdateStreamTimeoutAsync/);
    expect(source).toMatch(/matchResumedUpdateAsync/);
    expect(source).toMatch(/rejectPreOffsetContract/);
    expect(source).toMatch(/matchCreatedMessageUpdate/);
    expect(source).toContain("Update ID:");
    expect(source).toContain("Offset:");
    expect(source).toContain("Participant version:");
    expect(source).not.toMatch(/\b(?:sleep|setTimeout|polling)\b/i);
    expect(source).not.toMatch(/participantVersion\s*(?:===|!==)|switch\s*\(\s*compatibility\.participantVersion/);
}

function expectArchiveAndStaleContractWorkflowSource(source: string): void {
    expect(source).toMatch(/new\s+OperationDeadline/);
    expect(source).toMatch(/createRequestOptions\(\)/);
    expect(source).toMatch(/extractCreatedContract\(/);
    expect(source).toMatch(/extractReplacementContracts\(/);
    expect(source).toMatch(/assertMessageContractAbsent\(/);
    expect(source).toMatch(/assertExactlyOneActiveMessage\(/);
    expect(source).toMatch(/assertExactCreatedMessagePayload\(\s*\{/s);
    expect(source).toMatch(/classifyWorkflowFailure\(/);
    expect(source).toMatch(/kind:\s*"staleContract"/);
    expect(source).toMatch(/archive-create-\$\{\w+\}/);
    expect(source).toMatch(/archive-replace-\$\{\w+\}/);
    expect(source).toMatch(/archive-stale-\$\{\w+\}/);
    expect(source).toMatch(/archivedContractId\s*!==\s*\w+\.contractId/);
    expect(source).toMatch(/replacementContractId\s*===\s*\w+\.contractId/);
    expect(source).toContain("archived original unexpectedly succeeded");
    expect(source).toMatch(/\.createRequestOptions\(\)/);
    expect(source).toContain("Original contract ID:");
    expect(source).toContain("Replacement contract ID:");
    expect(source).toContain("Replacement payload:");
    expect(source).toContain("Replacement text:");
    expect(source).toContain("Stale failure kind:");
    expect(source).toContain("Participant version:");
    expect(source).toContain("Release core:");
    expect(source).toContain("Compatibility path:");
    expect(source).not.toMatch(/\b(?:sleep|setTimeout)\b/i);
    expect(source).not.toMatch(/error\.message|RegExp|match\s*\(/);
    expect(source).not.toMatch(/participantVersion\s*(?:===|!==)|switch\s*\(\s*compatibility\.participantVersion/);
}

function getObjectPropertyExpression(
    object: ObjectLiteralExpression,
    propertyName: string,
): Expression | undefined {
    for (const property of object.properties) {
        if (
            isPropertyAssignment(property)
            && property.name.getText() === propertyName
        ) {
            return property.initializer;
        } else if (
            isShorthandPropertyAssignment(property)
            && property.name.text === propertyName
        ) {
            return property.name;
        }
    }

    return undefined;
}

function collectCalls(
    sourceFile: Node,
    predicate: (call: CallExpression) => boolean,
): CallExpression[] {
    const calls: CallExpression[] = [];

    const visit = (node: Node): void => {
        if (isCallExpression(node) && predicate(node)) {
            calls.push(node);
        }

        forEachChild(node, visit);
    };

    visit(sourceFile);

    return calls;
}

function expectSingleCall(
    sourceFile: Node,
    predicate: (call: CallExpression) => boolean,
    description: string,
): CallExpression {
    const calls = collectCalls(sourceFile, predicate);

    expect(calls, description).toHaveLength(1);

    const [call] = calls;

    if (call === undefined) {
        throw new Error(`Expected ${description}.`);
    }

    return call;
}

function isNamedCall(call: CallExpression, name: string): boolean {
    return isIdentifier(call.expression)
        ? call.expression.text === name
        : isPropertyAccessExpression(call.expression)
            && call.expression.name.text === name;
}

function declaredNameForExpression(expression: Expression): string {
    let current: Node | undefined = expression;

    while (current !== undefined && !isVariableDeclaration(current)) {
        current = current.parent;
    }

    if (current === undefined || !isIdentifier(current.name)) {
        throw new Error("Expected expression to initialize an identifier declaration.");
    }

    return current.name.text;
}

function isIdentifierNamed(expression: Node, name: string): boolean {
    return isIdentifier(expression) && expression.text === name;
}

function isProcessEnvironmentUserId(expression: Expression): boolean {
    return isPropertyAccessExpression(expression)
        && expression.name.text === "SDK_EXAMPLE_USER_ID"
        && isPropertyAccessExpression(expression.expression)
        && expression.expression.name.text === "env"
        && isIdentifier(expression.expression.expression)
        && expression.expression.expression.text === "process";
}

function containsTrimOfIdentifier(node: Node, name: string): boolean {
    let found = false;

    const visit = (candidate: Node): void => {
        if (
            isCallExpression(candidate)
            && isPropertyAccessExpression(candidate.expression)
            && candidate.expression.name.text === "trim"
            && isIdentifierNamed(candidate.expression.expression, name)
        ) {
            found = true;
        }

        forEachChild(candidate, visit);
    };

    visit(node);

    return found;
}

function containsThrow(node: Node): boolean {
    let found = false;

    const visit = (candidate: Node): void => {
        if (isThrowStatement(candidate)) {
            found = true;
        }

        forEachChild(candidate, visit);
    };

    visit(node);

    return found;
}

function expectCommandCompletionCorrelationSource(source: string): void {
    const sourceFile = createSourceFile(
        "94-command-completion-correlation.ts",
        source,
        ScriptTarget.Latest,
        true,
        ScriptKind.TS,
    );

    let configuredUserName: string | undefined;

    const findConfiguredUser = (node: Node): void => {
        if (
            isVariableDeclaration(node)
            && isIdentifier(node.name)
            && node.initializer !== undefined
            && isProcessEnvironmentUserId(node.initializer)
        ) {
            configuredUserName = node.name.text;
        }

        forEachChild(node, findConfiguredUser);
    };

    findConfiguredUser(sourceFile);

    expect(configuredUserName).toBeDefined();

    if (configuredUserName === undefined) {
        return;
    }

    const clientCreation = expectSingleCall(
        sourceFile,
        call => isNamedCall(call, "createExampleClient"),
        "one localnet example client creation",
    );

    const validations: Node[] = [];

    const findValidation = (node: Node): void => {
        if (
            isIfStatement(node)
            && containsTrimOfIdentifier(node.expression, configuredUserName)
            && containsThrow(node.thenStatement)
        ) {
            validations.push(node);
        }

        forEachChild(node, findValidation);
    };

    findValidation(sourceFile);

    expect(validations).toHaveLength(1);

    const [validation] = validations;

    if (validation === undefined) {
        return;
    }

    expect(validation.getStart(sourceFile)).toBeLessThan(
        clientCreation.getStart(sourceFile),
    );

    const deadlines: Node[] = [];

    const findDeadlines = (node: Node): void => {
        if (
            isNewExpression(node)
            && isIdentifier(node.expression)
            && node.expression.text === "OperationDeadline"
        ) {
            deadlines.push(node);
        }

        forEachChild(node, findDeadlines);
    };

    findDeadlines(sourceFile);

    expect(deadlines).toHaveLength(1);

    const [deadline] = deadlines;

    if (deadline === undefined || !isNewExpression(deadline)) {
        return;
    }

    const deadlineName = declaredNameForExpression(deadline);

    const fixture = expectSingleCall(
        sourceFile,
        call => isNamedCall(call, "loadExampleApplicationFixtureAsync"),
        "one fixture load",
    );

    const ensureDar = expectSingleCall(
        sourceFile,
        call => isNamedCall(call, "ensureExampleDarUploadedAsync"),
        "one DAR upload/visibility check",
    );

    const resolveParty = expectSingleCall(
        sourceFile,
        call => isNamedCall(call, "resolveExamplePartyAsync"),
        "one party resolution",
    );

    const compatibility = expectSingleCall(
        sourceFile,
        call => isNamedCall(call, "readWorkflowCompatibilityAsync"),
        "one participant compatibility check",
    );

    const ledgerEnd = expectSingleCall(
        sourceFile,
        call => isNamedCall(call, "getLedgerEndAsync"),
        "one ledger-end read",
    );

    expect(deadline.getStart(sourceFile)).toBeLessThan(
        fixture.getStart(sourceFile),
    );
    expect(fixture.getStart(sourceFile)).toBeLessThan(
        ensureDar.getStart(sourceFile),
    );
    expect(ensureDar.getStart(sourceFile)).toBeLessThan(
        resolveParty.getStart(sourceFile),
    );
    expect(resolveParty.getStart(sourceFile)).toBeLessThan(
        compatibility.getStart(sourceFile),
    );
    expect(compatibility.getStart(sourceFile)).toBeLessThan(
        ledgerEnd.getStart(sourceFile),
    );

    expect(resolveParty.arguments).toHaveLength(3);
    expect(isIdentifierNamed(resolveParty.arguments[2], deadlineName)).toBe(true);

    const actorName = declaredNameForExpression(resolveParty);

    const ledgerEndOptions = ledgerEnd.arguments[1];

    expect(
        ledgerEndOptions !== undefined
        && isCallExpression(ledgerEndOptions)
        && isNamedCall(ledgerEndOptions, "createRequestOptions")
        && isIdentifierNamed(ledgerEndOptions.expression.expression, deadlineName),
    ).toBe(true);

    const ledgerEndName = declaredNameForExpression(ledgerEnd);

    const savedOffsets: string[] = [];

    const findSavedOffset = (node: Node): void => {
        if (
            isVariableDeclaration(node)
            && isIdentifier(node.name)
            && node.initializer !== undefined
            && isPropertyAccessExpression(node.initializer)
            && node.initializer.name.text === "offset"
            && isIdentifierNamed(node.initializer.expression, ledgerEndName)
        ) {
            savedOffsets.push(node.name.text);
        }

        forEachChild(node, findSavedOffset);
    };

    findSavedOffset(sourceFile);

    expect(savedOffsets).toHaveLength(1);

    const [savedOffsetName] = savedOffsets;

    if (savedOffsetName === undefined) {
        return;
    }

    const getCompletions = expectSingleCall(
        sourceFile,
        call => isNamedCall(call, "getCompletionsAsync"),
        "one completion stream creation",
    );

    const savedOffsetValidations: Node[] = [];

    const findSavedOffsetValidation = (node: Node): void => {
        if (
            isIfStatement(node)
            && containsTrimOfIdentifier(node.expression, savedOffsetName)
            && containsThrow(node.thenStatement)
        ) {
            savedOffsetValidations.push(node);
        }

        forEachChild(node, findSavedOffsetValidation);
    };

    findSavedOffsetValidation(sourceFile);

    expect(savedOffsetValidations).toHaveLength(1);

    const [savedOffsetValidation] = savedOffsetValidations;

    if (savedOffsetValidation === undefined) {
        return;
    }

    expect(savedOffsetValidation.getStart(sourceFile)).toBeLessThan(
        getCompletions.getStart(sourceFile),
    );

    const completionRequest = getCompletions.arguments[0];

    expect(completionRequest !== undefined && isCallExpression(completionRequest)).toBe(true);

    if (completionRequest === undefined || !isCallExpression(completionRequest)) {
        return;
    }

    expect(
        isPropertyAccessExpression(completionRequest.expression)
        && completionRequest.expression.name.text === "create"
        && isPropertyAccessExpression(completionRequest.expression.expression)
        && completionRequest.expression.expression.name.text === "GetCompletionsRequest",
    ).toBe(true);

    const completionRequestInit = completionRequest.arguments[0];

    expect(isObjectLiteralExpression(completionRequestInit)).toBe(true);

    if (!isObjectLiteralExpression(completionRequestInit)) {
        return;
    }

    const beginExclusive = getObjectPropertyExpression(
        completionRequestInit,
        "beginExclusive",
    );

    const parties = getObjectPropertyExpression(
        completionRequestInit,
        "parties",
    );

    expect(
        beginExclusive !== undefined
        && isIdentifierNamed(beginExclusive, savedOffsetName),
    ).toBe(true);
    expect(
        parties !== undefined
        && isArrayLiteralExpression(parties)
        && parties.elements.length === 1
        && isPropertyAccessExpression(parties.elements[0])
        && parties.elements[0].name.text === "party"
        && isIdentifierNamed(parties.elements[0].expression, actorName),
    ).toBe(true);

    const completionOptions = getCompletions.arguments[1];

    expect(
        completionOptions !== undefined
        && isCallExpression(completionOptions)
        && isNamedCall(completionOptions, "createRequestOptions")
        && isIdentifierNamed(completionOptions.expression.expression, deadlineName),
    ).toBe(true);

    const streamName = declaredNameForExpression(getCompletions);

    const iteratorDeclarations: string[] = [];

    const findIterator = (node: Node): void => {
        if (
            isVariableDeclaration(node)
            && isIdentifier(node.name)
            && node.initializer !== undefined
            && isCallExpression(node.initializer)
            && isElementAccessExpression(node.initializer.expression)
            && isIdentifierNamed(node.initializer.expression.expression, streamName)
        ) {
            iteratorDeclarations.push(node.name.text);
        }

        forEachChild(node, findIterator);
    };

    findIterator(sourceFile);

    expect(iteratorDeclarations).toHaveLength(1);

    const [iteratorName] = iteratorDeclarations;

    if (iteratorName === undefined) {
        return;
    }

    const firstRead = expectSingleCall(
        sourceFile,
        call => isNamedCall(call, "next")
            && isPropertyAccessExpression(call.expression)
            && isIdentifierNamed(call.expression.expression, iteratorName),
        "one first completion-stream read",
    );

    const wrapper = expectSingleCall(
        sourceFile,
        call => isNamedCall(call, "submitAndWaitForCommandCompletionAsync"),
        "one completion correlation wrapper call",
    );

    expect(firstRead.getStart(sourceFile)).toBeLessThan(
        wrapper.getStart(sourceFile),
    );

    const firstReadName = declaredNameForExpression(firstRead);

    const wrapperInit = wrapper.arguments[0];

    expect(isObjectLiteralExpression(wrapperInit)).toBe(true);

    if (!isObjectLiteralExpression(wrapperInit)) {
        return;
    }

    const wrapperIterator = getObjectPropertyExpression(wrapperInit, "iterator");

    const wrapperFirstRead = getObjectPropertyExpression(
        wrapperInit,
        "firstNextPromise",
    );

    const expectedUser = getObjectPropertyExpression(
        wrapperInit,
        "expectedUserId",
    );

    expect(
        wrapperIterator !== undefined
        && isIdentifierNamed(wrapperIterator, iteratorName),
    ).toBe(true);
    expect(
        wrapperFirstRead !== undefined
        && isIdentifierNamed(wrapperFirstRead, firstReadName),
    ).toBe(true);
    expect(
        expectedUser !== undefined
        && isIdentifierNamed(expectedUser, configuredUserName),
    ).toBe(true);

    const submitAsync = getObjectPropertyExpression(wrapperInit, "submitAsync");

    expect(isArrowFunction(submitAsync)).toBe(true);

    if (!isArrowFunction(submitAsync)) {
        return;
    }

    const commandSubmission = expectSingleCall(
        submitAsync,
        call => isNamedCall(call, "submitAndWaitForTransactionAsync"),
        "one transaction submission in the correlation wrapper",
    );

    const commandRequest = commandSubmission.arguments[0];

    expect(commandRequest !== undefined && isCallExpression(commandRequest)).toBe(true);

    if (commandRequest === undefined || !isCallExpression(commandRequest)) {
        return;
    }

    expect(isNamedCall(commandRequest, "buildCreateMessageRequest")).toBe(true);

    const commandRequestInit = commandRequest.arguments[0];

    expect(isObjectLiteralExpression(commandRequestInit)).toBe(true);

    if (!isObjectLiteralExpression(commandRequestInit)) {
        return;
    }

    const requestUser = getObjectPropertyExpression(commandRequestInit, "userId");

    expect(
        requestUser !== undefined
        && isIdentifierNamed(requestUser, configuredUserName),
    ).toBe(true);

    const submissionOptions = commandSubmission.arguments[1];

    expect(
        submissionOptions !== undefined
        && isCallExpression(submissionOptions)
        && isNamedCall(submissionOptions, "createRequestOptions")
        && isIdentifierNamed(submissionOptions.expression.expression, deadlineName),
    ).toBe(true);

    expect(
        collectCalls(
            sourceFile,
            call => isPropertyAccessExpression(call.expression)
                && call.expression.name.text === "return",
        ),
    ).toHaveLength(0);
}

function findLedgerApiV2NamespaceName(sourceFile: Node): string | undefined {
    let namespaceName: string | undefined;

    const visit = (node: Node): void => {
        if (
            isImportDeclaration(node)
            && node.moduleSpecifier.text.endsWith("/protobuf")
            && node.importClause?.namedBindings !== undefined
            && isNamedImports(node.importClause.namedBindings)
        ) {
            for (const element of node.importClause.namedBindings.elements) {
                if ((element.propertyName?.text ?? element.name.text) === "ledgerApiV2") {
                    namespaceName = element.name.text;
                }
            }
        }

        forEachChild(node, visit);
    };

    visit(sourceFile);

    return namespaceName;
}

function isLedgerApiV2RequestCreateCall(
    call: CallExpression,
    requestName: string,
    namespaceName: string,
): boolean {
    return isPropertyAccessExpression(call.expression)
        && call.expression.name.text === "create"
        && isPropertyAccessExpression(call.expression.expression)
        && call.expression.expression.name.text === requestName
        && isIdentifierNamed(call.expression.expression.expression, namespaceName);
}

function isClientEventQueryCall(call: CallExpression): boolean {
    return isPropertyAccessExpression(call.expression)
        && call.expression.name.text === "getEventsByContractIdAsync"
        && isPropertyAccessExpression(call.expression.expression)
        && call.expression.expression.name.text === "eventQueryService"
        && isPropertyAccessExpression(call.expression.expression.expression)
        && call.expression.expression.expression.name.text === "client";
}

function isMemberOf(
    expression: Expression,
    objectName: string,
    propertyName: string,
): boolean {
    return isPropertyAccessExpression(expression)
        && expression.name.text === propertyName
        && isIdentifierNamed(expression.expression, objectName);
}

function isDeadlineRequestOptions(
    expression: Expression | undefined,
    deadlineName: string,
): boolean {
    return expression !== undefined
        && isCallExpression(expression)
        && isNamedCall(expression, "createRequestOptions")
        && isPropertyAccessExpression(expression.expression)
        && isIdentifierNamed(expression.expression.expression, deadlineName);
}

function isDescendantOf(node: Node, ancestor: Node): boolean {
    let current: Node | undefined = node;

    while (current !== undefined) {
        if (current === ancestor) {
            return true;
        }

        current = current.parent;
    }

    return false;
}

function isInsideCatchClause(node: Node): boolean {
    let current: Node | undefined = node.parent;

    while (current !== undefined) {
        if (isCatchClause(current)) {
            return true;
        }

        current = current.parent;
    }

    return false;
}

function hasMemberComparison(
    node: Node,
    left: (expression: Expression) => boolean,
    operator: SyntaxKind,
    right: (expression: Expression) => boolean,
): boolean {
    let found = false;

    const visit = (candidate: Node): void => {
        if (
            isBinaryExpression(candidate)
            && candidate.operatorToken.kind === operator
            && left(candidate.left)
            && right(candidate.right)
        ) {
            found = true;
        }

        forEachChild(candidate, visit);
    };

    visit(node);

    return found;
}

function containsTrimOfMember(
    node: Node,
    objectName: string,
    propertyName: string,
): boolean {
    let found = false;

    const visit = (candidate: Node): void => {
        if (
            isCallExpression(candidate)
            && isPropertyAccessExpression(candidate.expression)
            && candidate.expression.name.text === "trim"
            && isMemberOf(candidate.expression.expression, objectName, propertyName)
        ) {
            found = true;
        }

        forEachChild(candidate, visit);
    };

    visit(node);

    return found;
}

function containsNegatedTrimOfMember(
    node: Node,
    objectName: string,
    propertyName: string,
): boolean {
    let found = false;

    const visit = (candidate: Node): void => {
        if (
            isPrefixUnaryExpression(candidate)
            && candidate.operator === SyntaxKind.ExclamationToken
            && isCallExpression(candidate.operand)
            && isPropertyAccessExpression(candidate.operand.expression)
            && candidate.operand.expression.name.text === "trim"
            && isMemberOf(
                candidate.operand.expression.expression,
                objectName,
                propertyName,
            )
        ) {
            found = true;
        }

        forEachChild(candidate, visit);
    };

    visit(node);

    return found;
}

function hasParticipantVersionEquality(node: Node): boolean {
    let found = false;

    const visit = (candidate: Node): void => {
        if (
            isBinaryExpression(candidate)
            && (
                candidate.operatorToken.kind === SyntaxKind.EqualsEqualsEqualsToken
                || candidate.operatorToken.kind === SyntaxKind.ExclamationEqualsEqualsToken
            )
            && (
                (isPropertyAccessExpression(candidate.left)
                    && candidate.left.name.text === "participantVersion")
                || (isPropertyAccessExpression(candidate.right)
                    && candidate.right.name.text === "participantVersion")
            )
        ) {
            found = true;
        }

        forEachChild(candidate, visit);
    };

    visit(node);

    return found;
}

function expectContractLifecycleAuditWorkflowSource(source: string): void {
    const sourceFile = createSourceFile(
        "contract-lifecycle-audit-workflow.ts",
        source,
        ScriptTarget.Latest,
        true,
        ScriptKind.TS,
    );

    const ledgerApiV2NamespaceName = findLedgerApiV2NamespaceName(sourceFile);

    expect(ledgerApiV2NamespaceName).toBeDefined();

    if (ledgerApiV2NamespaceName === undefined) {
        return;
    }

    const deadline = expectSingleCall(
        sourceFile,
        call => isNamedCall(call, "createDeadline"),
        "one workflow deadline",
    );

    const fixture = expectSingleCall(
        sourceFile,
        call => isNamedCall(call, "loadFixtureAsync"),
        "one fixture load",
    );

    const ensureDar = expectSingleCall(
        sourceFile,
        call => isNamedCall(call, "ensureDarUploadedAsync"),
        "one DAR upload/visibility check",
    );

    const resolveParty = expectSingleCall(
        sourceFile,
        call => isNamedCall(call, "resolvePartyAsync"),
        "one party resolution",
    );

    const compatibility = expectSingleCall(
        sourceFile,
        call => isNamedCall(call, "readCompatibilityAsync"),
        "one compatibility read",
    );

    const deadlineName = declaredNameForExpression(deadline);

    const fixtureName = declaredNameForExpression(fixture);

    const actorName = declaredNameForExpression(resolveParty);

    expect(deadline.getStart(sourceFile)).toBeLessThan(fixture.getStart(sourceFile));
    expect(fixture.getStart(sourceFile)).toBeLessThan(ensureDar.getStart(sourceFile));
    expect(ensureDar.getStart(sourceFile)).toBeLessThan(resolveParty.getStart(sourceFile));
    expect(resolveParty.getStart(sourceFile)).toBeLessThan(compatibility.getStart(sourceFile));
    expect(isIdentifierNamed(ensureDar.arguments[1], fixtureName)).toBe(true);
    expect(isIdentifierNamed(ensureDar.arguments[2], deadlineName)).toBe(true);
    expect(isIdentifierNamed(resolveParty.arguments[2], deadlineName)).toBe(true);
    expect(isIdentifierNamed(compatibility.arguments[1], deadlineName)).toBe(true);

    const originalExtraction = expectSingleCall(
        sourceFile,
        call => isNamedCall(call, "extractCreatedContract"),
        "one original contract extraction",
    );

    const replacementExtraction = expectSingleCall(
        sourceFile,
        call => isNamedCall(call, "extractReplacementContracts"),
        "one replacement contract extraction",
    );

    const originalName = declaredNameForExpression(originalExtraction);

    const replacementName = declaredNameForExpression(replacementExtraction);

    const directLookups = collectCalls(
        sourceFile,
        call => isNamedCall(call, "getContractAsync"),
    );

    expect(directLookups).toHaveLength(2);

    const directContractIds: Expression[] = [];

    for (const lookup of directLookups) {
        const request = lookup.arguments[0];

        expect(request !== undefined && isCallExpression(request)).toBe(true);
        expect(
            request !== undefined
            && isCallExpression(request)
            && isLedgerApiV2RequestCreateCall(
                request,
                "GetContractRequest",
                ledgerApiV2NamespaceName,
            ),
        ).toBe(true);

        if (request === undefined || !isCallExpression(request)) {
            return;
        }

        const requestInit = request.arguments[0];

        expect(isObjectLiteralExpression(requestInit)).toBe(true);

        if (!isObjectLiteralExpression(requestInit)) {
            return;
        }

        const contractId = getObjectPropertyExpression(requestInit, "contractId");

        const queryingParties = getObjectPropertyExpression(requestInit, "queryingParties");

        expect(contractId).toBeDefined();
        expect(
            queryingParties !== undefined
            && isArrayLiteralExpression(queryingParties)
            && queryingParties.elements.length === 1
            && isMemberOf(queryingParties.elements[0], actorName, "party"),
        ).toBe(true);
        expect(isDeadlineRequestOptions(lookup.arguments[1], deadlineName)).toBe(true);

        if (contractId !== undefined) {
            directContractIds.push(contractId);
        }
    }

    expect(directContractIds).toHaveLength(2);
    expect(isMemberOf(directContractIds[0]!, originalName, "contractId")).toBe(true);
    expect(
        isMemberOf(
            directContractIds[1]!,
            replacementName,
            "replacementContractId",
        ),
    ).toBe(true);
    expect(directLookups[0]!.getStart(sourceFile)).toBeLessThan(
        replacementExtraction.getStart(sourceFile),
    );
    expect(replacementExtraction.getStart(sourceFile)).toBeLessThan(
        directLookups[1]!.getStart(sourceFile),
    );

    expect(
        containsTrimOfMember(
            sourceFile,
            replacementName,
            "replacementContractId",
        ),
    ).toBe(true);
    expect(
        containsNegatedTrimOfMember(
            sourceFile,
            replacementName,
            "replacementContractId",
        ),
    ).toBe(true);
    expect(hasMemberComparison(
        sourceFile,
        expression => isMemberOf(expression, replacementName, "archivedContractId"),
        SyntaxKind.ExclamationEqualsEqualsToken,
        expression => isMemberOf(expression, originalName, "contractId"),
    )).toBe(true);
    expect(hasMemberComparison(
        sourceFile,
        expression => isMemberOf(expression, replacementName, "replacementContractId"),
        SyntaxKind.EqualsEqualsEqualsToken,
        expression => isMemberOf(expression, originalName, "contractId"),
    )).toBe(true);

    const historyRequest = expectSingleCall(
        sourceFile,
        call => isLedgerApiV2RequestCreateCall(
            call,
            "GetEventsByContractIdRequest",
            ledgerApiV2NamespaceName,
        ),
        "one generated event-history request",
    );

    const historyRequestInit = historyRequest.arguments[0];

    expect(isObjectLiteralExpression(historyRequestInit)).toBe(true);

    if (!isObjectLiteralExpression(historyRequestInit)) {
        return;
    }

    expect(
        isMemberOf(
            getObjectPropertyExpression(historyRequestInit, "contractId")!,
            originalName,
            "contractId",
        ),
    ).toBe(true);

    const eventFormat = getObjectPropertyExpression(historyRequestInit, "eventFormat");

    expect(eventFormat !== undefined && isCallExpression(eventFormat)).toBe(true);
    expect(
        eventFormat !== undefined
        && isCallExpression(eventFormat)
        && isNamedCall(eventFormat, "buildMessageLifecycleEventFormat")
        && isMemberOf(eventFormat.arguments[0]!, actorName, "party")
        && isMemberOf(eventFormat.arguments[1]!, fixtureName, "templateId"),
    ).toBe(true);

    const historyWait = expectSingleCall(
        sourceFile,
        call => isNamedCall(call, "waitForCompleteOriginalHistoryAsync"),
        "one deadline-bounded history wait",
    );

    const historyWaitInit = historyWait.arguments[0];

    expect(isObjectLiteralExpression(historyWaitInit)).toBe(true);

    if (!isObjectLiteralExpression(historyWaitInit)) {
        return;
    }

    expect(
        isIdentifierNamed(
            getObjectPropertyExpression(historyWaitInit, "deadline")!,
            deadlineName,
        ),
    ).toBe(true);

    const eventQueries = collectCalls(
        sourceFile,
        isClientEventQueryCall,
    );

    expect(eventQueries).toHaveLength(1);
    expect(isDescendantOf(eventQueries[0]!, historyWait)).toBe(true);
    expect(isInsideCatchClause(eventQueries[0]!)).toBe(false);

    expect(source).not.toMatch(/\b(?:updateService|hash|filtersForAnyParty|TransactionShape|getActiveContracts)\b/);
    expect(source).not.toMatch(/error\.message|RegExp/);
    expect(hasParticipantVersionEquality(sourceFile)).toBe(false);
}

function expectUpdateLookupReconciliationWorkflowSource(init: {
    readonly workflowSource: string;
    readonly requestSource: string;
}): void {
    const sourceFile = createSourceFile(
        "update-lookup-reconciliation-workflow.ts",
        init.workflowSource,
        ScriptTarget.Latest,
        true,
        ScriptKind.TS,
    );

    const ledgerApiV2NamespaceName = findLedgerApiV2NamespaceName(sourceFile);

    expect(ledgerApiV2NamespaceName).toBeDefined();

    if (ledgerApiV2NamespaceName === undefined) {
        return;
    }

    const deadline = expectSingleCall(
        sourceFile,
        call => isNamedCall(call, "createDeadline"),
        "one workflow deadline",
    );

    const fixture = expectSingleCall(
        sourceFile,
        call => isNamedCall(call, "loadFixtureAsync"),
        "one fixture load",
    );

    const ensureDar = expectSingleCall(
        sourceFile,
        call => isNamedCall(call, "ensureDarUploadedAsync"),
        "one DAR upload/visibility check",
    );

    const resolveParty = expectSingleCall(
        sourceFile,
        call => isNamedCall(call, "resolvePartyAsync"),
        "one party resolution",
    );

    const compatibility = expectSingleCall(
        sourceFile,
        call => isNamedCall(call, "readCompatibilityAsync"),
        "one compatibility read",
    );

    const ledgerEnd = expectSingleCall(
        sourceFile,
        call => isNamedCall(call, "getLedgerEndAsync"),
        "one ledger-end read",
    );

    const deadlineName = declaredNameForExpression(deadline);

    const actorName = declaredNameForExpression(resolveParty);

    const fixtureName = declaredNameForExpression(fixture);

    const ledgerEndName = declaredNameForExpression(ledgerEnd);

    expect(deadline.getStart(sourceFile)).toBeLessThan(fixture.getStart(sourceFile));
    expect(fixture.getStart(sourceFile)).toBeLessThan(ensureDar.getStart(sourceFile));
    expect(ensureDar.getStart(sourceFile)).toBeLessThan(resolveParty.getStart(sourceFile));
    expect(resolveParty.getStart(sourceFile)).toBeLessThan(compatibility.getStart(sourceFile));
    expect(compatibility.getStart(sourceFile)).toBeLessThan(ledgerEnd.getStart(sourceFile));
    expect(isDeadlineRequestOptions(ledgerEnd.arguments[1], deadlineName)).toBe(true);

    const savedOffset = init.workflowSource.match(
        new RegExp(`const\\s+(\\w+)\\s*=\\s*${ledgerEndName}\\.offset\\.trim\\(\\);`),
    )?.[1];

    expect(savedOffset).toBeDefined();

    if (savedOffset === undefined) {
        return;
    }

    expect(init.workflowSource).toMatch(
        new RegExp(`if\\s*\\(\\s*!${savedOffset}\\s*\\)\\s*\\{\\s*throw\\s+new\\s+Error`, "s"),
    );

    const updateFormat = expectSingleCall(
        sourceFile,
        call => isNamedCall(call, "buildMessageUpdateFormat"),
        "one shared Message update format",
    );

    const updateFormatName = declaredNameForExpression(updateFormat);

    const updateFormatInit = updateFormat.arguments[0];

    expect(isObjectLiteralExpression(updateFormatInit)).toBe(true);

    if (!isObjectLiteralExpression(updateFormatInit)) {
        return;
    }

    expect(
        isMemberOf(
            getObjectPropertyExpression(updateFormatInit, "party")!,
            actorName,
            "party",
        ),
    ).toBe(true);
    expect(
        isMemberOf(
            getObjectPropertyExpression(updateFormatInit, "templateId")!,
            fixtureName,
            "templateId",
        ),
    ).toBe(true);

    const stream = expectSingleCall(
        sourceFile,
        call => isNamedCall(call, "getUpdatesAsync"),
        "one update stream",
    );

    const streamRequest = stream.arguments[0];

    expect(
        streamRequest !== undefined
        && isCallExpression(streamRequest)
        && isLedgerApiV2RequestCreateCall(
            streamRequest,
            "GetUpdatesRequest",
            ledgerApiV2NamespaceName,
        ),
    ).toBe(true);
    expect(isDeadlineRequestOptions(stream.arguments[1], deadlineName)).toBe(true);

    if (streamRequest === undefined || !isCallExpression(streamRequest)) {
        return;
    }

    const streamRequestInit = streamRequest.arguments[0];

    expect(isObjectLiteralExpression(streamRequestInit)).toBe(true);

    if (!isObjectLiteralExpression(streamRequestInit)) {
        return;
    }

    expect(
        isIdentifierNamed(
            getObjectPropertyExpression(streamRequestInit, "beginExclusive")!,
            savedOffset,
        ),
    ).toBe(true);
    expect(
        isIdentifierNamed(
            getObjectPropertyExpression(streamRequestInit, "updateFormat")!,
            updateFormatName,
        ),
    ).toBe(true);

    const iterator = expectSingleCall(
        sourceFile,
        call => isNamedCall(call, "next")
            && isPropertyAccessExpression(call.expression)
            && isIdentifierNamed(call.expression.expression, "iterator")
            && isVariableDeclaration(call.parent),
        "the first update-stream read",
    );

    const submission = expectSingleCall(
        sourceFile,
        call => isNamedCall(call, "submitAndWaitForTransactionAsync"),
        "one Message submission",
    );

    expect(iterator.getStart(sourceFile)).toBeLessThan(submission.getStart(sourceFile));
    expect(isDeadlineRequestOptions(submission.arguments[1], deadlineName)).toBe(true);

    const lookupCalls = [
        ["getUpdateByIdAsync", "GetUpdateByIdRequest", "updateId"],
        ["getUpdateByOffsetAsync", "GetUpdateByOffsetRequest", "offset"],
    ] as const;

    for (const [method, requestName, key] of lookupCalls) {
        const lookup = expectSingleCall(
            sourceFile,
            call => isNamedCall(call, method),
            `one ${method} lookup`,
        );

        const request = lookup.arguments[0];

        expect(
            request !== undefined
            && isCallExpression(request)
            && isLedgerApiV2RequestCreateCall(
                request,
                requestName,
                ledgerApiV2NamespaceName,
            ),
        ).toBe(true);
        expect(isDeadlineRequestOptions(lookup.arguments[1], deadlineName)).toBe(true);

        if (request === undefined || !isCallExpression(request)) {
            return;
        }

        const requestInit = request.arguments[0];

        expect(isObjectLiteralExpression(requestInit)).toBe(true);

        if (!isObjectLiteralExpression(requestInit)) {
            return;
        }

        const identifier = getObjectPropertyExpression(requestInit, key);

        expect(
            identifier !== undefined
            && isMemberOf(identifier, "captured", key),
        ).toBe(true);
        expect(
            isIdentifierNamed(
                getObjectPropertyExpression(requestInit, "updateFormat")!,
                updateFormatName,
            ),
        ).toBe(true);
        expect(submission.getStart(sourceFile)).toBeLessThan(lookup.getStart(sourceFile));
    }

    expect(
        collectCalls(sourceFile, call => isNamedCall(call, "cleanupWithoutMaskingAsync")),
    ).toHaveLength(1);
    expect(init.workflowSource).toMatch(/iterator\.return\?\.\(\)/);
    expect(init.workflowSource).toContain("Run marker:");
    expect(init.workflowSource).toContain("Actor party:");
    expect(init.workflowSource).toContain("Contract ID:");
    expect(init.workflowSource).toContain("Update ID:");
    expect(init.workflowSource).toContain("Offset:");
    expect(init.workflowSource).toContain("Synchronizer ID:");
    expect(init.workflowSource).toContain("Update ID lookup reconciled: true");
    expect(init.workflowSource).toContain("Update offset lookup reconciled: true");
    expect(init.workflowSource).not.toMatch(/JSON\.stringify|console\.|headers|transactionHash/i);

    expect(init.requestSource).toContain("ledgerApiV2.TransactionShape.ACS_DELTA");
    expect(init.requestSource).toMatch(/verbose:\s*true/);
    expect(init.requestSource).toContain("packageId: `#${init.templateId.packageName}`");
    expect(init.requestSource).not.toContain("packageId: init.templateId.packageId");

    const sources = `${init.workflowSource}\n${init.requestSource}`;

    expect(sources).not.toMatch(
        /\b(?:getUpdateByHashAsync|hash|json|sleep|setTimeout|polling|retry)\b/i,
    );
    expect(hasParticipantVersionEquality(sourceFile)).toBe(false);
    expect(sources).not.toMatch(
        /(?:switch\s*\(\s*compatibility\.(?:participantVersion|releaseCore)|compatibility\.(?:participantVersion|releaseCore)\s*(?:===|!==))/,
    );
}

describe("application example source contracts", () => {
    it("uses the shared raw SDK ACS traversal in exactly the four ACS consumers", () => {
        const consumerPaths = exampleSourcePaths()
            .filter(importsActiveContractsTraversal)
            .map(path => relative(examplesDirectory, path))
            .sort();

        expect(consumerPaths).toEqual([
            "60-query-active-contracts.ts",
            "90-atomic-create-and-exercise.ts",
            "shared/archive-and-stale-contract-workflow.ts",
            "shared/idempotent-command-retry-workflow.ts",
        ]);

        for (const path of consumerPaths) {
            const sourcePath = join(examplesDirectory, path);

            expectSdkActiveContractsTraversal(
                sourcePath,
                readFileSync(sourcePath, "utf8"),
            );
        }
    });

    it("exposes the standalone application lifecycle scripts without publishing examples", () => {
        const packageJson = readRootPackageJson();

        expect({
            "example:dar:upload": packageJson.scripts["example:dar:upload"],
            "example:contract:create-exercise":
                packageJson.scripts["example:contract:create-exercise"],
            "example:contract:query":
                packageJson.scripts["example:contract:query"],
            "example:updates:stream":
                packageJson.scripts["example:updates:stream"],
            "example:user:rights": packageJson.scripts["example:user:rights"],
            "example:topology:party-hosting":
                packageJson.scripts["example:topology:party-hosting"],
        }).toEqual({
            "example:dar:upload":
                "npm run build && node --loader ts-node/esm examples/40-dar-upload.ts",
            "example:contract:create-exercise":
                "npm run build && node --loader ts-node/esm examples/50-create-and-exercise.ts",
            "example:contract:query":
                "npm run build && node --loader ts-node/esm examples/60-query-active-contracts.ts",
            "example:updates:stream":
                "npm run build && node --loader ts-node/esm examples/61-stream-updates.ts",
            "example:user:rights":
                "npm run build && node --loader ts-node/esm examples/70-user-rights.ts",
            "example:topology:party-hosting":
                "npm run build && node --loader ts-node/esm examples/80-topology-inspection.ts",
        });
        expect(packageJson.files).toEqual([
            "dist",
            "node",
            "README.md",
            "LICENSE",
        ]);
        expect(packageJson.files).not.toContain("examples");
        expect(packageJson.files).not.toContain("examples/assets");
    });

    it("documents the standalone workflow examples and their compatibility policy", () => {
        const packageJson = readRootPackageJson();

        const rawReadme = readReadme();

        const readme = rawReadme.replace(/\s+/g, " ");

        expect({
            "example:workflow:atomic": packageJson.scripts["example:workflow:atomic"],
            "example:workflow:retry": packageJson.scripts["example:workflow:retry"],
            "example:workflow:resume": packageJson.scripts["example:workflow:resume"],
            "example:workflow:stale-contract": packageJson.scripts["example:workflow:stale-contract"],
        }).toEqual({
            "example:workflow:atomic":
                "npm run build && node --loader ts-node/esm examples/90-atomic-create-and-exercise.ts",
            "example:workflow:retry":
                "npm run build && node --loader ts-node/esm examples/91-idempotent-command-retry.ts",
            "example:workflow:resume":
                "npm run build && node --loader ts-node/esm examples/92-resume-update-stream.ts",
            "example:workflow:stale-contract":
                "npm run build && node --loader ts-node/esm examples/93-archive-and-stale-contract.ts",
        });
        expect(packageJson.files).toEqual(["dist", "node", "README.md", "LICENSE"]);
        expect(readme).toContain("### Workflow examples");
        expect(readme).toContain("npm run example:workflow:atomic");
        expect(readme).toContain("npm run example:workflow:retry");
        expect(readme).toContain("npm run example:workflow:resume");
        expect(readme).toContain("npm run example:workflow:stale-contract");
        expect(readme).toContain("exact same request");
        expect(readme).toContain("saved offset");
        expect(readme).toContain("structured");
        expect(readme).toContain("full participant version");
        expect(readme).toContain("Participant version:");
        expect(readme).toContain("Release core:");
        expect(readme).toContain("Compatibility path:");
        expect(readme).toContain("protected documented credential refresh flow");
        expect(readme).toContain("local child shell");
        expect(readme).toContain("completed 3.5.7 and 3.5.8 workflow matrices");
        expect(readme).toContain("SDK_EXAMPLE_PARTY");
        expect(readme).toContain("3.5.7");
        expect(readme).toContain("3.5.8");
        expect(readme).toContain(
            "authenticated Participant 3.5.7 and the isolated Participant 3.5.8",
        );
        expect(readme).toContain(
            "same unchanged implementation and common compatibility path",
        );
        expect(readme).toContain("normalized outcome comparison");
        expect(readme).toContain("authenticated full version");
        expect(readme).toContain("data-only structured compatibility");
        expect(readme).toContain("only after live proof");
        expect(readme).not.toMatch(/\beval\s*\(/u);
        expect(readme).not.toContain("--refresh-token");
        expect(readme).not.toContain("make no live-proof claim");
        expect(rawReadme).not.toMatch(
            /^\s*(?:export\s+)?(?=[A-Z0-9_]*(?:BEARER|TOKEN))[A-Z][A-Z0-9_]*\s*=/mu,
        );
        expect(rawReadme).not.toMatch(/\$\([^)]*\)/u);
        expect(rawReadme).not.toMatch(
            /\b(?:cat|head|tail|sed|awk)\s+[^\n]*\.token\b/u,
        );
        expect(readme).not.toMatch(
            /copy(?:ing)?[^.]*SDK_EXAMPLE[^.]*current shell/iu,
        );
        expect(readme).toContain(
            "run the example inside that same short-lived credential-scoped child shell",
        );
    });

    it("documents the bounded gRPC active-contract page traversal", () => {
        expectActiveContractsTraversalDocumentation(readReadme());
    });

    it("keeps both DAR package listings and upload calls explicit", () => {
        const source = readExampleSource("40-dar-upload.ts");

        expect([...source.matchAll(listPackagesRequest)]).toHaveLength(2);
        expect(source).toMatch(uploadDarRequest);
        expect(source).toMatch(packageVisibilityProof);
        expect(source).not.toMatch(/\bensureExampleDarUploadedAsync\s*\(/);
        expect(source).toContain(
            "Warning: uploading a DAR creates durable localnet package state and is not cleaned up.",
        );
        expect(source).toContain("Main package ID: ${fixture.mainPackageId}");
        expect(source).toContain("already installed");
        expect(source).toContain("newly visible");
    });

    it("assigns a hosted party to the configured ledger user", () => {
        const source = readExampleSource("10-hosted-party.ts");

        expect(source).toMatch(
            /const\s+userId\s*=\s*\(process\.env\.SDK_EXAMPLE_USER_ID\s*\?\?\s*"ledger-api-user"\)\.trim\(\);/,
        );
        expect(source).toMatch(
            /if\s*\(\s*process\.env\.SDK_EXAMPLE_USER_ID\s*!==\s*undefined\s*&&\s*!userId\s*\)\s*\{/s,
        );
        expect(source).toMatch(
            /new\s+AllocatePartyRequest\(\s*\{\s*partyIdHint:\s*partyHint,\s*displayName:\s*partyHint,\s*userId,\s*\}\s*\)/s,
        );
    });

    it("passes the raw nonblank configured user to fallback allocation", () => {
        expectRawConfiguredUserAllocation(
            readSharedExampleSource("application-fixture.ts"),
        );
    });

    it("submits and proves the create and ReplaceText lifecycle directly", () => {
        const source = readExampleSource("50-create-and-exercise.ts");

        expect(source).toMatch(createMessageSubmission);
        expect(source).toMatch(replaceMessageSubmission);
        expect(source).toMatch(
            /const\s+original\s*=\s*extractCreatedContract\(createResponse\);/,
        );
        expect(source).toMatch(
            /extractReplacementContracts\(replaceResponse\)/,
        );
        expect(source).toMatch(archivedOriginalProof);
        expect(source).toMatch(replacementContractProof);
        expect(source).toContain(
            "Warning: fallback party allocation creates durable localnet topology state and is not cleaned up.",
        );
        expect(source).toContain(
            "Warning: created contracts and localnet ledger state are durable and are not cleaned up.",
        );
        expect(source).toContain("Actor party: ${actor.party}");
        expect(source).toContain("Original contract: ${original.contractId}");
        expect(source).toContain(
            "Replacement contract: ${replacementContractId}",
        );
        expect(source).not.toMatch(prohibitedCreateExerciseWorkarounds);
    });

    it("proves atomic create-and-exercise failure and active replacement under one workflow deadline", () => {
        const source = readExampleSource("90-atomic-create-and-exercise.ts");

        expect(source).toMatch(/runExampleAsync\(\s*"atomic-create-and-exercise"/);
        expect(source).toMatch(/const\s+client\s*=\s*createExampleClient\(\);/);
        expect(source).toMatch(
            /await\s+runClientWorkflowWithDisposalAsync\(\s*\{\s*disposeAsync:\s*\(\)\s*=>\s*client\.disposeAsync\(\),\s*runWorkflowAsync:\s*async\s*\(\)\s*=>\s*\{/s,
        );
        expect([
            ...source.matchAll(/runClientWorkflowWithDisposalAsync\(/g),
        ]).toHaveLength(1);
        expect([...source.matchAll(/client\.disposeAsync\(\)/g)]).toHaveLength(1);
        expect(source).not.toMatch(/finally\s*\{/);
        expect(source).toContain("loadExampleApplicationFixtureAsync()");
        expect(source).toMatch(
            /const\s+deadline\s*=\s*new\s+OperationDeadline\(\s*\{\s*timeoutMs:\s*exampleTimeoutMs\(\),\s*\}\s*\);/s,
        );
        expect(source).toMatch(
            /ensureExampleDarUploadedAsync\(\s*client,\s*fixture,\s*deadline\s*\)/s,
        );
        expect(source).toMatch(
            /resolveExamplePartyAsync\(\s*client,\s*process\.env,\s*deadline\s*\)/s,
        );
        expect(source).toMatch(
            /readWorkflowCompatibilityAsync\(\s*client,\s*deadline\s*\)/s,
        );

        const deadline = source.indexOf("const deadline = new OperationDeadline(");

        const ensureDar = source.indexOf("ensureExampleDarUploadedAsync(");

        const resolveParty = source.indexOf("resolveExamplePartyAsync(");

        const compatibility = source.indexOf("readWorkflowCompatibilityAsync(");

        const invalidSubmission = requireSourceMatch(
            source,
            /await\s+client\.commandService\.submitAndWaitForTransactionAsync\(\s*invalidRequest,\s*deadline\.createRequestOptions\(\),\s*\);/s,
            "the invalid command RPC submission with its own deadline budget",
        );

        const invalidClassification = requireSourceMatch(
            source,
            /invalidChoiceKind\s*=\s*classifyWorkflowFailure\(\s*\{\s*error,\s*kind:\s*"invalidChoice",\s*operation:\s*"commandSubmission",\s*compatibility,\s*\}\s*\);/s,
            "the structured invalid-choice classification",
        );

        const validSubmission = requireSourceMatch(
            source,
            /const\s+validResponse\s*=\s*await\s+client\.commandService\.submitAndWaitForTransactionAsync\(\s*buildCreateAndReplaceMessageTextRequest\([\s\S]*?\),\s*deadline\.createRequestOptions\(\),\s*\);/s,
            "the valid atomic command RPC submission with its own deadline budget",
        );

        expect(deadline).toBeLessThan(source.indexOf("loadExampleApplicationFixtureAsync()"));
        expect(ensureDar).toBeGreaterThan(deadline);
        expect(resolveParty).toBeGreaterThan(ensureDar);
        expect(compatibility).toBeGreaterThan(resolveParty);
        expect(invalidSubmission.index).toBeGreaterThan(compatibility);
        expect(invalidClassification.index).toBeGreaterThan(
            invalidSubmission.index,
        );
        expect(validSubmission.index).toBeGreaterThan(
            invalidClassification.index,
        );

        const commandRegion = source.slice(
            invalidSubmission.index,
            validSubmission.index + validSubmission[0].length,
        );

        expect(
            [
                ...commandRegion.matchAll(
                    /client\.commandService\.submitAndWaitForTransactionAsync\(/g,
                ),
            ],
        ).toHaveLength(2);
        expect(
            [
                ...commandRegion.matchAll(
                    /deadline\.createRequestOptions\(\)/g,
                ),
            ],
        ).toHaveLength(2);

        expect(source).toMatch(/randomBytes\(\d+\)\.toString\("hex"\)/);
        expect(source).toContain("atomic-invalid-${runId}");
        expect(source).toContain("atomic-valid-${runId}");
        expect(source).toMatch(
            /new\s+CreateAndExerciseCommand\(\s*\{[\s\S]*?choice:\s*"UnknownChoice",/s,
        );
        expect(source).toMatch(
            /buildCreateAndReplaceMessageTextRequest\(\s*\{[\s\S]*?text:\s*initialText,[\s\S]*?replacement:\s*replacementText,[\s\S]*?commandId:\s*validCommandId,/s,
        );
        expect(source).toMatch(
            /const\s+submittedReplacement\s*=\s*extractSoleCreatedContract\(validResponse\);/,
        );
        expect(source).not.toMatch(/extractReplacementContracts/);
        expect(source).not.toMatch(/archivedContractId|Archived transient contract/);
        expect(source).toContain("buildActiveContractsRequest({");
        expect(source).toContain("readCreatedMessageText(message)");
        expect(source).toContain("text === initialText || text === replacementText");
        expect(source).toMatch(
            /const\s+activeReplacement\s*=\s*assertAtomicMessageTerminalState\(\s*\{\s*messages:\s*runMessages,\s*initialText,\s*replacementText,\s*responseContractId:\s*submittedReplacement\.contractId,\s*party:\s*actor\.party,\s*\}\s*\);/s,
        );
        expect(source).toContain("Actor party: ${actor.party}");
        expect(source).toContain("Participant version: ${compatibility.participantVersion}");
        expect(source).toContain("Release core: ${compatibility.releaseCore}");
        expect(source).toContain("Compatibility path: ${compatibility.path}");
        expect(source).toContain("Invalid choice kind: ${invalidChoiceKind}");
        expect(source).toContain(
            "Replacement contract: ${activeReplacement.contractId}",
        );
        expect(source).toContain(
            "Atomic terminal proof: initial Message absent; exactly one replacement Message is active.",
        );
        expect(source).toContain("Replacement payload: ${replacementPayload}");
        expect(source).toContain("Replacement text: ${actualReplacementText}");
        expect(source).toContain(
            "Warning: fallback party allocation creates durable localnet topology state and is not cleaned up.",
        );
        expect(source).toContain(
            "Warning: created contracts and localnet ledger state are durable and are not cleaned up.",
        );
        expect(source).not.toMatch(/\b(?:sleep|setTimeout)\b/i);
        expect(source).not.toMatch(/error\.message|RegExp|match\s*\(/);
        expect(source).not.toMatch(/participantVersion\s*(?:===|!==)|switch\s*\(\s*compatibility\.participantVersion/);
    });

    it("runs the idempotent retry workflow as a standalone example with bounded cleanup", () => {
        const source = readExampleSource("91-idempotent-command-retry.ts");

        const workflowSource = readSharedExampleSource(
            "idempotent-command-retry-workflow.ts",
        );

        expect(source).toMatch(
            /await\s+runClientWorkflowWithDisposalAsync\(\s*\{\s*disposeAsync:\s*\(\)\s*=>\s*client\.disposeAsync\(\),\s*runWorkflowAsync:\s*\(\)\s*=>\s*runIdempotentCommandRetryWorkflowAsync\(\s*\{\s*client,\s*\.\.\.idempotentCommandRetryWorkflowDefaults,\s*createRunId:\s*\(\)\s*=>\s*randomBytes\(\d+\)\.toString\("hex"\),\s*logger:\s*console,\s*\}\s*\),\s*\}\s*\);/s,
        );
        expect(source).not.toMatch(
            /finally\s*\{\s*await\s+client\.disposeAsync\(\);\s*\}/s,
        );
        expect(workflowSource).toContain("readCreatedMessageText(message) === marker");
    });

    it("resumes an update stream from the saved post-pre-contract ledger end", () => {
        const runnerSource = readExampleSource("92-resume-update-stream.ts");

        const workflowSource = readSharedExampleSource(
            "resume-update-stream-workflow.ts",
        );

        expect(runnerSource).toMatch(
            /runResumeUpdateStreamStandaloneAsync\(\s*\{\s*disposeAsync:\s*\(\)\s*=>\s*client\.disposeAsync\(\),\s*runWorkflowAsync:\s*\(\)\s*=>\s*runResumeUpdateStreamWorkflowAsync\(/s,
        );
        expectResumeUpdateWorkflowSource(workflowSource);
    });

    it("teaches an exact archived-contract proof and structured stale rejection", () => {
        const runnerSource = readExampleSource("93-archive-and-stale-contract.ts");

        const workflowSource = readSharedExampleSource(
            "archive-and-stale-contract-workflow.ts",
        );

        const standaloneSource = readSharedExampleSource(
            "archive-and-stale-contract-standalone.ts",
        );

        expect(runnerSource).toMatch(/createExampleClient\(\)/);
        expect(runnerSource).toMatch(/runArchiveAndStaleContractStandaloneAsync/);
        expect(runnerSource).toMatch(/randomBytes\(\d+\)\.toString\("hex"\)/);
        expect(standaloneSource).toMatch(/createClientDisposalLifecycle/);
        expect(standaloneSource).toMatch(/disposeUnlessStartedAsync\(primaryFailed\)/);
        expectArchiveAndStaleContractWorkflowSource(workflowSource);

        expect(() => expectArchiveAndStaleContractWorkflowSource(
            workflowSource.replaceAll("originalContract", "priorContract"),
        )).not.toThrow();
        expect(() => expectArchiveAndStaleContractWorkflowSource(
            workflowSource.replace("classifyWorkflowFailure(", "classifyUnexpectedFailure("),
        )).toThrow();
        expect(() => expectArchiveAndStaleContractWorkflowSource(
            workflowSource.replace("extractReplacementContracts(", "extractCreatedContract("),
        )).toThrow();
    });

    it("keeps source checks resilient to renaming but rejects idle-budget and saved-offset mutations", () => {
        const workflowSource = readSharedExampleSource(
            "resume-update-stream-workflow.ts",
        );

        expect(() => expectResumeUpdateWorkflowSource(
            workflowSource.replaceAll("savedOffset", "checkpointOffset"),
        )).not.toThrow();
        expect(() => expectResumeUpdateWorkflowSource(
            workflowSource.replace(
                "const idleTimeoutMs = Math.max(1, Math.min(2_000, Math.floor(deadline.remainingTimeoutMs() / 4)))",
                "const idleTimeoutMs = deadline.remainingTimeoutMs()",
            ),
        )).toThrow();
        expect(() => expectResumeUpdateWorkflowSource(
            workflowSource.replaceAll(
                "beginExclusive: savedOffset",
                "beginExclusive: ledgerEnd.offset",
            ),
        )).toThrow();
    });

    it("queries the exact created Message with a generated active-contract request", () => {
        const source = readExampleSource("60-query-active-contracts.ts");

        expectStandaloneCleanup(source);
        expect(source).toMatch(deadlineBoundCreateMessageSubmission);
        expect(source).toMatch(
            /const\s+created\s*=\s*extractCreatedContract\(createResponse\);/,
        );
        expect(source).toContain("buildActiveContractsRequest({");
        expect(source).toContain("for await");
        expect(source).toContain("break;");
        expect(source).toContain("message.createArguments");
        expect(source).toContain(
            'const messageText = "Hello from the Canton TypeScript SDK";',
        );
        expect(source).toMatch(
            /message\.createArguments\.fields\.find\(\s*\(field\)\s*=>\s*field\.label\s*===\s*"text",?\s*\)/s,
        );
        expect(source).toMatch(/textValue\?\.sum\.oneofKind\s*!==\s*"text"/);
        expect(source).toMatch(/textValue\.sum\.text\s*!==\s*messageText/);
        expect(source).toMatch(/did not contain the expected text/);
        expect(source).toContain("Actor party: ${actor.party}");
        expect(source).toContain("Contract ID: ${created.contractId}");
        expect(source).toContain("Created payload:");
        expect(source).not.toMatch(
            /\b(?:GetActiveContractsPageRequest|mapGetActiveContractsPageRequest|mapper)\b/,
        );
    });

    it("opens a bounded update stream before submitting and matches the exact created Message", () => {
        const source = readExampleSource("61-stream-updates.ts");

        const nextBeforeSubmit = source.indexOf("const firstUpdatePromise = iterator.next();");

        const submit = source.indexOf("submitAndWaitForTransactionAsync");

        expect(source).toMatch(
            /const\s+client\s*=\s*createExampleClient\(\);/,
        );
        expect(source).toMatch(getLedgerEndRequest);
        expect(source).toMatch(updateStreamRequest);
        expect(source).toMatch(
            /const\s+iterator\s*=\s*stream\[Symbol\.asyncIterator\]\(\);/,
        );
        expect(nextBeforeSubmit).toBeGreaterThanOrEqual(0);
        expect(submit).toBeGreaterThan(nextBeforeSubmit);
        expect(source).toMatch(
            /return\s+extractCreatedContract\(createResponse\)\.contractId;/,
        );
        expect(source).toMatch(
            /match:\s*\(response,\s*contractId\)\s*=>\s*matchCreatedMessageUpdate\(\s*\{\s*response,\s*contractId\s*\}\s*\)/s,
        );
        expect(source).toContain("Update ID: ${matched.updateId}");
        expect(source).toContain("Offset: ${matched.offset}");
        expect(source).toContain("Created contract ID: ${matched.contractId}");
        expect(source).toMatch(
            /void\s+firstUpdatePromise\.catch\(\(\)\s*=>\s*undefined\);/,
        );
        expect(source).toMatch(
            /const\s+clientDisposal\s*=\s*createClientDisposalLifecycle\(\s*\(\)\s*=>\s*client\.disposeAsync\(\),\s*\);/s,
        );
        expect(source).toMatch(/let\s+outerPrimaryFailed\s*=\s*false;/);
        expect(source).toMatch(
            /catch\s*\(error\)\s*\{\s*outerPrimaryFailed\s*=\s*true;\s*throw\s+error;\s*\}/s,
        );
        expect(source).toMatch(
            /cancelAsync:\s*clientDisposal\.startDisposalAsync,/,
        );
        expect(source).toMatch(
            /finally\s*\{\s*await\s+clientDisposal\.disposeUnlessStartedAsync\(outerPrimaryFailed\);\s*\}/s,
        );
        expect(source).toContain("createClientDisposalLifecycle");
        expect(source).toContain("submitAndMatchUpdateAsync");
        expect(source).toContain(
            "Warning: fallback party allocation creates durable localnet topology state and is not cleaned up.",
        );
        expect(source).toContain(
            "Warning: created contracts and localnet ledger state are durable and are not cleaned up.",
        );
        expect(source).not.toMatch(/\b(?:AbortController|sleep|setTimeout|polling)\b/);
    });

    it("correlates a command completion from a saved ledger end with the raw configured user", () => {
        expectCommandCompletionCorrelationSource(
            readExampleSource("94-command-completion-correlation.ts"),
        );
    });

    it("documents the standalone command-completion correlation workflow and its supported surface", () => {
        const packageJson = readRootPackageJson();

        const readme = readReadme();

        const workflowDocumentation = readReadmeParagraph(
            readme,
            "The completion-correlation workflow",
        ).replace(/\s+/g, " ");

        expect(
            packageJson.scripts["example:workflow:command-completion"],
        ).toBe(
            "npm run build && node --loader ts-node/esm examples/94-command-completion-correlation.ts",
        );
        expect(
            packageJson.scripts["example:workflow:completion-correlation"],
        ).toBeUndefined();
        expect(workflowDocumentation).toContain(
            "npm run example:workflow:command-completion",
        );
        expect(workflowDocumentation).toContain("standalone");
        expect(workflowDocumentation).toContain("durable Message state");
        expect(workflowDocumentation).toContain("SDK_EXAMPLE_LEDGER_ENDPOINT");
        expect(workflowDocumentation).toContain("SDK_EXAMPLE_LEDGER_ADMIN_ENDPOINT");
        expect(workflowDocumentation).toContain(
            "SDK_EXAMPLE_PARTICIPANT_ADMIN_ENDPOINT",
        );
        expect(workflowDocumentation).toContain("SDK_EXAMPLE_BEARER_TOKEN");
        expect(workflowDocumentation).toContain(
            "SDK_EXAMPLE_LEDGER_BEARER_TOKEN",
        );
        expect(workflowDocumentation).toContain(
            "SDK_EXAMPLE_LEDGER_ADMIN_BEARER_TOKEN",
        );
        expect(workflowDocumentation).toContain(
            "SDK_EXAMPLE_PARTICIPANT_ADMIN_BEARER_TOKEN",
        );
        expect(workflowDocumentation).toContain(
            "SDK_EXAMPLE_TLS_ROOT_CERTIFICATE",
        );
        expect(workflowDocumentation).toContain("SDK_EXAMPLE_PARTY");
        expect(workflowDocumentation).toContain("SDK_EXAMPLE_PARTY_PREFIX");
        expect(workflowDocumentation).toContain("SDK_EXAMPLE_TIMEOUT_MS");
        expect(workflowDocumentation).toContain("SDK_EXAMPLE_USER_ID");
        expect(workflowDocumentation).toContain("absent");
        expect(workflowDocumentation).toContain("blank");
        expect(workflowDocumentation).toContain("untrimmed");
        expect(workflowDocumentation).toContain("exactly submitted");
        expect(workflowDocumentation).toContain("exactly matched");
        expect(workflowDocumentation).toContain("Ledger API user/subject");
        expect(workflowDocumentation).toContain("does not inspect the token");
        expect(workflowDocumentation).toContain("saved exclusive offset");
        expect(workflowDocumentation).toContain("first stream read");
        expect(workflowDocumentation).toContain("before submission");
        expect(workflowDocumentation).toContain("successful");
        expect(workflowDocumentation).not.toContain("rejected-command assertion");
        expect(workflowDocumentation).toContain("No public");
        expect(workflowDocumentation).toContain(
            "wait-for-command-completion helper",
        );
        expect(workflowDocumentation).toContain("API");
        expect(workflowDocumentation).toContain("example-only");

        const serviceMapEntry = readServiceMapEntry(
            readme,
            "commandCompletionService.getCompletionsAsync",
        );

        expect(serviceMapEntry).toContain("`grpc` only");
        expect(serviceMapEntry).toContain("existing");
        expect(serviceMapEntry).toContain("streaming");
        expect(serviceMapEntry).not.toContain("placeholder");

        const publicIndex = readPublicIndex();

        expect(publicIndex).not.toContain(
            "submitAndWaitForCommandCompletionAsync",
        );
        expect(publicIndex).not.toContain("command-completion-correlation");

        const gitignoreLines = readRootGitignore();

        expect(
            gitignoreLines.filter(line => line === ".superpowers/sdd/"),
        ).toHaveLength(1);
        expect(gitignoreLines).not.toContain(".superpowers/");
        expect(gitignoreLines).not.toContain("docs/superpowers/");
        expect(() => execFileSync(
            "git",
            [
                "check-ignore",
                "-q",
                "--",
                ".superpowers/sdd/2026-08-02-command-completion-correlation/success-357-default.md",
            ],
            { cwd: repositoryDirectory },
        )).not.toThrow();
    });

    it("documents the standalone gRPC contract-lifecycle audit workflow", () => {
        const packageJson = readRootPackageJson();

        const readme = readReadme();

        const workflowDocumentation = readReadmeParagraph(
            readme,
            "The contract-lifecycle audit workflow",
        ).replace(/\s+/g, " ");

        expect(
            packageJson.scripts["example:workflow:contract-lifecycle-audit"],
        ).toBe(
            "npm run build && node --loader ts-node/esm examples/95-contract-lifecycle-audit.ts",
        );
        expect(readme).toContain("The seven workflow examples are standalone proofs");
        expect(readme).toContain("npm run example:workflow:contract-lifecycle-audit");
        expect(workflowDocumentation).toContain("standalone");
        expect(workflowDocumentation).toContain("gRPC-only");
        expect(workflowDocumentation).toContain("SDK_EXAMPLE_LEDGER_ENDPOINT");
        expect(workflowDocumentation).toContain("SDK_EXAMPLE_LEDGER_ADMIN_ENDPOINT");
        expect(workflowDocumentation).toContain(
            "SDK_EXAMPLE_PARTICIPANT_ADMIN_ENDPOINT",
        );
        expect(workflowDocumentation).toContain("SDK_EXAMPLE_BEARER_TOKEN");
        expect(workflowDocumentation).toContain("SDK_EXAMPLE_PARTY");
        expect(workflowDocumentation).toContain("SDK_EXAMPLE_PARTY_PREFIX");
        expect(workflowDocumentation).toContain("SDK_EXAMPLE_TIMEOUT_MS");
        expect(workflowDocumentation).not.toContain("TLS");
        expect(workflowDocumentation).not.toContain("SDK_EXAMPLE_TLS_ROOT_CERTIFICATE");
        expect(workflowDocumentation).toContain("explicit");
        expect(workflowDocumentation).toContain("fallback");
        expect(workflowDocumentation).toContain("durable DAR");
        expect(workflowDocumentation).toContain("durable topology");
        expect(workflowDocumentation).toContain("durable contracts");
        expect(workflowDocumentation).toContain("alpha");
        expect(workflowDocumentation).toContain("ContractService");
        expect(workflowDocumentation).toContain("original");
        expect(workflowDocumentation).toContain("replacement");
        expect(workflowDocumentation).toContain("EventQuery");
        expect(workflowDocumentation).toContain("create/archive");
        expect(workflowDocumentation).toContain("no post-archive ContractService");

        const contractServiceEntry = readServiceMapEntry(
            readme,
            "contractService.getContractAsync",
        );

        const eventQueryEntry = readServiceMapEntry(
            readme,
            "eventQueryService.getEventsByContractIdAsync",
        );

        for (const entry of [contractServiceEntry, eventQueryEntry]) {
            expect(entry).toContain("`grpc` only");
            expect(entry).toContain("JSON rejects");
        }
    });

    it("uses only direct active-contract and original-history evidence in the lifecycle audit", () => {
        const runnerSource = readExampleSource("95-contract-lifecycle-audit.ts");

        const workflowSource = readSharedExampleSource(
            "contract-lifecycle-audit-workflow.ts",
        );

        const helperSource = readSharedExampleSource("contract-lifecycle-audit.ts");

        const runnerFile = createSourceFile(
            "95-contract-lifecycle-audit.ts",
            runnerSource,
            ScriptTarget.Latest,
            true,
            ScriptKind.TS,
        );

        expect(collectCalls(runnerFile, call => isNamedCall(call, "runExampleAsync")))
            .toHaveLength(1);
        expect(collectCalls(runnerFile, call => isNamedCall(call, "createExampleClient")))
            .toHaveLength(1);
        expect(
            collectCalls(
                runnerFile,
                call => isNamedCall(call, "runClientWorkflowWithDisposalAsync"),
            ),
        ).toHaveLength(1);
        expect(collectCalls(runnerFile, call => isNamedCall(call, "disposeAsync")))
            .toHaveLength(1);
        expectContractLifecycleAuditWorkflowSource(workflowSource);
        expect(() => expectContractLifecycleAuditWorkflowSource(
            workflowSource.replaceAll("ledgerApiV2.", "unrelatedApi."),
        )).toThrow();
        expect(() => expectContractLifecycleAuditWorkflowSource(
            workflowSource.replace(
                "dependencies.client.eventQueryService",
                "dependencies.client.unrelatedService",
            ),
        )).toThrow();
        expect(helperSource).toContain("ledgerApiV2.EventFormat.create");
        expect(helperSource).toContain("ledgerApiV2.Filters.create");
        expect(helperSource).toContain("ledgerApiV2.CumulativeFilter.create");
        expect(helperSource).toContain("ledgerApiV2.TemplateFilter.create");
        expect(helperSource).toContain("ledgerApiV2.Identifier.create");
        expect(helperSource).toContain("filtersByParty");
        expect(helperSource).toContain("remainingTimeoutMs");
        expect(helperSource).toContain("EVENT_QUERY_PROJECTION_POLL_INTERVAL_MS");

        const lifecycleSources = [runnerSource, workflowSource, helperSource].join("\n");

        expect(lifecycleSources).not.toMatch(/\b(?:updateService|hash|filtersForAnyParty|TransactionShape|getActiveContracts)\b/);
        expect(lifecycleSources).not.toMatch(/error\.message|RegExp/);
    });

    it("reconciles one streamed Message transaction by update ID and offset", () => {
        const runnerSource = readExampleSource("96-update-lookup-reconciliation.ts");

        const workflowSource = readSharedExampleSource(
            "update-lookup-reconciliation-workflow.ts",
        );

        const requestSource = readSharedExampleSource("ledger-requests.ts");

        const runnerFile = createSourceFile(
            "96-update-lookup-reconciliation.ts",
            runnerSource,
            ScriptTarget.Latest,
            true,
            ScriptKind.TS,
        );

        expect(collectCalls(runnerFile, call => isNamedCall(call, "runExampleAsync")))
            .toHaveLength(1);
        expect(collectCalls(runnerFile, call => isNamedCall(call, "createExampleClient")))
            .toHaveLength(1);
        expect(
            collectCalls(
                runnerFile,
                call => isNamedCall(call, "runClientWorkflowWithDisposalAsync"),
            ),
        ).toHaveLength(1);
        expect(collectCalls(runnerFile, call => isNamedCall(call, "disposeAsync")))
            .toHaveLength(1);
        expectUpdateLookupReconciliationWorkflowSource({
            workflowSource,
            requestSource,
        });
        expect(() => expectUpdateLookupReconciliationWorkflowSource({
            workflowSource: workflowSource.replace(
                "getUpdateByOffsetAsync",
                "getUnrelatedUpdateAsync",
            ),
            requestSource,
        })).toThrow();
        expect(() => expectUpdateLookupReconciliationWorkflowSource({
            workflowSource: workflowSource.replace(
                "beginExclusive: savedOffset",
                "beginExclusive: undefined",
            ),
            requestSource,
        })).toThrow();
        expect(() => expectUpdateLookupReconciliationWorkflowSource({
            workflowSource,
            requestSource: requestSource.replace(
                "packageId: `#${init.templateId.packageName}`",
                "packageId: init.templateId.packageId",
            ),
        })).toThrow();
    });

    it("documents the standalone update lookup reconciliation workflow", () => {
        const packageJson = readRootPackageJson();

        const readme = readReadme();

        const workflowDocumentation = readReadmeParagraph(
            readme,
            "The update-lookup reconciliation workflow",
        ).replace(/\s+/g, " ");

        expect(
            packageJson.scripts["example:workflow:update-lookup-reconciliation"],
        ).toBe(
            "npm run build && node --loader ts-node/esm examples/96-update-lookup-reconciliation.ts",
        );
        expect(readme).toContain("The seven workflow examples are standalone proofs");
        expect(readme).toContain("npm run example:workflow:update-lookup-reconciliation");
        expect(workflowDocumentation).toContain("standalone");
        expect(workflowDocumentation).toContain("gRPC-only");
        expect(workflowDocumentation).toContain("UpdateService.GetUpdates");
        expect(workflowDocumentation).toContain("getUpdateById");
        expect(workflowDocumentation).toContain("getUpdateByOffset");
        expect(workflowDocumentation).toContain("exact");
        expect(workflowDocumentation).toContain("durable DAR");
        expect(workflowDocumentation).toContain("durable topology");
        expect(workflowDocumentation).toContain("durable contracts");
        expect(workflowDocumentation).toContain("3.5.7");
        expect(workflowDocumentation).toContain("3.5.8");
        expect(workflowDocumentation).toContain("SDK_EXAMPLE_PARTY");
        expect(workflowDocumentation).toContain("SDK_EXAMPLE_TIMEOUT_MS");
    });

    it("implements the read-only pruning preflight through ordered generated gRPC reads", () => {
        const runnerSource = readExampleSource("97-pruning-preflight.ts");

        const workflowSource = readSharedExampleSource(
            "pruning-preflight-workflow.ts",
        );

        const assertionsSource = readSharedExampleSource("pruning-preflight.ts");

        const runnerFile = createSourceFile(
            "97-pruning-preflight.ts",
            runnerSource,
            ScriptTarget.Latest,
            true,
            ScriptKind.TS,
        );

        expect(collectCalls(runnerFile, call => isNamedCall(call, "runExampleAsync")))
            .toHaveLength(1);
        expect(collectCalls(runnerFile, call => isNamedCall(call, "createExampleClient")))
            .toHaveLength(1);
        expect(
            collectCalls(
                runnerFile,
                call => isNamedCall(call, "runClientWorkflowWithDisposalAsync"),
            ),
        ).toHaveLength(1);
        expect(collectCalls(runnerFile, call => isNamedCall(call, "disposeAsync")))
            .toHaveLength(1);

        expect(workflowSource).toContain("OperationDeadline");
        expect(assertionsSource).toContain("SDK_EXAMPLE_OFFSET");
        expect(assertionsSource).toContain("BigInt(");
        expect(assertionsSource).toContain(
            "notObservedPruned is not proven queryable.",
        );
        expect(assertionsSource).toContain("oneofKind");

        const beforeWatermark = workflowSource.indexOf(
            "getLatestPrunedOffsetsAsync",
        );

        const ledgerEnd = workflowSource.indexOf("getLedgerEndAsync");

        const afterWatermark = workflowSource.lastIndexOf(
            "getLatestPrunedOffsetsAsync",
        );

        expect(beforeWatermark).toBeGreaterThanOrEqual(0);
        expect(ledgerEnd).toBeGreaterThan(beforeWatermark);
        expect(afterWatermark).toBeGreaterThan(ledgerEnd);
        expect([
            ...workflowSource.matchAll(/getLatestPrunedOffsetsAsync/g),
        ]).toHaveLength(2);
        expect(workflowSource).toContain(
            "ledgerApiV2.GetLatestPrunedOffsetsRequest.create()",
        );
        expect(workflowSource).toContain(
            "ledgerApiV2.GetLedgerEndRequest.create()",
        );
        expect(workflowSource).toContain("getScheduleAsync");
        expect(workflowSource).toContain("getParticipantScheduleAsync");
        expect(workflowSource).toContain("getSafePruningOffsetAsync");
        expect(workflowSource).toContain(
            "comDigitalasset.canton.admin.pruning.v30.GetScheduleRequest.create()",
        );
        expect(workflowSource).toContain(
            "comDigitalasset.canton.admin.pruning.v30.GetParticipantScheduleRequest.create()",
        );
        expect(workflowSource).toMatch(
            /comDigitalasset\.canton\.admin\.participant\.v30\.GetSafePruningOffsetRequest\.create\(\s*\{\s*beforeOrAt:\s*createCurrentPruningTimestamp\(dependencies\.now\),\s*ledgerEnd:\s*\w+\.text,?\s*\}\s*\)/s,
        );
        expect(workflowSource).toContain("readonly now: () => Date;");
        expect(workflowSource).not.toContain(
            "counterParticipantsCommitmentsState:",
        );
        expect([
            ...workflowSource.matchAll(/createRequestOptions\(\)/g),
        ]).toHaveLength(6);

        const sources = [runnerSource, workflowSource, assertionsSource].join("\n");

        expect(sources).not.toMatch(
            /\b(?:participantVersion|releaseCore|compatibility|JsonTransport|jsonTransport|Number\s*\(|PruneRequest|set(?:Participant)?ScheduleAsync|clear(?:Participant)?ScheduleAsync|updateService|commandService|contractService|partyManagementService|resolvePartyAsync|loadFixtureAsync|ensureDarUploadedAsync|sleep|setTimeout|poll(?:ing)?|retry)\b/,
        );
        expect(sources).not.toMatch(
            /logger\.log\(\s*(?:before|after|ledgerEnd|schedule|participantSchedule|safePruning)(?:Response)?\s*\)/,
        );
        expect(sources).not.toMatch(/logger\.log\(\s*JSON\.stringify\(/);
    });

    it("documents pruning preflight as an explicit, non-mutating operator read", () => {
        const packageJson = readRootPackageJson();

        const readme = readReadme();

        const workflowDocumentation = readReadmeParagraph(
            readme,
            "The pruning-preflight workflow",
        ).replace(/\s+/g, " ");

        expect(packageJson.scripts["example:workflow:pruning-preflight"]).toBe(
            "npm run build && node --loader ts-node/esm examples/97-pruning-preflight.ts",
        );
        expect(readme).toContain("npm run example:workflow:pruning-preflight");
        expect(workflowDocumentation).toContain("standalone");
        expect(workflowDocumentation).toContain("gRPC-only");
        expect(workflowDocumentation).toContain("SDK_EXAMPLE_OFFSET");
        expect(workflowDocumentation).toContain("positive decimal");
        expect(workflowDocumentation).toContain("SDK_EXAMPLE_LEDGER_ENDPOINT");
        expect(workflowDocumentation).toContain(
            "SDK_EXAMPLE_PARTICIPANT_ADMIN_BEARER_TOKEN",
        );
        expect(workflowDocumentation).toContain("does not mutate");
        expect(workflowDocumentation).toContain("durable state");
        expect(workflowDocumentation).toContain("alreadyPruned");
        expect(workflowDocumentation).toContain("beyondLedgerEnd");
        expect(workflowDocumentation).toContain("notObservedPruned");
        expect(workflowDocumentation).toContain("not proven queryable");
        expect(workflowDocumentation).toContain("all-divulged");
        expect(workflowDocumentation).toContain("schedule");
        expect(workflowDocumentation).toContain("safe-pruning");
        expect(workflowDocumentation).toContain("beforeOrAt");
        expect(workflowDocumentation).toContain("current timestamp");
        expect(workflowDocumentation).toContain("commitment-state");
        expect(workflowDocumentation).toContain("3.5.7");
        expect(workflowDocumentation).toContain("3.5.8");
    });

    it("reads a configured user and its rights without mutating user state", () => {
        const source = readExampleSource("70-user-rights.ts");

        expectStandaloneCleanup(source);
        expect(source).toMatch(
            /const\s+userId\s*=\s*\(process\.env\.SDK_EXAMPLE_USER_ID\s*\?\?\s*"ledger-api-user"\)\.trim\(\);/,
        );
        expect(source).toMatch(
            /if\s*\(\s*process\.env\.SDK_EXAMPLE_USER_ID\s*!==\s*undefined\s*&&\s*!userId\s*\)\s*\{/s,
        );
        expect(source).toMatch(
            /new\s+GetUserRequest\(\s*\{\s*userId\s*\}\s*\)/,
        );
        expect(source).toMatch(
            /new\s+ListUserRightsRequest\(\s*\{\s*userId\s*\}\s*\)/,
        );
        expect(source).toMatch(
            /new\s+ListUsersRequest\(\s*\{\s*pageToken,\s*pageSize:\s*100\s*\}\s*\)/,
        );
        expect(source).toMatch(/\.getUserAsync\(/);
        expect(source).toMatch(/\.listUserRightsAsync\(/);
        expect(source).toMatch(/\.listUsersAsync\(/);
        expect([...source.matchAll(userReadRequest)]).toHaveLength(3);
        expect(source).toMatch(/const\s+seenPageTokens\s*=\s*new\s+Set<string>\(\);/);
        expect(source).toMatch(/if\s*\(\s*seenPageTokens\.has\(nextPageToken\)\s*\)\s*\{/s);
        expect(source).toMatch(/user\?\.id\s*!==\s*userId/);
        expect(source).toMatch(/users\.find\(\(user\)\s*=>\s*user\.id\s*===\s*userId\)/);
        expect(source).toContain("User ID: ${user.id}");
        expect(source).toContain("Deactivated: ${user.isDeactivated}");
        expect(source).toContain("Primary party: ${user.primaryParty ?? \"<none>\"}");
        expect(source).toContain("Listed confirmation: ${listedUser.id}");
        expect(source).toMatch(
            /rightsResponse\.rights\.some\(\s*\(right\)\s*=>\s*right\.type\s*===\s*"canReadAsAnyParty",?\s*\)/s,
        );
        expect(source).toMatch(/Expected user '\$\{userId\}' to have canReadAsAnyParty\./);
        expect(source).toMatch(/right\.type/);
        expect(source).toMatch(/right\.party/);
        expect(source).not.toContain("Rights: <none>");
        expect(source).not.toMatch(
            /\b(?:grantUserRightsAsync|createUserAsync|revokeUserRightsAsync|deleteUserAsync)\b/,
        );
    });

    it("inspects the actor party topology at the synchronizer head through public SDK DTOs", () => {
        const source = readExampleSource("80-topology-inspection.ts");

        expectStandaloneCleanup(source);
        expect(source).toMatch(/resolveExamplePartyAsync\(client\)/);
        expect(source).toContain(
            "Warning: fallback party allocation creates durable localnet topology state and is not cleaned up.",
        );
        expect(source).toMatch(
            /discoverSynchronizerIdAsync\(\s*client,\s*process\.env\.SDK_EXAMPLE_SYNCHRONIZER,\s*\)/s,
        );
        expect(source).toMatch(exactSynchronizerHeadStore);
        expect(source).toMatch(
            /const\s+request\s*=\s*new\s+ListPartyToParticipantRequest\(\s*\{\s*baseQuery,\s*filterParty:\s*actor\.party,\s*\}\s*\);/s,
        );
        expect(source).toMatch(
            /client\.topologyManagerReadService\.listPartyToParticipantAsync\(\s*request,\s*new\s+RequestOptions\(\s*\{\s*timeoutMs\s*\}\s*\),\s*\)/s,
        );
        expect(source).toMatch(
            /response\.results\.find\(\s*\(result\)\s*=>\s*result\.item\.party\s*===\s*actor\.party,?\s*\)/s,
        );
        expect(source).toContain("ParticipantPermission");
        expect(source).toMatch(/!mapping\s*\|\|\s*mapping\.item\.threshold\s*<=\s*0\s*\|\|\s*mapping\.item\.participants\.length\s*===\s*0/);
        expect(source).toMatch(
            /const\s+submissionParticipant\s*=\s*mapping\.item\.participants\.find\(\s*\(participant\)\s*=>\s*participant\.participantUid\.trim\(\)\s*&&\s*participant\.permission\s*===\s*ParticipantPermission\.submission,?\s*\)/s,
        );
        expect(source).toMatch(/if\s*\(!submissionParticipant\)/);
        expect(source).toMatch(/context\.serial\s*<=\s*0/);
        expect(source).toMatch(/!isValidDate\(context\.validFrom\)/);
        expect(source).toMatch(/context\.validUntil\s*!==\s*undefined/);
        expect(source).toMatch(/function\s+isValidDate\(value:\s*Date\s*\|\s*undefined\):\s*value\s+is\s+Date/);
        expect(source).toContain("Synchronizer: ${synchronizer}");
        expect(source).toContain("Party: ${mapping.item.party}");
        expect(source).toContain("Threshold: ${mapping.item.threshold}");
        expect(source).toMatch(/participant\.participantUid/);
        expect(source).toMatch(/participant\.permission/);
        expect(source).toContain("Context serial: ${context.serial}");
        expect(source).toContain("Context valid from: ${formatDate(context.validFrom)}");
        expect(source).toContain("Context valid until: ${formatDate(context.validUntil)}");
        expect(source).toMatch(/function\s+formatDate\(value:\s*Date\s*\|\s*undefined\):\s*string/);
        expect(source).not.toMatch(
            /(?:topology_manager_read_service|mapListPartyToParticipantRequest|protobuf)/i,
        );
    });

    it.each(["40-dar-upload.ts", "50-create-and-exercise.ts"])(
        "%s remains safe to run as a standalone example",
        name => {
            expectStandaloneCleanup(readExampleSource(name));
        },
    );
});
