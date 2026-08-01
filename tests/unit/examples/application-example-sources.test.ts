import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function readExampleSource(name: string): string {
    return readFileSync(new URL(`../../../examples/${name}`, import.meta.url), "utf8");
}

describe("application example source contracts", () => {
    it("keeps DAR upload calls explicit", () => {
        const source = readExampleSource("40-dar-upload.ts");

        expect(source).toContain("listPackagesAsync(");
        expect(source).toContain("UploadDarFileRequest.create(");
        expect(source).toContain("uploadDarFileAsync(");
        expect(source).toContain("provePackageVisibility(");
    });

    it("keeps create and exercise calls explicit without Echo", () => {
        const source = readExampleSource("50-create-and-exercise.ts");

        expect(source).toContain(
            "commandService.submitAndWaitForTransactionAsync(",
        );
        expect(source).toContain("buildCreateMessageRequest(");
        expect(source).toContain("buildReplaceMessageTextRequest(");
        expect(source).not.toContain("Echo");
    });

    it.each(["40-dar-upload.ts", "50-create-and-exercise.ts"])(
        "%s remains safe to run as a standalone example",
        name => {
            const source = readExampleSource(name);

            expect(source).toContain("runExampleAsync");
            expect(source).toContain("createExampleClient");
            expect(source).toContain("finally");
            expect(source).toContain("disposeAsync");
        },
    );
});
