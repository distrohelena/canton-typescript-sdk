import { createHash } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import { Archive } from "../../../src/transports/grpc/generated/canton/com/digitalasset/daml/lf/archive/daml_lf.js";
import { HashFunction } from "../../../src/transports/grpc/generated/canton/com/daml/ledger/api/v2/package_service.js";
import { SampleLfPackageFixture } from "../../fixtures/daml-lf/sample-lf-package-fixture.js";
import { GrpcPackageRelationReader } from "../../../src/query/grpc/grpc-package-relation-reader.js";

function fixturePackage() {
    const archive = Archive.fromBinary(SampleLfPackageFixture.createLf2ArchiveBytes());

    const id = createHash("sha256").update(archive.payload).digest("hex");

    return {
        id,
        payload: archive.payload,
        response: {
            hashFunction: HashFunction.SHA256,
            archivePayload: archive.payload,
            hash: id,
        },
    };
}

function packageResponse(id: string, payload = fixturePackage().payload) {
    return {
        hashFunction: HashFunction.SHA256,
        archivePayload: payload,
        hash: id,
    };
}

describe("GrpcPackageRelationReader", () => {
    it("loads all listed LF2 packages and maps package/template/choice metadata", async () => {
        const fixture = fixturePackage();

        const listPackagesAsync = vi.fn(async () => ({ packageIds: [fixture.id] }));

        const getPackageAsync = vi.fn(async () => fixture.response);

        const reader = new GrpcPackageRelationReader({ listPackagesAsync, getPackageAsync });

        await expect(reader.readAllAsync()).resolves.toEqual([expect.objectContaining({
            id: fixture.id,
            name: "sample-package",
            version: "1.0.0",
            templates: [expect.objectContaining({
                moduleName: "Sample.Module",
                entityName: "Iou",
                payloadType: "template",
                aliases: ["Sample.Module:Iou"],
                templateFqn: "sample-package:Sample.Module:Iou",
                choices: [expect.objectContaining({
                    choice: "Transfer",
                    consuming: true,
                    aliases: ["Sample.Module:Iou:Transfer"],
                    choiceFqn: "sample-package:Sample.Module:Iou:Transfer",
                })],
            })],
        })]);
        expect(listPackagesAsync).toHaveBeenCalledExactlyOnceWith({});
        expect(getPackageAsync).toHaveBeenCalledExactlyOnceWith({ packageId: fixture.id });
    });

    it("loads only referenced packages and deduplicates repeated package identities in one query", async () => {
        const fixture = fixturePackage();

        const listPackagesAsync = vi.fn(async () => ({ packageIds: ["ignored"] }));

        const getPackageAsync = vi.fn(async () => fixture.response);

        const reader = new GrpcPackageRelationReader({ listPackagesAsync, getPackageAsync });

        const packages = await reader.readPackagesAsync([fixture.id, fixture.id]);

        expect(packages.map((item) => item.id)).toEqual([fixture.id]);
        expect(listPackagesAsync).not.toHaveBeenCalled();
        expect(getPackageAsync).toHaveBeenCalledExactlyOnceWith({ packageId: fixture.id });
    });

    it("turns malformed package data into an explicit typed failure without a partial result", async () => {
        const malformedPayload = new Uint8Array([1]);

        const malformedId = createHash("sha256").update(malformedPayload).digest("hex");

        const reader = new GrpcPackageRelationReader({
            listPackagesAsync: async () => ({ packageIds: [malformedId] }),
            getPackageAsync: async () => ({ hashFunction: HashFunction.SHA256, archivePayload: malformedPayload, hash: malformedId }),
        });

        await expect(reader.readAllAsync()).rejects.toMatchObject({ name: "GrpcPackageRelationError", packageId: malformedId });
    });

    it.each([
        ["response accessor", (fixture: ReturnType<typeof fixturePackage>, thrown: unknown) => {
            const response = Object.defineProperty({ ...fixture.response }, "hash", { get: () => {
                throw thrown;
            } });

            return new GrpcPackageRelationReader({ listPackagesAsync: async () => ({ packageIds: [fixture.id] }), getPackageAsync: async () => response });
        }],
        ["package loader", (fixture: ReturnType<typeof fixturePackage>, thrown: unknown) => new GrpcPackageRelationReader(
            { listPackagesAsync: async () => ({ packageIds: [fixture.id] }), getPackageAsync: async () => fixture.response },
            { loadPackageOrThrow: () => {
                throw thrown;
            } } as never,
        )],
    ])("wraps an unformattable %s failure as a typed package error", async (_name, makeReader) => {
        const fixture = fixturePackage();

        const thrown = Proxy.revocable({}, {});

        thrown.revoke();

        await expect(makeReader(fixture, thrown.proxy).readAllAsync()).rejects.toMatchObject({ name: "GrpcPackageRelationError", packageId: fixture.id });
    });

    it.each([
        ["payload digest differs", (fixture: ReturnType<typeof fixturePackage>) => ({ requestId: "0".repeat(64), response: packageResponse("0".repeat(64), fixture.payload) })],
        ["response hash differs", (fixture: ReturnType<typeof fixturePackage>) => ({ requestId: fixture.id, response: packageResponse("0".repeat(64), fixture.payload) })],
        ["payload is corrupted", (fixture: ReturnType<typeof fixturePackage>) => ({ requestId: fixture.id, response: packageResponse(fixture.id, Uint8Array.from([...fixture.payload.slice(0, -1), fixture.payload.at(-1)! ^ 1])) })],
    ])("rejects Package Service integrity failure: %s", async (_name, make) => {
        const fixture = fixturePackage();

        const mismatch = make(fixture);

        const reader = new GrpcPackageRelationReader({
            listPackagesAsync: async () => ({ packageIds: [mismatch.requestId] }),
            getPackageAsync: async () => mismatch.response,
        });

        await expect(reader.readAllAsync()).rejects.toMatchObject({ name: "GrpcPackageRelationError", packageId: mismatch.requestId });
    });

    it.each([null, undefined, 1, {}, { packageIds: undefined }, { packageIds: [] }, { packageIds: "not-an-array" }])("rejects malformed package lists as typed list failures: %j", async (response) => {
        const reader = new GrpcPackageRelationReader({
            listPackagesAsync: async () => response as never,
            getPackageAsync: async () => fixturePackage().response,
        });

        await expect(reader.readAllAsync()).rejects.toMatchObject({ name: "GrpcPackageRelationError", packageId: "<list>" });
    });

    it.each([
        ["throwing accessor", () => Object.defineProperty({}, "packageIds", { get: () => {
            throw new Error("accessor trap");
        } })],
        ["inherited property", () => Object.create({ packageIds: [fixturePackage().id] })],
        ["revoked response proxy", () => {
            const proxy = Proxy.revocable({}, {});

            proxy.revoke();

            return proxy.proxy;
        }],
        ["revoked package ID array", () => {
            const proxy = Proxy.revocable([fixturePackage().id], {});

            proxy.revoke();

            return { packageIds: proxy.proxy };
        }],
        ["throwing array element", () => ({ packageIds: Object.defineProperty(new Array<string>(1), "0", { get: () => {
            throw new Error("element trap");
        } }) })],
        ["revoked array element", () => {
            const value = Proxy.revocable({}, {});

            value.revoke();

            return { packageIds: [value.proxy] };
        }],
    ])("rejects hostile package lists as typed list failures without fetching: %s", async (_name, response) => {
        const getPackageAsync = vi.fn(async () => fixturePackage().response);

        const reader = new GrpcPackageRelationReader({
            listPackagesAsync: async () => response() as never,
            getPackageAsync,
        });

        await expect(reader.readAllAsync()).rejects.toMatchObject({ name: "GrpcPackageRelationError", packageId: "<list>" });
        expect(getPackageAsync).not.toHaveBeenCalled();
    });

    it("translates a throwing package-list descriptor trap without fetching", async () => {
        const getOwnPropertyDescriptor = vi.fn(() => {
            throw new Error("descriptor trap");
        });

        const target = {};

        const response = new Proxy(target, { getOwnPropertyDescriptor });

        const getPackageAsync = vi.fn(async () => fixturePackage().response);

        const reader = new GrpcPackageRelationReader({ listPackagesAsync: async () => response as never, getPackageAsync });

        await expect(reader.readAllAsync()).rejects.toMatchObject({ name: "GrpcPackageRelationError", packageId: "<list>" });
        expect(getOwnPropertyDescriptor).toHaveBeenCalledExactlyOnceWith(target, "packageIds");
        expect(getPackageAsync).not.toHaveBeenCalled();
    });

    it.each([
        ["revoked proxy", () => {
            const value = Proxy.revocable({}, {});

            value.revoke();

            return value.proxy;
        }],
        ["throwing error message", () => Object.defineProperty(new Error("hidden"), "message", { get: () => {
            throw new Error("message trap");
        } })],
    ])("translates an unformattable thrown list value: %s", async (_name, thrownValue) => {
        const response = new Proxy({}, { getOwnPropertyDescriptor: () => {
            throw thrownValue();
        } });

        const getPackageAsync = vi.fn(async () => fixturePackage().response);

        const reader = new GrpcPackageRelationReader({ listPackagesAsync: async () => response as never, getPackageAsync });

        await expect(reader.readAllAsync()).rejects.toMatchObject({ name: "GrpcPackageRelationError", packageId: "<list>" });
        expect(getPackageAsync).not.toHaveBeenCalled();
    });

    it("rejects an accessor package list without invoking it", async () => {
        const accessor = vi.fn(() => [fixturePackage().id]);

        const response = Object.defineProperty({}, "packageIds", { get: accessor });

        const getPackageAsync = vi.fn(async () => fixturePackage().response);

        const reader = new GrpcPackageRelationReader({ listPackagesAsync: async () => response as never, getPackageAsync });

        await expect(reader.readAllAsync()).rejects.toMatchObject({ name: "GrpcPackageRelationError", packageId: "<list>" });
        expect(accessor).not.toHaveBeenCalled();
        expect(getPackageAsync).not.toHaveBeenCalled();
    });

    it("validates and deduplicates the complete package ID list before starting fetches", async () => {
        const fixture = fixturePackage();

        const getPackageAsync = vi.fn(async () => fixture.response);

        const reader = new GrpcPackageRelationReader({ listPackagesAsync: async () => ({ packageIds: [] }), getPackageAsync });

        await expect(reader.readPackagesAsync([fixture.id, "not-a-digest"])).rejects.toMatchObject({ name: "GrpcPackageRelationError", packageId: "not-a-digest" });
        expect(getPackageAsync).not.toHaveBeenCalled();
    });
});
