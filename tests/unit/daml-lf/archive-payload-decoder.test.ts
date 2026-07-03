import { describe, expect, it } from "vitest";
import { SampleLfPackageFixture } from "../../fixtures/daml-lf/sample-lf-package-fixture.js";
import { ArchivePayloadDecoder } from "../../../src/daml-lf/decoding/archive-payload-decoder.js";

describe("ArchivePayloadDecoder", () => {
    it("decodes an LF 2.x archive envelope", () => {
        const archiveBytes = SampleLfPackageFixture.createLf2ArchiveBytes();

        const envelope =
            ArchivePayloadDecoder.decodeArchiveOrThrow(archiveBytes);

        expect(envelope.languageVersion.major).toBe(2);
        expect(envelope.languageVersion.minor).toBe("1");
        expect(envelope.languageVersion.patch).toBe(0);
        expect(envelope.languageVersion.toString()).toBe("2.1");
        expect(envelope.packagePayload).toBeInstanceOf(Uint8Array);
    });
});
