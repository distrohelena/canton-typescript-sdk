import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createPublicKey, verify } from "node:crypto";
import { describe, expect, it } from "vitest";

interface KeyMaterial {
    readonly jwks: { readonly keys: readonly [JsonWebKey] };
    readonly privateKeyPath: string;
}

interface Es256JwtModule {
    generateKeyMaterialAsync(runtimeDirectory: string): Promise<KeyMaterial>;
    mintTokenAsync(init: {
        readonly audience: string;
        readonly privateKeyPath: string;
        readonly subject: string;
        readonly ttlSeconds: number;
    }): Promise<string>;
}

async function loadModuleAsync(): Promise<Es256JwtModule> {
    const modulePath = new URL("../../../node/es256-jwt.mjs", import.meta.url);

    return (await import(modulePath.href)) as Es256JwtModule;
}

function decodeJson(part: string): Record<string, unknown> {
    return JSON.parse(Buffer.from(part, "base64url").toString("utf8")) as Record<
        string,
        unknown
    >;
}

describe("ES256 localnet JWT helper", () => {
    it("generates a P-256 JWKS and signs a JOSE ES256 bearer token", async () => {
        const runtimeDirectory = await mkdtemp(join(tmpdir(), "es256-jwt-test-"));

        try {
            const helper = await loadModuleAsync();
            const material = await helper.generateKeyMaterialAsync(runtimeDirectory);
            const [jwk] = material.jwks.keys;
            const token = await helper.mintTokenAsync({
                audience: "https://canton.network.global",
                privateKeyPath: material.privateKeyPath,
                subject: "ledger-api-user",
                ttlSeconds: 600,
            });
            const [encodedHeader, encodedPayload, encodedSignature] = token.split(".");
            const header = decodeJson(encodedHeader);
            const payload = decodeJson(encodedPayload);
            const publicKey = createPublicKey({ format: "jwk", key: jwk });

            expect(jwk).toMatchObject({
                alg: "ES256",
                crv: "P-256",
                kty: "EC",
                use: "sig",
            });
            expect(typeof jwk.kid).toBe("string");
            expect(header).toEqual({ alg: "ES256", kid: jwk.kid, typ: "JWT" });
            expect(payload).toMatchObject({
                aud: "https://canton.network.global",
                sub: "ledger-api-user",
            });
            expect(payload.exp).toBeTypeOf("number");
            expect((payload.exp as number) - (payload.iat as number)).toBe(600);
            expect(
                verify(
                    "sha256",
                    `${encodedHeader}.${encodedPayload}`,
                    { dsaEncoding: "ieee-p1363", key: publicKey },
                    Buffer.from(encodedSignature, "base64url"),
                ),
            ).toBe(true);
            expect((await readFile(material.privateKeyPath)).byteLength).toBeGreaterThan(0);
        } finally {
            await rm(runtimeDirectory, { force: true, recursive: true });
        }
    });

    it("rejects a token lifetime longer than ten minutes", async () => {
        const runtimeDirectory = await mkdtemp(join(tmpdir(), "es256-jwt-test-"));

        try {
            const helper = await loadModuleAsync();
            const material = await helper.generateKeyMaterialAsync(runtimeDirectory);

            await expect(
                helper.mintTokenAsync({
                    audience: "https://canton.network.global",
                    privateKeyPath: material.privateKeyPath,
                    subject: "ledger-api-user",
                    ttlSeconds: 601,
                }),
            ).rejects.toThrow("TTL");
        } finally {
            await rm(runtimeDirectory, { force: true, recursive: true });
        }
    });
});
