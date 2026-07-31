import { verify } from "node:crypto";
import {
    ExternalPartyCryptoKeyFormat,
    ExternalPartySignatureFormat,
    ExternalPartySigningAlgorithmSpec,
    ExternalPartySigningKeySpec,
} from "@distrohelena/canton-typescript-sdk";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createExampleEd25519Key } from "../../../examples/shared/party-keys.js";
import { runExampleAsync } from "../../../examples/shared/run.js";

const originalExitCode = process.exitCode;

afterEach(() => {
    process.exitCode = originalExitCode;
    vi.restoreAllMocks();
});

describe("example ED25519 keys", () => {
    it("creates a DER SPKI ED25519 public key and signs supplied payloads", async () => {
        const key = createExampleEd25519Key();

        expect(key.publicKey.format).toBe(
            ExternalPartyCryptoKeyFormat.derX509SubjectPublicKeyInfo,
        );
        expect(key.publicKey.keySpec).toBe(
            ExternalPartySigningKeySpec.ecCurve25519,
        );

        const result = await key.sign({ payload: new Uint8Array([1, 2, 3]) });

        expect(result.format).toBe(ExternalPartySignatureFormat.concat);
        expect(result.signingAlgorithmSpec).toBe(
            ExternalPartySigningAlgorithmSpec.ed25519,
        );
        expect(result.signature).not.toHaveLength(0);
    });

    it("produces a signature verifiable with its returned public key", async () => {
        const key = createExampleEd25519Key();

        const payload = new Uint8Array([4, 5, 6]);

        const result = await key.sign({ payload });

        expect(
            verify(
                null,
                payload,
                {
                    key: key.publicKey.keyData,
                    format: "der",
                    type: "spki",
                },
                result.signature,
            ),
        ).toBe(true);
    });

    it("reports example failures without serializing the original error", async () => {
        const originalError = new Error("connection failed");

        Object.assign(originalError, { privateKey: "must-not-be-logged" });

        const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

        runExampleAsync("external-party", async () => {
            throw originalError;
        });
        await new Promise(resolve => setTimeout(resolve, 0));

        expect(process.exitCode).toBe(1);
        expect(consoleError).toHaveBeenCalledWith(
            "Example external-party failed: connection failed",
        );
    });

    it("reports synchronous example failures", async () => {
        const originalError = new Error("synchronous failure");

        const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

        runExampleAsync("external-party", (() => {
            throw originalError;
        }) as () => Promise<void>);
        await new Promise(resolve => setTimeout(resolve, 0));

        expect(process.exitCode).toBe(1);
        expect(consoleError).toHaveBeenCalledWith(
            "Example external-party failed: synchronous failure",
        );
    });
});
