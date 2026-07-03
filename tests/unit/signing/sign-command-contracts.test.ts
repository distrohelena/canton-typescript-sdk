import { describe, expect, it } from "vitest";
import { ICommandSigner, SignCommandRequest } from "../../../src";

describe("signing contracts", () => {
    it("defines a stable sdk signing contract", async () => {
        const signer: ICommandSigner = {
            signAsync: async (request) => ({
                algorithm: "ed25519",
                signature: new Uint8Array([1, 2, 3]),
                keyId: request.keyId,
            }),
        };

        const result = await signer.signAsync(
            new SignCommandRequest({
                payload: new Uint8Array([9, 9]),
                keyId: "key-1",
            }),
        );

        expect(result.algorithm).toBe("ed25519");
    });
});
