import { readFile } from "node:fs/promises";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
    ListUserRightsRequest,
    RequestOptions,
    SubmitCommandsRequest,
    UserRightKind,
    type CantonManager,
} from "../../../src/index.js";
import {
    DamlLfBuiltinType,
    DamlLfNodeKind,
    DamlLfPackageLoader,
    DarArchiveLoader,
} from "../../../src/daml-lf/index.js";
import { mapGrpcSubmitCommandsForTransactionRequest } from "../../../src/transports/grpc/mappers/commands-mapper.js";
import {
    CreatedEvent,
    Event,
} from "../../../src/transports/grpc/generated/canton/com/daml/ledger/api/v2/event.js";
import { Transaction } from "../../../src/transports/grpc/generated/canton/com/daml/ledger/api/v2/transaction.js";
import {
    archiveLiveIouAsync,
    createLiveIouAsync,
    liveIouIssuedAtValues,
    resolveLiveQueryParityPartyAsync,
} from "../../live/runtime/live-query-manager-factory.js";
import { getLiveQueryModelFixtureAsync } from "../../live/runtime/live-query-model-fixture.js";

const queryModelDarUrl = new URL(
    "../../live/assets/sdk-query-live-model.dar",
    import.meta.url,
);

function createPartyResolutionManager(
    rights: readonly { readonly type: UserRightKind; readonly party?: string }[],
    allocatedParty = "Allocated::1220",
): {
    readonly manager: CantonManager;
    readonly listUserRights: ReturnType<typeof vi.fn>;
    readonly allocateParty: ReturnType<typeof vi.fn>;
} {
    const listUserRights = vi.fn().mockResolvedValue({ rights });

    const allocateParty = vi.fn().mockResolvedValue({ party: allocatedParty });

    return {
        manager: {
            grpc: {
                userManagementService: {
                    listUserRightsAsync: listUserRights,
                },
                partyManagementService: {
                    allocatePartyAsync: allocateParty,
                },
            },
        } as unknown as CantonManager,
        listUserRights,
        allocateParty,
    };
}

afterEach(() => {
    vi.unstubAllEnvs();
});

describe("live query DAML fixture", () => {
    it("returns the exact offset from the generated Archive transaction", async () => {
        const submit = vi.fn().mockResolvedValue({
            transaction: Transaction.create({ offset: "157" }),
        });

        const manager = {
            grpc: {
                commandService: {
                    submitAndWaitForTransactionAsync: submit,
                },
            },
        } as unknown as CantonManager;

        await expect(archiveLiveIouAsync(
            manager,
            "Visible::1220",
            "00-archived-iou",
            "package-id",
        )).resolves.toBe("157");

        expect(submit).toHaveBeenCalledWith(
            expect.objectContaining({
                applicationId: "sdk-live-query-parity",
                actAs: ["Visible::1220"],
                commands: [expect.objectContaining({
                    contractId: "00-archived-iou",
                    choice: "Archive",
                })],
            }),
            new RequestOptions({ timeoutMs: 30_000 }),
        );
    });

    it.each([
        ["missing transaction", undefined],
        ["empty offset", Transaction.create({ offset: "" })],
        ["zero offset", Transaction.create({ offset: "0" })],
        ["signed offset", Transaction.create({ offset: "+157" })],
        ["nonnumeric offset", Transaction.create({ offset: "offset-157" })],
    ])("rejects an Archive response with %s", async (_case, transaction) => {
        const manager = {
            grpc: {
                commandService: {
                    submitAndWaitForTransactionAsync: vi.fn().mockResolvedValue({
                        transaction,
                    }),
                },
            },
        } as unknown as CantonManager;

        await expect(archiveLiveIouAsync(
            manager,
            "Visible::1220",
            "00-archived-iou",
            "package-id",
        )).rejects.toThrow(
            "Live query parity Archive did not return a positive transaction offset.",
        );
    });

    it("uses an explicit PQS-visible party without reading rights or allocating", async () => {
        const fixture = createPartyResolutionManager([]);

        vi.stubEnv("SDK_TEST_PQS_VISIBLE_PARTY", "  Visible::1220  ");

        await expect(resolveLiveQueryParityPartyAsync(
            fixture.manager,
            "run-1",
        )).resolves.toBe("Visible::1220");

        expect(fixture.listUserRights).not.toHaveBeenCalled();
        expect(fixture.allocateParty).not.toHaveBeenCalled();
    });

    it("allocates when blank explicit visibility falls back to an any-party right", async () => {
        const fixture = createPartyResolutionManager([
            { type: UserRightKind.canActAs, party: "Existing::1220" },
            { type: UserRightKind.canReadAsAnyParty },
        ]);

        vi.stubEnv("SDK_TEST_PQS_VISIBLE_PARTY", "  ");
        vi.stubEnv("SDK_TEST_PQS_LEDGER_USER_ID", "custom-pqs-user");

        await expect(resolveLiveQueryParityPartyAsync(
            fixture.manager,
            "run-2",
        )).resolves.toBe("Allocated::1220");

        expect(fixture.listUserRights).toHaveBeenCalledWith(
            new ListUserRightsRequest({ userId: "custom-pqs-user" }),
        );
        expect(fixture.allocateParty).toHaveBeenCalledWith(
            expect.objectContaining({
                partyIdHint: "sdk-query-parity-run-2",
                displayName: "sdk-query-parity-run-2",
            }),
        );
    });

    it("reuses one deduplicated listed party for the default PQS user", async () => {
        const fixture = createPartyResolutionManager([
            { type: UserRightKind.canReadAs, party: "Visible::1220" },
            { type: UserRightKind.canActAs, party: "Visible::1220" },
        ]);

        await expect(resolveLiveQueryParityPartyAsync(
            fixture.manager,
            "run-3",
            { pqsLedgerUserId: "  " },
        )).resolves.toBe("Visible::1220");

        expect(fixture.listUserRights).toHaveBeenCalledWith(
            new ListUserRightsRequest({ userId: "app-provider-pqs-user" }),
        );
        expect(fixture.allocateParty).not.toHaveBeenCalled();
    });

    it("rejects a PQS user without usable party visibility", async () => {
        const fixture = createPartyResolutionManager([
            { type: UserRightKind.participantAdmin },
        ]);

        await expect(resolveLiveQueryParityPartyAsync(
            fixture.manager,
            "run-4",
            { pqsLedgerUserId: "no-visibility-user" },
        )).rejects.toThrow(
            /no-visibility-user.*SDK_TEST_PQS_VISIBLE_PARTY/u,
        );

        expect(fixture.allocateParty).not.toHaveBeenCalled();
    });

    it("rejects ambiguous listed party visibility instead of guessing", async () => {
        const fixture = createPartyResolutionManager([
            { type: UserRightKind.canReadAs, party: "Alice::1220" },
            { type: UserRightKind.canActAs, party: "Bob::1220" },
        ]);

        await expect(resolveLiveQueryParityPartyAsync(
            fixture.manager,
            "run-5",
            { pqsLedgerUserId: "ambiguous-user" },
        )).rejects.toThrow(
            /ambiguous-user.*SDK_TEST_PQS_VISIBLE_PARTY/u,
        );

        expect(fixture.allocateParty).not.toHaveBeenCalled();
    });

    it("maps the Iou helper payload as Party, Party, Numeric, and Timestamp", async () => {
        const submit = vi.fn().mockResolvedValue({
            events: [{ created: { contractId: "00-query-iou" } }],
        });

        const manager = {
            grpc: {
                commandService: {
                    submitAndWaitForTransactionAsync: submit,
                },
            },
        } as unknown as CantonManager;

        await expect(createLiveIouAsync(
            manager,
            "Issuer::1220",
            "Owner::1220",
            "package-id",
        )).resolves.toBe("00-query-iou");

        const request = submit.mock.calls[0]?.[0] as SubmitCommandsRequest;

        const mapped = mapGrpcSubmitCommandsForTransactionRequest(request);

        expect(submit).toHaveBeenCalledWith(
            request,
            new RequestOptions({ timeoutMs: 30_000 }),
        );

        expect(mapped.commands.commands[0]).toMatchObject({
            command: {
                oneofKind: "create",
                create: {
                    createArguments: {
                        fields: [
                            {
                                label: "issuer",
                                value: {
                                    sum: {
                                        oneofKind: "party",
                                        party: "Issuer::1220",
                                    },
                                },
                            },
                            {
                                label: "owner",
                                value: {
                                    sum: {
                                        oneofKind: "party",
                                        party: "Owner::1220",
                                    },
                                },
                            },
                            {
                                label: "amount",
                                value: {
                                    sum: {
                                        oneofKind: "numeric",
                                        numeric: "1.0",
                                    },
                                },
                            },
                            {
                                label: "issuedAt",
                                value: {
                                    sum: {
                                        oneofKind: "timestamp",
                                        timestamp: liveIouIssuedAtValues.default.microseconds,
                                    },
                                },
                            },
                        ],
                    },
                },
            },
        });
    });

    it("extracts the created contract id from a generated Event", async () => {
        const submit = vi.fn().mockResolvedValue({
            events: [Event.create({
                event: {
                    oneofKind: "created",
                    created: CreatedEvent.create({ contractId: "00-query-iou" }),
                },
            })],
        });

        const manager = {
            grpc: {
                commandService: {
                    submitAndWaitForTransactionAsync: submit,
                },
            },
        } as unknown as CantonManager;

        await expect(createLiveIouAsync(
            manager,
            "Issuer::1220",
            "Owner::1220",
            "package-id",
        )).resolves.toBe("00-query-iou");
    });

    it("resolves the exact main package id from the committed DAR", async () => {
        const fixture = await getLiveQueryModelFixtureAsync();

        const archive = await new DarArchiveLoader().loadDarOrThrowAsync(
            fixture.darBytes,
        );

        const mainPackage = new DamlLfPackageLoader().loadRawPackageOrThrow(
            archive.mainPackageEntry.bytes,
        );

        expect(fixture.packageId).toBe(mainPackage.packageId);
        expect(fixture.templateId).toEqual({
            packageId: mainPackage.packageId,
            moduleName: "Main",
            entityName: "Iou",
        });
    });

    it("contains the typed Main:Iou template and its issuer-controlled Archive", async () => {
        const archive = await new DarArchiveLoader().loadDarOrThrowAsync(
            new Uint8Array(await readFile(queryModelDarUrl)),
        );

        const packageModel = new DamlLfPackageLoader().loadPackageOrThrow(
            archive.mainPackageEntry.bytes,
        );

        const mainModule = packageModel.modules.find((module) =>
            module.name === "Main"
        );

        const iouTemplate = mainModule?.definitions.find((definition) =>
            definition.nodeKind === DamlLfNodeKind.template
            && definition.name === "Iou"
        );

        expect(iouTemplate).toBeDefined();

        if (iouTemplate?.nodeKind !== DamlLfNodeKind.template) {
            throw new Error("Dedicated live query DAR does not contain Main:Iou.");
        }

        expect(iouTemplate.fields.map((field) => [
            field.name,
            field.type.builtinType,
            field.type.numericScale,
        ])).toEqual([
            ["issuer", DamlLfBuiltinType.party, undefined],
            ["owner", DamlLfBuiltinType.party, undefined],
            ["amount", DamlLfBuiltinType.numeric, 10],
            ["issuedAt", DamlLfBuiltinType.timestamp, undefined],
        ]);

        const archiveChoice = iouTemplate.choices.find((choice) =>
            choice.name === "Archive"
        );

        expect(archiveChoice).toMatchObject({
            consuming: true,
            returnType: { builtinType: DamlLfBuiltinType.unit },
        });

        const mainSource = archive.sourceFiles.find((entry) =>
            entry.path.endsWith("/Main.daml") || entry.path === "Main.daml"
        )?.content;

        expect(mainSource).toMatch(/signatory\s+issuer/u);
        expect(mainSource).toMatch(/observer\s+owner/u);
    });
});
