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

    it.each(["40-dar-upload.ts", "50-create-and-exercise.ts"])(
        "%s remains safe to run as a standalone example",
        name => {
            expectStandaloneCleanup(readExampleSource(name));
        },
    );
});
