import { createHash } from "node:crypto";
import {
    AllocatePartyRequest,
    CreateCommand,
    DamlParty,
    DamlRecord,
    ExerciseCommand,
    SubmitCommandRequest,
} from "@distrohelena/canton-typescript-sdk";
import { ledgerApiV2 } from "@distrohelena/canton-typescript-sdk/protobuf";
import { describe, expect, it, vi } from "vitest";
import {
    buildCreateMessageRequest,
    buildReplaceMessageTextRequest,
    EXAMPLE_DAR_SHA256,
    extractCreatedContract,
    extractReplacementContracts,
    loadExampleApplicationFixtureAsync,
    provePackageVisibility,
    resolveExamplePartyAsync,
    ensureExampleDarUploadedAsync,
} from "../../../examples/shared/application-fixture.js";

const EXPECTED_DAR_SHA256 =
    "307cf7c52ac2770d1d1a2c5e1ec56a78ab7c70e7809c0cfb419abadb93cc6e29";

describe("loadExampleApplicationFixtureAsync", () => {
    it("loads the pinned Canton Explorer Debug Playground application", async () => {
        const fixture = await loadExampleApplicationFixtureAsync();

        const darSha256 = createHash("sha256")
            .update(fixture.darBytes)
            .digest("hex");

        expect(EXAMPLE_DAR_SHA256).toBe(EXPECTED_DAR_SHA256);
        expect(darSha256).toBe(EXAMPLE_DAR_SHA256);
        expect(darSha256).toBe(EXPECTED_DAR_SHA256);
        expect(fixture.mainPackageId).toBe(
            "4c71b7db4631a5573c96bba609474b2b3e544c2aae7851124403c8ae5169a687",
        );
        expect(fixture.templateId).toEqual({
            packageId: fixture.mainPackageId,
            moduleName: "DebugPlayground",
            entityName: "Message",
        });
        expect(fixture.packageIds).toContain(fixture.mainPackageId);
    });
});

describe("example application package setup", () => {
    const mainPackageId = "main";

    it("proves a newly uploaded main package is visible", () => {
        expect(
            provePackageVisibility({
                mainPackageId,
                before: ["other"],
                after: ["other", mainPackageId],
            }),
        ).toEqual({ alreadyInstalled: false });
    });

    it("proves an already installed main package remains visible", () => {
        expect(
            provePackageVisibility({
                mainPackageId,
                before: [mainPackageId],
                after: [mainPackageId],
            }),
        ).toEqual({ alreadyInstalled: true });
    });

    it("rejects an upload whose main package is not visible", () => {
        expect(() =>
            provePackageVisibility({
                mainPackageId,
                before: [],
                after: [],
            }),
        ).toThrow(/main.*not visible/i);
    });

    it("uploads the actual fixture and proves its main package becomes visible", async () => {
        const fixture = await loadExampleApplicationFixtureAsync();

        const listPackagesAsync = vi
            .fn()
            .mockResolvedValueOnce({ packageIds: [] })
            .mockResolvedValueOnce({ packageIds: [fixture.mainPackageId] });

        const uploadDarFileAsync = vi.fn().mockResolvedValue({});

        const client = {
            packageService: { listPackagesAsync },
            packageManagementService: { uploadDarFileAsync },
        };

        await expect(
            ensureExampleDarUploadedAsync(client as never, fixture),
        ).resolves.toEqual({ alreadyInstalled: false });
        expect(listPackagesAsync).toHaveBeenCalledTimes(2);
        expect(
            ledgerApiV2.ListPackagesRequest.is(
                listPackagesAsync.mock.calls[0]?.[0],
            ),
        ).toBe(true);
        expect(
            ledgerApiV2.ListPackagesRequest.is(
                listPackagesAsync.mock.calls[1]?.[0],
            ),
        ).toBe(true);
        expect(uploadDarFileAsync).toHaveBeenCalledOnce();

        const uploadRequest = uploadDarFileAsync.mock.calls[0]?.[0];

        expect(ledgerApiV2.admin.UploadDarFileRequest.is(uploadRequest)).toBe(
            true,
        );
        expect(uploadRequest.darFile).toBe(fixture.darBytes);
    });

    it("uploads again when the fixture is already installed", async () => {
        const fixture = await loadExampleApplicationFixtureAsync();

        const listPackagesAsync = vi
            .fn()
            .mockResolvedValue({ packageIds: [fixture.mainPackageId] });

        const uploadDarFileAsync = vi.fn().mockResolvedValue({});

        const client = {
            packageService: { listPackagesAsync },
            packageManagementService: { uploadDarFileAsync },
        };

        await expect(
            ensureExampleDarUploadedAsync(client as never, fixture),
        ).resolves.toEqual({ alreadyInstalled: true });
        expect(uploadDarFileAsync).toHaveBeenCalledOnce();
    });
});

describe("example application command helpers", () => {
    const party = "Alice::1";

    const templateId = {
        packageId: "package",
        moduleName: "DebugPlayground",
        entityName: "Message",
    };

    it("builds create and replacement command requests", () => {
        const create = buildCreateMessageRequest({
            party,
            templateId,
            text: "hello",
        });

        const replace = buildReplaceMessageTextRequest({
            party,
            templateId,
            contractId: "#original",
            replacement: "updated",
        });

        expect(create).toBeInstanceOf(SubmitCommandRequest);
        expect(create.actAs).toEqual([party]);
        expect(create.readAs).toEqual([party]);
        expect(create.command).toBeInstanceOf(CreateCommand);
        expect((create.command as CreateCommand).createArguments).toEqual(
            new DamlRecord({
                sender: new DamlParty(party),
                recipient: new DamlParty(party),
                text: "hello",
            }),
        );

        expect(replace.command).toBeInstanceOf(ExerciseCommand);
        expect(replace.command).toMatchObject({
            contractId: "#original",
            choice: "ReplaceText",
            choiceArgument: new DamlRecord({ replacement: "updated" }),
        });
    });
});

describe("transaction event extraction", () => {
    const originalCreated = {
        event: {
            oneofKind: "created",
            created: { contractId: "#original" },
        },
    };

    const originalArchived = {
        event: {
            oneofKind: "archived",
            archived: { contractId: "#original" },
        },
    };

    const replacementCreated = {
        event: {
            oneofKind: "created",
            created: { contractId: "#replacement" },
        },
    };

    it("extracts created and replacement contract IDs from generated event wrappers", () => {
        expect(extractCreatedContract({ events: [originalCreated] })).toEqual({
            contractId: "#original",
            event: originalCreated.event.created,
        });
        expect(
            extractReplacementContracts({
                events: [originalArchived, replacementCreated],
            }),
        ).toEqual({
            archivedContractId: "#original",
            replacementContractId: "#replacement",
        });
    });

    it("rejects absent or malformed created contract events", () => {
        expect(() => extractCreatedContract({ events: [] })).toThrow(
            /created event/i,
        );
        expect(() =>
            extractCreatedContract({
                events: [
                    {
                        event: {
                            oneofKind: "created",
                            created: { contractId: "" },
                        },
                    },
                    {
                        event: {
                            oneofKind: "archived",
                            archived: { contractId: "#original" },
                        },
                    },
                ],
            }),
        ).toThrow(/created event/i);
    });

    it("rejects absent or malformed archived events in replacement responses", () => {
        for (const events of [
            [replacementCreated],
            [
                {
                    event: {
                        oneofKind: "created",
                        archived: { contractId: "#original" },
                    },
                },
                replacementCreated,
            ],
            [
                {
                    event: {
                        oneofKind: "archived",
                        archived: "#original",
                    },
                },
                replacementCreated,
            ],
            [
                {
                    event: {
                        oneofKind: "archived",
                        archived: { contractId: "" },
                    },
                },
                replacementCreated,
            ],
        ]) {
            expect(() => extractReplacementContracts({ events })).toThrow(
                /archived event/i,
            );
        }
    });

    it("rejects absent or malformed replacement created events", () => {
        for (const events of [
            [originalArchived],
            [
                originalArchived,
                {
                    event: {
                        oneofKind: "archived",
                        created: { contractId: "#replacement" },
                    },
                },
            ],
            [
                originalArchived,
                {
                    event: {
                        oneofKind: "created",
                        created: "#replacement",
                    },
                },
            ],
            [
                originalArchived,
                {
                    event: {
                        oneofKind: "created",
                        created: { contractId: "" },
                    },
                },
            ],
        ]) {
            expect(() => extractReplacementContracts({ events })).toThrow(
                /created event/i,
            );
        }
    });
});

describe("resolveExamplePartyAsync", () => {
    it("uses the configured party without allocating one", async () => {
        const allocatePartyAsync = vi.fn();

        const client = {
            partyManagementService: { allocatePartyAsync },
        };

        await expect(
            resolveExamplePartyAsync(client, {
                SDK_EXAMPLE_PARTY: " configured::party ",
            }),
        ).resolves.toEqual({ party: "configured::party", allocated: false });
        expect(allocatePartyAsync).not.toHaveBeenCalled();
    });

    it("allocates a party when no configured party is present", async () => {
        const allocatePartyAsync = vi.fn().mockResolvedValue({
            party: "allocated::party",
        });

        const client = {
            partyManagementService: { allocatePartyAsync },
        };

        await expect(resolveExamplePartyAsync(client, {})).resolves.toEqual({
            party: "allocated::party",
            allocated: true,
        });
        expect(allocatePartyAsync).toHaveBeenCalledWith(
            expect.any(AllocatePartyRequest),
        );

        const request = allocatePartyAsync.mock.calls[0]?.[0];

        expect(request).toBeInstanceOf(AllocatePartyRequest);
        expect(request.partyIdHint).toBe(request.displayName);
        expect(request.partyIdHint).toMatch(
            /^application-example-\d+-[a-f0-9]{8}$/,
        );
        expect(request.userId).toBe("ledger-api-user");
    });

    it("rejects an empty party returned by allocation", async () => {
        const client = {
            partyManagementService: {
                allocatePartyAsync: vi.fn().mockResolvedValue({ party: " " }),
            },
        };

        await expect(resolveExamplePartyAsync(client, {})).rejects.toThrow(
            /empty party/i,
        );
    });
});
