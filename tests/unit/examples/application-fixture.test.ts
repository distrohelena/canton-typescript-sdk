import { createHash } from "node:crypto";
import {
    AllocatePartyRequest,
    CreateAndExerciseCommand,
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
    buildCreateAndReplaceMessageTextRequest,
    buildReplaceMessageTextRequest,
    EXAMPLE_DAR_SHA256,
    extractCreatedContract,
    extractReplacementContracts,
    readCreatedMessageText,
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
            packageName: "canton-explorer-debug-playground",
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

    it("uses a fresh remaining-timeout RequestOptions for every DAR network call", async () => {
        const fixture = await loadExampleApplicationFixtureAsync();

        const listPackagesAsync = vi
            .fn()
            .mockResolvedValueOnce({ packageIds: [] })
            .mockResolvedValueOnce({ packageIds: [fixture.mainPackageId] });

        const uploadDarFileAsync = vi.fn().mockResolvedValue({});

        const remainingTimeoutMs = vi.fn()
            .mockReturnValueOnce(300)
            .mockReturnValueOnce(200)
            .mockReturnValueOnce(100);

        await ensureExampleDarUploadedAsync(
            {
                packageService: { listPackagesAsync },
                packageManagementService: { uploadDarFileAsync },
            } as never,
            fixture,
            { remainingTimeoutMs },
        );

        expect(remainingTimeoutMs).toHaveBeenCalledTimes(3);

        const options = [
            listPackagesAsync.mock.calls[0]?.[1],
            uploadDarFileAsync.mock.calls[0]?.[1],
            listPackagesAsync.mock.calls[1]?.[1],
        ];

        expect(options.map(option => option?.timeoutMs)).toEqual([300, 200, 100]);
        expect(new Set(options).size).toBe(3);
    });
});

describe("example application command helpers", () => {
    const party = "Alice::1";

    const templateId = {
        packageId: "package",
        packageName: "package-name",
        moduleName: "DebugPlayground",
        entityName: "Message",
    };

    it("builds create, replacement, and atomic replacement command requests with caller controls", () => {
        const create = buildCreateMessageRequest({
            party,
            templateId,
            text: "hello",
            commandId: "create-command",
            deduplicationPeriod: { kind: "duration", seconds: 20 },
        });

        const replace = buildReplaceMessageTextRequest({
            party,
            templateId,
            contractId: "#original",
            replacement: "updated",
            commandId: "replace-command",
            deduplicationPeriod: { kind: "duration", seconds: 30 },
        });

        const atomic = buildCreateAndReplaceMessageTextRequest({
            party,
            templateId,
            text: "hello",
            replacement: "updated",
            commandId: "atomic-command",
            deduplicationPeriod: { kind: "offset", offset: "42" },
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

        expect(create.commandId).toBe("create-command");
        expect(create.deduplicationPeriod).toEqual({
            kind: "duration",
            seconds: 20,
        });

        expect(replace.command).toBeInstanceOf(ExerciseCommand);
        expect(replace.command).toMatchObject({
            contractId: "#original",
            choice: "ReplaceText",
            choiceArgument: new DamlRecord({ replacement: "updated" }),
        });
        expect(replace.commandId).toBe("replace-command");
        expect(replace.deduplicationPeriod).toEqual({
            kind: "duration",
            seconds: 30,
        });

        expect(atomic.command).toBeInstanceOf(CreateAndExerciseCommand);
        expect(atomic.command).toMatchObject({
            createArguments: new DamlRecord({
                sender: new DamlParty(party),
                recipient: new DamlParty(party),
                text: "hello",
            }),
            choice: "ReplaceText",
            choiceArgument: new DamlRecord({ replacement: "updated" }),
        });
        expect(atomic.commandId).toBe("atomic-command");
        expect(atomic.deduplicationPeriod).toEqual({
            kind: "offset",
            offset: "42",
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

    it("extracts the active replacement from an atomic ACS-delta response without a transient archive", () => {
        expect(extractCreatedContract({ events: [replacementCreated] })).toEqual({
            contractId: "#replacement",
            event: replacementCreated.event.created,
        });
    });

    it.each([
        [
            "archived",
            [
                originalArchived,
                { event: { oneofKind: "archived", archived: { contractId: "#other-original" } } },
                replacementCreated,
            ],
        ],
        [
            "created",
            [
                originalArchived,
                replacementCreated,
                { event: { oneofKind: "created", created: { contractId: "#other-replacement" } } },
            ],
        ],
    ] as const)(
        "rejects a replacement response with multiple valid %s events",
        (kind, events) => {
            expect(() => extractReplacementContracts({ events })).toThrow(
                new RegExp(`exactly one ${kind} event`, "i"),
            );
        },
    );

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

    it("reads only a decoded Message text field", () => {
        expect(
            readCreatedMessageText({
                contractId: "#message",
                createArguments: ledgerApiV2.Record.create({
                    fields: [{
                        label: "text",
                        value: { sum: { oneofKind: "text", text: "hello" } },
                    }],
                }),
            }),
        ).toBe("hello");

        for (const createArguments of [
            undefined,
            ledgerApiV2.Record.create({ fields: [] }),
            ledgerApiV2.Record.create({
                fields: [{
                    label: "text",
                    value: { sum: { oneofKind: "int64", int64: "1" } },
                }],
            }),
        ]) {
            expect(() =>
                readCreatedMessageText({ contractId: "#message", createArguments }),
            ).toThrow(/text field/i);
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

    it("uses a fresh remaining-timeout RequestOptions for party allocation", async () => {
        const allocatePartyAsync = vi.fn().mockResolvedValue({
            party: "allocated::party",
        });

        const remainingTimeoutMs = vi.fn().mockReturnValue(123);

        await resolveExamplePartyAsync(
            { partyManagementService: { allocatePartyAsync } } as never,
            {},
            { remainingTimeoutMs },
        );

        expect(remainingTimeoutMs).toHaveBeenCalledOnce();
        expect(allocatePartyAsync.mock.calls[0]?.[1]?.timeoutMs).toBe(123);
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
