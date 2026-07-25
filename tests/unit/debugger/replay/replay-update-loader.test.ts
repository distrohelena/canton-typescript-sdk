import { describe, expect, it } from "vitest";
import { GetUpdateByOffsetRequest, GetUpdateResponse } from "../../../../src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js";
import { ReplayUnsupportedUpdateException } from "../../../../src/debugger/index.js";
import { ReplayUpdateLoader } from "../../../../src/debugger/replay/replay-update-loader.js";

describe("ReplayUpdateLoader", () => {
    it("loads a replayable transaction update from getUpdateByOffset", async () => {
        const loader = new ReplayUpdateLoader({
            updateService: {
                async getUpdateByOffsetAsync(
                    request: GetUpdateByOffsetRequest,
                ): Promise<GetUpdateResponse> {
                    expect(request.offset).toBe("42");

                    return GetUpdateResponse.create({
                        update: { oneofKind: "transaction", transaction: {
                            updateId: "tx-1",
                            offset: "42",
                            events: [
                                {
                                    event: {
                                        oneofKind: "created",
                                        created: {
                                            contractId: "00abc",
                                            templateId: {
                                                packageId: "pkg-main",
                                                moduleName: "Main",
                                                entityName: "Vault",
                                            },
                                            createArguments: {
                                                fields: [],
                                            },
                                        },
                                    },
                                },
                            ],
                        } },
                    });
                },
            },
        });

        const update = await loader.loadOrThrowAsync("42");

        expect(update.kind).toBe("transaction");
        expect(update.offset).toBe("42");
    });

    it("derives a create replay entrypoint from a created event payload", async () => {
        const loader = new ReplayUpdateLoader({
            updateService: {
                async getUpdateByOffsetAsync(): Promise<GetUpdateResponse> {
                    return GetUpdateResponse.create({
                        update: { oneofKind: "transaction", transaction: {
                            updateId: "tx-1",
                            offset: "42",
                            events: [
                                {
                                    event: {
                                        oneofKind: "created",
                                        created: {
                                            contractId: "00abc",
                                            templateId: {
                                                packageId: "pkg-main",
                                                moduleName: "Main",
                                                entityName: "Vault",
                                            },
                                            createArguments: {
                                                fields: [],
                                            },
                                        },
                                    },
                                },
                            ],
                        } },
                    });
                },
            },
        });

        const update = await loader.loadOrThrowAsync("42");

        expect(update.entrypoint.kind).toBe("create");
    });

    it("rejects updates whose initiating callable cannot be reconstructed", async () => {
        const loader = new ReplayUpdateLoader({
            updateService: {
                async getUpdateByOffsetAsync(): Promise<GetUpdateResponse> {
                    return GetUpdateResponse.create({
                        update: { oneofKind: "transaction", transaction: {
                            updateId: "tx-2",
                            offset: "43",
                            events: [
                                {
                                    event: {
                                        oneofKind: "created",
                                        created: {
                                            contractId: "00abc",
                                        },
                                    },
                                },
                            ],
                        } },
                    });
                },
            },
        });

        await expect(loader.loadOrThrowAsync("43")).rejects.toThrow(
            ReplayUnsupportedUpdateException,
        );
    });
});
