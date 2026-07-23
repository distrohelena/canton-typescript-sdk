import {
    createHash,
    createPrivateKey,
    createPublicKey,
    generateKeyPairSync,
    sign,
} from "node:crypto";
import { chmod, mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const maximumTtlSeconds = 600;

function encodeJson(value) {
    return Buffer.from(JSON.stringify(value)).toString("base64url");
}

function getKid(jwk) {
    const thumbprint = JSON.stringify({
        crv: jwk.crv,
        kty: jwk.kty,
        x: jwk.x,
        y: jwk.y,
    });

    return createHash("sha256").update(thumbprint).digest("base64url");
}

function toPublicJwk(publicKey) {
    const jwk = publicKey.export({ format: "jwk" });

    if (jwk.kty !== "EC" || jwk.crv !== "P-256" || !jwk.x || !jwk.y) {
        throw new Error("Expected a P-256 public key.");
    }

    return {
        alg: "ES256",
        crv: jwk.crv,
        kid: getKid(jwk),
        kty: jwk.kty,
        use: "sig",
        x: jwk.x,
        y: jwk.y,
    };
}

async function writePrivateFileAsync(path, content) {
    await writeFile(path, content, { mode: 0o600 });
    await chmod(path, 0o600);
}

export async function generateKeyMaterialAsync(runtimeDirectory) {
    await mkdir(runtimeDirectory, { recursive: true });

    const { privateKey, publicKey } = generateKeyPairSync("ec", {
        namedCurve: "prime256v1",
    });
    const jwk = toPublicJwk(publicKey);
    const privateKeyPath = join(runtimeDirectory, "es256-private-key.pem");
    const jwksPath = join(runtimeDirectory, "jwks.json");

    await writePrivateFileAsync(
        privateKeyPath,
        privateKey.export({ format: "pem", type: "pkcs8" }),
    );
    await writePrivateFileAsync(jwksPath, `${JSON.stringify({ keys: [jwk] })}\n`);

    return { jwk, jwks: { keys: [jwk] }, jwksPath, privateKeyPath };
}

export async function mintTokenAsync({
    audience,
    privateKeyPath,
    subject,
    ttlSeconds,
}) {
    if (!Number.isInteger(ttlSeconds) || ttlSeconds < 1 || ttlSeconds > maximumTtlSeconds) {
        throw new Error(`TTL must be an integer between 1 and ${maximumTtlSeconds} seconds.`);
    }

    const privateKey = createPrivateKey(await readFile(privateKeyPath));
    const jwk = toPublicJwk(createPublicKey(privateKey));
    const issuedAt = Math.floor(Date.now() / 1000);
    const encodedHeader = encodeJson({ alg: "ES256", kid: jwk.kid, typ: "JWT" });
    const encodedPayload = encodeJson({
        aud: audience,
        exp: issuedAt + ttlSeconds,
        iat: issuedAt,
        nbf: issuedAt,
        sub: subject,
    });
    const signingInput = `${encodedHeader}.${encodedPayload}`;
    const signature = sign("sha256", Buffer.from(signingInput), {
        dsaEncoding: "ieee-p1363",
        key: privateKey,
    });

    return `${signingInput}.${signature.toString("base64url")}`;
}

function getArgument(argumentsList, name) {
    const index = argumentsList.indexOf(name);

    if (index < 0 || argumentsList[index + 1] === undefined) {
        throw new Error(`Missing ${name}.`);
    }

    return argumentsList[index + 1];
}

async function mainAsync() {
    const [command, ...argumentsList] = process.argv.slice(2);

    if (command === "init") {
        const material = await generateKeyMaterialAsync(
            getArgument(argumentsList, "--runtime-dir"),
        );
        process.stdout.write(`${JSON.stringify(material)}\n`);
        return;
    }

    if (command === "mint") {
        const token = await mintTokenAsync({
            audience: getArgument(argumentsList, "--audience"),
            privateKeyPath: getArgument(argumentsList, "--private-key-path"),
            subject: getArgument(argumentsList, "--subject"),
            ttlSeconds: Number.parseInt(getArgument(argumentsList, "--ttl-seconds"), 10),
        });
        process.stdout.write(`${token}\n`);
        return;
    }

    throw new Error("Expected 'init' or 'mint'.");
}

const scriptPath = fileURLToPath(import.meta.url);

if (process.argv[1] === scriptPath) {
    mainAsync().catch((error) => {
        process.stderr.write(`${error.message}\n`);
        process.exitCode = 1;
    });
}
