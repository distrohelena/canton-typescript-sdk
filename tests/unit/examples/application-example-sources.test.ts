import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const listPackagesRequest =
    /client\.packageService\.listPackagesAsync\(\s*ledgerApiV2\.ListPackagesRequest\.create\(\),\s*\)/g;

const uploadDarRequest =
    /client\.packageManagementService\.uploadDarFileAsync\(\s*ledgerApiV2\.admin\.UploadDarFileRequest\.create\(\s*\{\s*darFile:\s*fixture\.darBytes,\s*\}\s*\),\s*\)/s;

const packageVisibilityProof =
    /provePackageVisibility\(\s*\{\s*mainPackageId:\s*fixture\.mainPackageId,\s*before:\s*before\.packageIds,\s*after:\s*after\.packageIds,\s*\}\s*\)/s;

const createMessageSubmission =
    /client\.commandService\.submitAndWaitForTransactionAsync\(\s*buildCreateMessageRequest\(\s*\{\s*party:\s*actor\.party,\s*templateId:\s*fixture\.templateId,\s*text:\s*"Hello from the Canton TypeScript SDK",\s*\}\s*\),\s*\)/s;

const replaceMessageSubmission =
    /client\.commandService\.submitAndWaitForTransactionAsync\(\s*buildReplaceMessageTextRequest\(\s*\{\s*party:\s*actor\.party,\s*templateId:\s*fixture\.templateId,\s*contractId:\s*original\.contractId,\s*replacement:\s*"Updated by ReplaceText",\s*\}\s*\),\s*\)/s;

const archivedOriginalProof =
    /if\s*\(\s*archivedContractId\s*!==\s*original\.contractId\s*\)\s*\{/s;

const replacementContractProof =
    /else\s+if\s*\(\s*!replacementContractId\.trim\(\)\s*\|\|\s*replacementContractId\s*===\s*original\.contractId\s*\)\s*\{/s;

const activeContractPageRead =
    /client\.stateService\.getActiveContractsPageAsync\(\s*pageRequest,\s*new\s+RequestOptions\(\s*\{\s*timeoutMs:\s*remainingTimeoutMs\s*\}\s*\),\s*\)/s;

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

function readRootPackageJson(): {
    scripts: Record<string, string>;
    files: string[];
} {
    return JSON.parse(
        readFileSync(new URL("../../../package.json", import.meta.url), "utf8"),
    ) as { scripts: Record<string, string>; files: string[] };
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

    expect(source).toMatch(/createWorkflowDeadline/);
    expect(source).toMatch(/remainingTimeoutMs\s*:\s*\w+\.remainingMs/);
    expect(source).toMatch(/timeoutMs\s*:\s*\w+\.idleProbeMs\(\)/);
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
    expect(source).toMatch(/createWorkflowDeadline/);
    expect(source).toMatch(/remainingTimeoutMs\s*:\s*\w+\.remainingMs/);
    expect(source).toMatch(/extractCreatedContract\(/);
    expect(source).toMatch(/extractReplacementContracts\(/);
    expect(source).toMatch(/assertMessageContractAbsent\(/);
    expect(source).toMatch(/assertExactlyOneActiveMessage\(/);
    expect(source).toMatch(/collectActiveMessagesAcrossPagesAsync\(/);
    expect(source).toMatch(/classifyWorkflowFailure\(/);
    expect(source).toMatch(/kind:\s*"staleContract"/);
    expect(source).toMatch(/archive-create-\$\{\w+\}/);
    expect(source).toMatch(/archive-replace-\$\{\w+\}/);
    expect(source).toMatch(/archive-stale-\$\{\w+\}/);
    expect(source).toMatch(/archivedContractId\s*!==\s*\w+\.contractId/);
    expect(source).toMatch(/replacementContractId\s*===\s*\w+\.contractId/);
    expect(source).toContain("archived original unexpectedly succeeded");
    expect(source).toMatch(/new\s+RequestOptions\(\s*\{\s*timeoutMs:\s*\w+\.remainingMs\(\)\s*\}\s*\)/);
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

describe("application example source contracts", () => {
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

        expectStandaloneCleanup(source);
        expect(source).toContain("loadExampleApplicationFixtureAsync()");
        expect(source).toMatch(
            /const\s+deadline\s*=\s*createWorkflowDeadline\(\s*\{\s*timeoutMs:\s*exampleTimeoutMs\(\),\s*\}\s*\);/s,
        );
        expect(source).toMatch(
            /ensureExampleDarUploadedAsync\(\s*client,\s*fixture,\s*\{\s*remainingTimeoutMs:\s*deadline\.remainingMs,\s*\}\s*\)/s,
        );
        expect(source).toMatch(
            /resolveExamplePartyAsync\(\s*client,\s*process\.env,\s*\{\s*remainingTimeoutMs:\s*deadline\.remainingMs,\s*\}\s*\)/s,
        );
        expect(source).toMatch(
            /readWorkflowCompatibilityAsync\(\s*client,\s*\{\s*remainingTimeoutMs:\s*deadline\.remainingMs,\s*\}\s*\)/s,
        );

        const deadline = source.indexOf("const deadline = createWorkflowDeadline(");

        const ensureDar = source.indexOf("ensureExampleDarUploadedAsync(");

        const resolveParty = source.indexOf("resolveExamplePartyAsync(");

        const compatibility = source.indexOf("readWorkflowCompatibilityAsync(");

        const invalidSubmission = requireSourceMatch(
            source,
            /await\s+client\.commandService\.submitAndWaitForTransactionAsync\(\s*invalidRequest,\s*new\s+RequestOptions\(\s*\{\s*timeoutMs:\s*deadline\.remainingMs\(\)\s*\}\s*\),\s*\);/s,
            "the invalid command RPC submission with its own deadline budget",
        );

        const invalidClassification = requireSourceMatch(
            source,
            /invalidChoiceKind\s*=\s*classifyWorkflowFailure\(\s*\{\s*error,\s*kind:\s*"invalidChoice",\s*operation:\s*"commandSubmission",\s*compatibility,\s*\}\s*\);/s,
            "the structured invalid-choice classification",
        );

        const validSubmission = requireSourceMatch(
            source,
            /const\s+validResponse\s*=\s*await\s+client\.commandService\.submitAndWaitForTransactionAsync\(\s*buildCreateAndReplaceMessageTextRequest\([\s\S]*?\),\s*new\s+RequestOptions\(\s*\{\s*timeoutMs:\s*deadline\.remainingMs\(\)\s*\}\s*\),\s*\);/s,
            "the valid atomic command RPC submission with its own deadline budget",
        );

        expect(deadline).toBeGreaterThan(source.indexOf("loadExampleApplicationFixtureAsync()"));
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
                    /new\s+RequestOptions\(\s*\{\s*timeoutMs:\s*deadline\.remainingMs\(\)\s*\}\s*\)/g,
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
            /const\s+submittedReplacement\s*=\s*extractCreatedContract\(validResponse\);/,
        );
        expect(source).not.toMatch(/extractReplacementContracts/);
        expect(source).not.toMatch(/archivedContractId|Archived transient contract/);
        expect(source).toContain("buildActiveContractsRequest({");
        expect(source).toMatch(
            /findActiveMessageAcrossPagesAsync\(\s*\{[\s\S]*?contractId:\s*submittedReplacement\.contractId,[\s\S]*?timeoutMs:\s*deadline\.remainingMs\(\),[\s\S]*?getActiveContractsPageAsync\([\s\S]*?new\s+RequestOptions\(\s*\{\s*timeoutMs:\s*deadline\.remainingMs\(\)\s*\}\s*\),/s,
        );
        expect(source).toMatch(/readCreatedMessageText\(replacement\)/);
        expect(source).toMatch(/replacementText\s*!==\s*actualReplacementText/);
        expect(source).toContain("Actor party: ${actor.party}");
        expect(source).toContain("Participant version: ${compatibility.participantVersion}");
        expect(source).toContain("Release core: ${compatibility.releaseCore}");
        expect(source).toContain("Compatibility path: ${compatibility.path}");
        expect(source).toContain("Invalid choice kind: ${invalidChoiceKind}");
        expect(source).toContain(
            "Replacement contract: ${submittedReplacement.contractId}",
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

        expectStandaloneCleanup(source);
        expect(source).toMatch(
            /runIdempotentCommandRetryWorkflowAsync\(\s*\{\s*client,\s*\.\.\.idempotentCommandRetryWorkflowDefaults,\s*createRunId:\s*\(\)\s*=>\s*randomBytes\(\d+\)\.toString\("hex"\),\s*logger:\s*console,\s*\}\s*\);/s,
        );
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
                "new RequestOptions({ timeoutMs: deadline.idleProbeMs() })",
                "new RequestOptions({ timeoutMs: deadline.remainingMs() })",
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
        expect(source).toMatch(createMessageSubmission);
        expect(source).toMatch(
            /const\s+created\s*=\s*extractCreatedContract\(createResponse\);/,
        );
        expect(source).toContain("buildActiveContractsRequest({");
        expect(source).toContain("findActiveMessageAcrossPagesAsync({");
        expect(source).toContain("timeoutMs: exampleTimeoutMs(),");
        expect(source).toMatch(activeContractPageRead);
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
