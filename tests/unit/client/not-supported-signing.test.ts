import { describe, expect, it } from "vitest";
import {
    CantonClient,
    CantonClientOptions,
    NotSupportedError,
    TransportKind,
} from "../../../src";

describe("CantonClient signing support", () => {
    it("rejects json command signing in v1", () => {
        expect(
            () =>
                new CantonClient(
                    new CantonClientOptions({
                        transportKind: TransportKind.json,
                        ledgerEndpoint: "https://ledger.example.com",
                        commandSigner: {
                            signAsync: async () => ({
                                algorithm: "x",
                                signature: new Uint8Array(),
                            }),
                        },
                    }),
                ),
        ).toThrow(NotSupportedError);
    });
});
