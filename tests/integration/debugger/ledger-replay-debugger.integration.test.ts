import { describe, expect, it } from "vitest";
import { DamlLfCompilation } from "../../../src/daml-lf/daml-lf-compilation.js";
import { DamlLfWorkspace } from "../../../src/daml-lf/daml-lf-workspace.js";
import { DarSourceBundleLoader } from "../../../src/daml-lf/container/dar-source-bundle-loader.js";
import { DamlLfEvaluator } from "../../../src/daml-lf/interpreter/daml-lf-evaluator.js";
import { DamlLfExpression } from "../../../src/daml-lf/model/daml-lf-expression.js";
import { DamlLfModule } from "../../../src/daml-lf/model/daml-lf-module.js";
import { DamlLfPackage } from "../../../src/daml-lf/model/daml-lf-package.js";
import { DamlLfType } from "../../../src/daml-lf/model/daml-lf-type.js";
import { DamlLfValueDefinition } from "../../../src/daml-lf/model/daml-lf-value-definition.js";
import { GetContractRequest } from "../../../src/core/types/requests/get-contract-request.js";
import { GetEventsByContractIdRequest } from "../../../src/core/types/requests/get-events-by-contract-id-request.js";
import { GetUpdateByOffsetResponse } from "../../../src/core/types/responses/get-update-by-offset-response.js";
import { GetContractResponse } from "../../../src/core/types/responses/get-contract-response.js";
import { GetEventsByContractIdResponse } from "../../../src/core/types/responses/get-events-by-contract-id-response.js";
import { ContractCreated } from "../../../src/core/types/contract-created.js";
import {
    InMemoryReplaySessionStore,
    LedgerReplayDebuggerClient,
    ReplaySessionRequest,
} from "../../../src/debugger/index.js";
import { LedgerReplayEnvironmentBuilder } from "../../../src/debugger/replay/ledger-replay-environment-builder.js";
import { ReplayEntrypointDefinitionResolver } from "../../../src/debugger/replay/replay-entrypoint-definition-resolver.js";
import { LedgerReplaySessionLoader } from "../../../src/debugger/replay/ledger-replay-session-loader.js";
import { ReplayDeterminismValidator } from "../../../src/debugger/replay/replay-determinism-validator.js";
import { ReplayUpdateLoader } from "../../../src/debugger/replay/replay-update-loader.js";
import { DamlSourceMapper } from "../../../src/debugger/source/daml-source-mapper.js";
import { SourceIndexedCompilation } from "../../../src/debugger/source/source-indexed-compilation.js";
import { createSourceMappedDarFixture } from "../../fixtures/daml-lf/source-mapped-dar-fixture.js";

describe("LedgerReplayDebuggerClient integration", () => {
    it("replays a visible exercised update into a stepwise debugger session", async () => {
        const definition = new DamlLfValueDefinition({
            name: "archiveVaultHandler",
            type: new DamlLfType({}),
            expression: new DamlLfExpression({
                textLiteral: "ok",
            }),
        });
        const compilation = DamlLfCompilation.createOrThrow(
            new DamlLfWorkspace([
                new DamlLfPackage({
                    packageId: "pkg-main",
                    packageName: "sample-package",
                    packageVersion: "1.0.0",
                    languageVersion: {
                        major: 2,
                        minor: "1",
                        patch: 0,
                        toString: () => "2.1",
                    },
                    modules: [
                        new DamlLfModule({
                            name: "Main",
                            definitions: [definition],
                        }),
                    ],
                }),
            ]),
        );
        const indexedCompilation = SourceIndexedCompilation.createOrThrow(
            compilation,
            [
                await new DarSourceBundleLoader().loadSourceBundleOrThrowAsync(
                    createSourceMappedDarFixture({
                        packageId: "pkg-main",
                        executables: [
                            {
                                packageId: "pkg-main",
                                moduleName: "Main",
                                definitionName: "archiveVaultHandler",
                                path: "src/Main.daml",
                                startLine: 3,
                                startColumn: 1,
                                endLine: 4,
                                endColumn: 13,
                                entrypointKind: "exercise",
                                templateName: "Vault",
                                choiceName: "Archive",
                            },
                        ],
                    }),
                ),
            ],
        );
        const updateLoader = new ReplayUpdateLoader({
            updateService: {
                async getUpdateByOffsetAsync(): Promise<GetUpdateByOffsetResponse> {
                    return new GetUpdateByOffsetResponse({
                        update: {
                            updateId: "tx-1",
                            offset: "42",
                            actAs: ["Alice"],
                            events: [
                                {
                                    event: {
                                        oneofKind: "exercised",
                                        exercised: {
                                            contractId: "00abc",
                                            templateId: {
                                                packageId: "pkg-main",
                                                moduleName: "Main",
                                                entityName: "Vault",
                                            },
                                            choice: "Archive",
                                            choiceArgument: {},
                                        },
                                    },
                                },
                            ],
                        },
                    });
                },
            },
        });
        const environmentBuilder = new LedgerReplayEnvironmentBuilder({
            contractService: {
                async getContractAsync(
                    request: GetContractRequest,
                ): Promise<GetContractResponse> {
                    expect(request.contractId).toBe("00abc");

                    return new GetContractResponse({
                        createdEvent: {
                            contractId: "00abc",
                            templateId: {
                                packageId: "pkg-main",
                                moduleName: "Main",
                                entityName: "Vault",
                            },
                            createArguments: {
                                owner: "Alice",
                            },
                        },
                    });
                },
            },
            eventQueryService: {
                async getEventsByContractIdAsync(
                    request: GetEventsByContractIdRequest,
                ): Promise<GetEventsByContractIdResponse> {
                    expect(request.contractId).toBe("00abc");

                    return new GetEventsByContractIdResponse({
                        created: new ContractCreated({
                            createdEvent: {
                                contractId: "00abc",
                                templateId: {
                                    packageId: "pkg-main",
                                    moduleName: "Main",
                                    entityName: "Vault",
                                },
                                createArguments: {
                                    owner: "Alice",
                                },
                            },
                            synchronizerId: "sync-1",
                        }),
                    });
                },
            },
        });
        const sessionLoader = new LedgerReplaySessionLoader({
            updateLoader,
            environmentBuilder,
            definitionResolver: new ReplayEntrypointDefinitionResolver(
                indexedCompilation,
            ),
            sourceMapper: new DamlSourceMapper(indexedCompilation),
            evaluator: new DamlLfEvaluator(compilation),
            determinismValidator: new ReplayDeterminismValidator(),
            sessionIdFactory: () => "integration-session",
        });
        const client = new LedgerReplayDebuggerClient({
            sessionLoader,
            sessionStore: new InMemoryReplaySessionStore(),
        });

        const session = await client.loadSessionAsync(
            new ReplaySessionRequest({ offset: "42" }),
        );
        const trace = await client.getTraceSliceAsync(
            "integration-session",
            0,
            10,
        );

        expect(session.metadata?.stepCount).toBe(3);
        expect(session.currentStep?.stateDelta?.kind).toBe("exercise");
        expect(trace).toHaveLength(3);
        expect(trace[0]?.sourceLocation?.path).toBe("src/Main.daml");
        expect(trace[1]?.phase).toBe("enterExpression");
        expect(trace[2]?.valuePreview?.display).toBe("ok");
    });
});
