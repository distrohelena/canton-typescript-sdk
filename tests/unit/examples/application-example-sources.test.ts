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

function expectStandaloneCleanup(source: string): void {
    const runExampleWithCleanup =
        /runExampleAsync\(\s*"[^"]+",\s*async\s*\(\)\s*=>\s*\{[\s\S]*?const\s+client\s*=\s*createExampleClient\(\);[\s\S]*?try\s*\{[\s\S]*?\}\s*finally\s*\{\s*await\s+client\.disposeAsync\(\);\s*\}[\s\S]*?\}\s*\);/;

    expect(source).toMatch(runExampleWithCleanup);
}

describe("application example source contracts", () => {
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
        expect(source).toMatch(/right\.type/);
        expect(source).toMatch(/right\.party/);
        expect(source).toContain("Rights: <none>");
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
        expect(source).toMatch(/!mapping\s*\|\|\s*mapping\.item\.participants\.length\s*===\s*0/);
        expect(source).toContain("Synchronizer: ${synchronizer}");
        expect(source).toContain("Party: ${mapping.item.party}");
        expect(source).toContain("Threshold: ${mapping.item.threshold}");
        expect(source).toMatch(/participant\.participantUid/);
        expect(source).toMatch(/participant\.permission/);
        expect(source).toContain("Context serial: ${context?.serial ?? \"<none>\"}");
        expect(source).toContain("Context valid from: ${formatDate(context?.validFrom)}");
        expect(source).toContain("Context valid until: ${formatDate(context?.validUntil)}");
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
