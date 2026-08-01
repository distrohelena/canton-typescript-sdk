# SDK Application Examples Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (- [ ]) syntax for tracking.

**Goal:** Add six standalone TypeScript SDK examples for DAR upload, contract creation/exercise, active-contract reads, update streaming, user-right reads, and PartyToParticipant inspection, proven live on Canton Participant 3.5.7 and 3.5.8.

**Architecture:** A checked-in Canton Explorer DAR supplies one small Message template. A shared application fixture owns repeatable DAR metadata, package setup, party setup, command construction, and response extraction, while each executable keeps its primary public SDK request and service call visible. Focused unit tests cover all deterministic helpers; live runs prove the thin executable layers against both participants.

**Tech Stack:** TypeScript 5.9, Node.js ESM, Canton TypeScript SDK public entry points, protobuf-ts generated public messages, DAML-LF archive loaders, Vitest, ESLint, Canton Participants 3.5.7 and 3.5.8.

---

## Scope and file map

Create:

- examples/assets/canton-explorer-debug-playground-0.1.0.dar — pinned normal Canton Explorer test DAR.
- examples/assets/README.md — license, source commit, build command, and SHA-256 provenance.
- examples/shared/application-fixture.ts — DAR parsing, upload proof, actor-party resolution, Message commands, and command-response extraction.
- examples/shared/ledger-requests.ts — generated active-contract/update requests and response matching.
- examples/40-dar-upload.ts — explicit package listing and upload.
- examples/50-create-and-exercise.ts — Message creation and consuming ReplaceText exercise.
- examples/60-query-active-contracts.ts — generated EventFormat active-contract query.
- examples/61-stream-updates.ts — bounded update stream started before submission.
- examples/70-user-rights.ts — read-only user and rights inspection.
- examples/80-topology-inspection.ts — PartyToParticipant inspection.
- tests/unit/examples/application-fixture.test.ts — fixture, commands, event extraction, party setup, and timeout tests.
- tests/unit/examples/ledger-requests.test.ts — generated request and update matching tests.
- tests/unit/examples/application-example-sources.test.ts — verifies each thin script exposes its teaching call.

Modify:

- examples/shared/localnet.ts — parse SDK_EXAMPLE_TIMEOUT_MS once for all bounded examples.
- tests/unit/examples/localnet.test.ts — timeout parsing tests.
- package.json — add only the six example scripts; preserve the user-owned version edit.
- README.md — lifecycle-order usage, configuration, durability warnings, DAR provenance, and 3.5.7/3.5.8 statement.

Do not modify:

- npm files publication list; examples and the DAR remain repository-only.
- the Canton Explorer checkout.
- the four unrelated untracked plans.
- the existing user-owned package.json version value.

### Task 1: Pin and parse the Canton Explorer DAR

**Files:**

- Create: examples/assets/canton-explorer-debug-playground-0.1.0.dar
- Create: examples/assets/README.md
- Create: examples/shared/application-fixture.ts
- Create: tests/unit/examples/application-fixture.test.ts

- [ ] **Step 1: Write the failing DAR metadata test**

Create tests/unit/examples/application-fixture.test.ts with the first contract:

    import { createHash } from "node:crypto";
    import { describe, expect, it } from "vitest";
    import {
        EXAMPLE_DAR_SHA256,
        loadExampleApplicationFixtureAsync,
    } from "../../../examples/shared/application-fixture.js";

    describe("application example fixture", () => {
        it("loads the pinned Canton Explorer DAR and resolves Message", async () => {
            const fixture = await loadExampleApplicationFixtureAsync();

            expect(
                createHash("sha256").update(fixture.darBytes).digest("hex"),
            ).toBe(EXAMPLE_DAR_SHA256);
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

- [ ] **Step 2: Run the focused test and verify RED**

Run:

    rtk npx vitest run tests/unit/examples/application-fixture.test.ts

Expected: FAIL because examples/shared/application-fixture.ts does not exist.

- [ ] **Step 3: Copy and verify the exact normal DAR**

Run:

    rtk mkdir -p examples/assets
    rtk cp /home/helena/dev/daml/canton-explorer/debug-playground/.daml/dist/canton-explorer-debug-playground-0.1.0.dar examples/assets/canton-explorer-debug-playground-0.1.0.dar
    rtk sha256sum examples/assets/canton-explorer-debug-playground-0.1.0.dar

Expected SHA-256:

    307cf7c52ac2770d1d1a2c5e1ec56a78ab7c70e7809c0cfb419abadb93cc6e29

Do not copy canton-explorer-debug-playground-0.1.0-debug.dar.

- [ ] **Step 4: Document asset provenance**

Create examples/assets/README.md with:

    # Example DAR assets

    canton-explorer-debug-playground-0.1.0.dar is the normal, non-debug DAR
    built from /home/helena/dev/daml/canton-explorer/debug-playground.

    - Checkout HEAD: 750b28dd0ce4674e4368c12a6da1b5b5cbb00f88
    - Package-introduction commit: abde077
    - DAML SDK: 3.5.2
    - License: Apache-2.0
    - SHA-256: 307cf7c52ac2770d1d1a2c5e1ec56a78ab7c70e7809c0cfb419abadb93cc6e29

    Rebuild from that checkout with:

        cd /home/helena/dev/daml/canton-explorer/debug-playground
        daml build

    Verify after copying with:

        sha256sum examples/assets/canton-explorer-debug-playground-0.1.0.dar

- [ ] **Step 5: Implement the minimal DAR loader**

Create examples/shared/application-fixture.ts. Start with these public imports and API:

    import { readFile } from "node:fs/promises";
    import { fileURLToPath } from "node:url";
    import {
        DamlLfNodeKind,
        DamlLfPackageLoader,
        DarArchiveLoader,
    } from "@distrohelena/canton-typescript-sdk/daml-lf";

    export const EXAMPLE_DAR_SHA256 =
        "307cf7c52ac2770d1d1a2c5e1ec56a78ab7c70e7809c0cfb419abadb93cc6e29";

    export interface ExampleTemplateId {
        readonly packageId: string;
        readonly moduleName: string;
        readonly entityName: string;
    }

    export interface ExampleApplicationFixture {
        readonly darBytes: Uint8Array;
        readonly mainPackageId: string;
        readonly packageIds: readonly string[];
        readonly templateId: ExampleTemplateId;
    }

    export async function loadExampleApplicationFixtureAsync(
        darUrl: URL = new URL(
            "../assets/canton-explorer-debug-playground-0.1.0.dar",
            import.meta.url,
        ),
    ): Promise<ExampleApplicationFixture> {
        const darBytes = await readFile(fileURLToPath(darUrl));
        const archive = await new DarArchiveLoader().loadDarOrThrowAsync(darBytes);
        const packageLoader = new DamlLfPackageLoader();
        const packageIds = archive.packageEntries.map((entry) =>
            packageLoader.loadRawPackageOrThrow(entry.bytes).packageId,
        );
        const mainPackage = packageLoader.loadPackageOrThrow(
            archive.mainPackageEntry.bytes,
        );
        const hasMessage = mainPackage.modules.some(
            (module) =>
                module.name === "DebugPlayground" &&
                module.definitions.some(
                    (definition) =>
                        definition.nodeKind === DamlLfNodeKind.template &&
                        definition.templateId.templateName === "Message",
                ),
        );

        if (!hasMessage) {
            throw new Error(
                "Example DAR does not contain DebugPlayground:Message.",
            );
        }

        return {
            darBytes,
            mainPackageId: mainPackage.packageId,
            packageIds: [...new Set(packageIds)],
            templateId: {
                packageId: mainPackage.packageId,
                moduleName: "DebugPlayground",
                entityName: "Message",
            },
        };
    }

Keep ExampleTemplateId local to the examples because the root package does not
export the query module's type-only TemplateId. Do not import src internals from
examples.

- [ ] **Step 6: Run focused tests and type-check the examples**

Run:

    rtk npx vitest run tests/unit/examples/application-fixture.test.ts
    rtk npm run examples:check

Expected: PASS.

- [ ] **Step 7: Commit the asset and loader**

Run:

    rtk git add examples/assets examples/shared/application-fixture.ts tests/unit/examples/application-fixture.test.ts
    rtk git diff --cached --check
    rtk git commit -m "feat: add example application DAR fixture"

Expected: the binary DAR, provenance, helper, and one focused test are committed; no user-owned files are staged.

### Task 2: Add command construction, party setup, and response extraction

**Files:**

- Modify: examples/shared/application-fixture.ts
- Modify: tests/unit/examples/application-fixture.test.ts

- [ ] **Step 1: Add failing command and response tests**

Extend the test file with:

    import {
        AllocatePartyRequest,
        CreateCommand,
        DamlParty,
        DamlRecord,
        ExerciseCommand,
        SubmitCommandRequest,
    } from "@distrohelena/canton-typescript-sdk";
    import {
        buildCreateMessageRequest,
        buildReplaceMessageTextRequest,
        extractCreatedContract,
        extractReplacementContracts,
        resolveExamplePartyAsync,
    } from "../../../examples/shared/application-fixture.js";

    it("builds explicit create and replace command requests", () => {
        const templateId = {
            packageId: "package",
            moduleName: "DebugPlayground",
            entityName: "Message",
        };
        const create = buildCreateMessageRequest({
            party: "Alice::1",
            templateId,
            text: "hello",
        });
        const replace = buildReplaceMessageTextRequest({
            party: "Alice::1",
            templateId,
            contractId: "#original",
            replacement: "updated",
        });

        expect(create).toBeInstanceOf(SubmitCommandRequest);
        expect(create.actAs).toEqual(["Alice::1"]);
        expect(create.readAs).toEqual(["Alice::1"]);
        expect(create.command).toBeInstanceOf(CreateCommand);
        expect((create.command as CreateCommand).createArguments).toEqual(
            new DamlRecord({
                sender: new DamlParty("Alice::1"),
                recipient: new DamlParty("Alice::1"),
                text: "hello",
            }),
        );
        expect(replace.command).toBeInstanceOf(ExerciseCommand);
        expect((replace.command as ExerciseCommand).choice).toBe("ReplaceText");
        expect((replace.command as ExerciseCommand).choiceArgument).toEqual(
            new DamlRecord({ replacement: "updated" }),
        );
    });

    it("extracts create and replacement contract ids from ACS_DELTA events", () => {
        const created = {
            event: {
                oneofKind: "created",
                created: { contractId: "#original" },
            },
        };
        const archived = {
            event: {
                oneofKind: "archived",
                archived: { contractId: "#original" },
            },
        };
        const replacement = {
            event: {
                oneofKind: "created",
                created: { contractId: "#replacement" },
            },
        };

        expect(extractCreatedContract({ events: [created] })).toMatchObject({
            contractId: "#original",
        });
        expect(
            extractReplacementContracts({
                events: [archived, replacement],
            }),
        ).toEqual({
            archivedContractId: "#original",
            replacementContractId: "#replacement",
        });
        expect(() => extractCreatedContract({ events: [] })).toThrow(
            /created event/i,
        );
    });

    it("reuses a configured party or allocates a unique hosted party", async () => {
        const allocatePartyAsync = vi.fn().mockResolvedValue({
            party: "allocated::party",
        });
        const client = {
            partyManagementService: { allocatePartyAsync },
        };

        await expect(
            resolveExamplePartyAsync(client as never, {
                SDK_EXAMPLE_PARTY: " configured::party ",
            }),
        ).resolves.toEqual({
            party: "configured::party",
            allocated: false,
        });
        expect(allocatePartyAsync).not.toHaveBeenCalled();

        await expect(
            resolveExamplePartyAsync(client as never, {}),
        ).resolves.toEqual({
            party: "allocated::party",
            allocated: true,
        });
        expect(allocatePartyAsync.mock.calls[0][0]).toBeInstanceOf(
            AllocatePartyRequest,
        );
    });

Add vi to the Vitest imports.

- [ ] **Step 2: Run the focused tests and verify RED**

Run:

    rtk npx vitest run tests/unit/examples/application-fixture.test.ts

Expected: FAIL because the new helper exports are missing.

- [ ] **Step 3: Implement command builders**

Add public root SDK imports for AllocatePartyRequest, CantonClient, CreateCommand, DamlParty, DamlRecord, ExerciseCommand, and SubmitCommandRequest.

Implement:

    const EXAMPLE_APPLICATION_ID = "canton-typescript-sdk-examples";

    export function buildCreateMessageRequest(init: {
        party: string;
        templateId: ExampleApplicationFixture["templateId"];
        text: string;
    }): SubmitCommandRequest {
        return new SubmitCommandRequest({
            applicationId: EXAMPLE_APPLICATION_ID,
            actAs: [init.party],
            readAs: [init.party],
            command: new CreateCommand({
                templateId: init.templateId,
                createArguments: new DamlRecord({
                    sender: new DamlParty(init.party),
                    recipient: new DamlParty(init.party),
                    text: init.text,
                }),
            }),
        });
    }

    export function buildReplaceMessageTextRequest(init: {
        party: string;
        templateId: ExampleApplicationFixture["templateId"];
        contractId: string;
        replacement: string;
    }): SubmitCommandRequest {
        return new SubmitCommandRequest({
            applicationId: EXAMPLE_APPLICATION_ID,
            actAs: [init.party],
            readAs: [init.party],
            command: new ExerciseCommand({
                templateId: init.templateId,
                contractId: init.contractId,
                choice: "ReplaceText",
                choiceArgument: new DamlRecord({
                    replacement: init.replacement,
                }),
            }),
        });
    }

- [ ] **Step 4: Implement response extraction and actor resolution**

Use structural guards because SubmitCommandTransactionResponse.events is intentionally readonly unknown[].

    function isRecord(value: unknown): value is Record<string, unknown> {
        return value !== null && typeof value === "object";
    }

    function eventPayload(
        value: unknown,
        kind: "created" | "archived",
    ): Record<string, unknown> | undefined {
        if (!isRecord(value) || !isRecord(value.event)) {
            return undefined;
        }
        const event = value.event;
        return event.oneofKind === kind && isRecord(event[kind])
            ? event[kind] as Record<string, unknown>
            : undefined;
    }

    export function extractCreatedContract(
        response: { readonly events: readonly unknown[] },
    ): { readonly contractId: string; readonly event: Record<string, unknown> } {
        for (const value of response.events) {
            const event = eventPayload(value, "created");
            if (event && typeof event.contractId === "string" && event.contractId) {
                return { contractId: event.contractId, event };
            }
        }
        throw new Error("Command response did not contain a created event.");
    }

    export function extractReplacementContracts(
        response: { readonly events: readonly unknown[] },
    ): {
        readonly archivedContractId: string;
        readonly replacementContractId: string;
    } {
        const archived = response.events
            .map((event) => eventPayload(event, "archived"))
            .find((event) => typeof event?.contractId === "string");
        const created = extractCreatedContract(response);
        if (!archived || typeof archived.contractId !== "string") {
            throw new Error(
                "ReplaceText response did not contain an archived event.",
            );
        }
        return {
            archivedContractId: archived.contractId,
            replacementContractId: created.contractId,
        };
    }

    export async function resolveExamplePartyAsync(
        client: Pick<CantonClient, "partyManagementService">,
        environment: NodeJS.ProcessEnv = process.env,
    ): Promise<{ readonly party: string; readonly allocated: boolean }> {
        const configured = environment.SDK_EXAMPLE_PARTY?.trim();
        if (configured) {
            return { party: configured, allocated: false };
        }
        const partyHint = createPartyHint({ prefix: "application-example" });
        const response =
            await client.partyManagementService.allocatePartyAsync(
                new AllocatePartyRequest({
                    partyIdHint: partyHint,
                    displayName: partyHint,
                }),
            );
        return { party: response.party, allocated: true };
    }

Import createPartyHint from examples/shared/localnet.ts.

- [ ] **Step 5: Run tests, type-check, and commit**

Run:

    rtk npx vitest run tests/unit/examples/application-fixture.test.ts
    rtk npm run examples:check
    rtk npx eslint examples/shared/application-fixture.ts tests/unit/examples/application-fixture.test.ts --max-warnings=0
    rtk git add examples/shared/application-fixture.ts tests/unit/examples/application-fixture.test.ts
    rtk git diff --cached --check
    rtk git commit -m "feat: add example application command helpers"

Expected: all checks PASS and only Task 2 files are committed.

### Task 3: Add bounded configuration and package setup

**Files:**

- Modify: examples/shared/localnet.ts
- Modify: tests/unit/examples/localnet.test.ts
- Modify: examples/shared/application-fixture.ts
- Modify: tests/unit/examples/application-fixture.test.ts

- [ ] **Step 1: Add failing timeout tests**

Add to tests/unit/examples/localnet.test.ts:

    import { exampleTimeoutMs } from "../../../examples/shared/localnet.js";

    it("uses a finite default example timeout", () => {
        expect(exampleTimeoutMs(environment())).toBe(30_000);
    });

    it("parses a positive SDK_EXAMPLE_TIMEOUT_MS", () => {
        expect(
            exampleTimeoutMs(
                environment({ SDK_EXAMPLE_TIMEOUT_MS: "45000" }),
            ),
        ).toBe(45_000);
    });

    it("rejects invalid SDK_EXAMPLE_TIMEOUT_MS values", () => {
        for (const value of ["", "0", "-1", "abc", "1.5"]) {
            expect(() =>
                exampleTimeoutMs(
                    environment({ SDK_EXAMPLE_TIMEOUT_MS: value }),
                ),
            ).toThrow(/SDK_EXAMPLE_TIMEOUT_MS/);
        }
    });

- [ ] **Step 2: Add failing package visibility tests**

Add to application-fixture.test.ts:

    import {
        ensureExampleDarUploadedAsync,
        provePackageVisibility,
    } from "../../../examples/shared/application-fixture.js";

    it("proves package visibility and reports whether it was new", () => {
        expect(
            provePackageVisibility({
                mainPackageId: "main",
                before: ["dependency"],
                after: ["dependency", "main"],
            }),
        ).toEqual({ alreadyInstalled: false });
        expect(
            provePackageVisibility({
                mainPackageId: "main",
                before: ["main"],
                after: ["main"],
            }),
        ).toEqual({ alreadyInstalled: true });
        expect(() =>
            provePackageVisibility({
                mainPackageId: "main",
                before: [],
                after: [],
            }),
        ).toThrow(/main.*not visible/i);
    });

    it("uploads the DAR and proves ledger package visibility", async () => {
        const fixture = await loadExampleApplicationFixtureAsync();
        const listPackagesAsync = vi
            .fn()
            .mockResolvedValueOnce({ packageIds: [] })
            .mockResolvedValueOnce({
                packageIds: [fixture.mainPackageId],
            });
        const uploadDarFileAsync = vi.fn().mockResolvedValue({});
        const client = {
            packageService: { listPackagesAsync },
            packageManagementService: { uploadDarFileAsync },
        };

        await expect(
            ensureExampleDarUploadedAsync(client as never, fixture),
        ).resolves.toEqual({ alreadyInstalled: false });
        expect(uploadDarFileAsync).toHaveBeenCalledOnce();
    });

- [ ] **Step 3: Run the focused tests and verify RED**

Run:

    rtk npx vitest run tests/unit/examples/localnet.test.ts tests/unit/examples/application-fixture.test.ts

Expected: FAIL for the new exports.

- [ ] **Step 4: Implement timeout parsing**

Add to examples/shared/localnet.ts:

    const DEFAULT_EXAMPLE_TIMEOUT_MS = 30_000;

    export function exampleTimeoutMs(
        environment: NodeJS.ProcessEnv = process.env,
    ): number {
        const raw = environment.SDK_EXAMPLE_TIMEOUT_MS;
        if (raw === undefined) {
            return DEFAULT_EXAMPLE_TIMEOUT_MS;
        }
        const value = Number(raw);
        if (!Number.isSafeInteger(value) || value <= 0) {
            throw new Error(
                "SDK_EXAMPLE_TIMEOUT_MS must be a positive integer.",
            );
        }
        return value;
    }

- [ ] **Step 5: Implement reusable idempotent package setup**

In application-fixture.ts import ledgerApiV2 from the public protobuf entry point and add:

    export function provePackageVisibility(init: {
        readonly mainPackageId: string;
        readonly before: readonly string[];
        readonly after: readonly string[];
    }): { readonly alreadyInstalled: boolean } {
        if (!init.after.includes(init.mainPackageId)) {
            throw new Error(
                "Uploaded main package " + init.mainPackageId +
                " is not visible through PackageService.",
            );
        }
        return {
            alreadyInstalled: init.before.includes(init.mainPackageId),
        };
    }

    export async function ensureExampleDarUploadedAsync(
        client: Pick<CantonClient, "packageService" | "packageManagementService">,
        fixture: ExampleApplicationFixture,
    ): Promise<{ readonly alreadyInstalled: boolean }> {
        const before = await client.packageService.listPackagesAsync(
            ledgerApiV2.ListPackagesRequest.create(),
        );
        await client.packageManagementService.uploadDarFileAsync(
            ledgerApiV2.admin.UploadDarFileRequest.create({
                darFile: fixture.darBytes,
            }),
        );
        const after = await client.packageService.listPackagesAsync(
            ledgerApiV2.ListPackagesRequest.create(),
        );
        return provePackageVisibility({
            mainPackageId: fixture.mainPackageId,
            before: before.packageIds,
            after: after.packageIds,
        });
    }

The dedicated DAR example will make these three service calls directly; the helper is for later scripts.

- [ ] **Step 6: Run tests, checks, and commit**

Run:

    rtk npx vitest run tests/unit/examples/localnet.test.ts tests/unit/examples/application-fixture.test.ts
    rtk npm run examples:check
    rtk npx eslint examples/shared/localnet.ts examples/shared/application-fixture.ts tests/unit/examples/localnet.test.ts tests/unit/examples/application-fixture.test.ts --max-warnings=0
    rtk git add examples/shared/localnet.ts examples/shared/application-fixture.ts tests/unit/examples/localnet.test.ts tests/unit/examples/application-fixture.test.ts
    rtk git diff --cached --check
    rtk git commit -m "feat: add bounded application example setup"

Expected: PASS.

### Task 4: Add DAR upload and create/exercise examples

**Files:**

- Create: examples/40-dar-upload.ts
- Create: examples/50-create-and-exercise.ts
- Create: tests/unit/examples/application-example-sources.test.ts

- [ ] **Step 1: Write failing source-contract tests**

Create tests/unit/examples/application-example-sources.test.ts:

    import { readFileSync } from "node:fs";
    import { describe, expect, it } from "vitest";

    function source(name: string): string {
        return readFileSync(
            new URL("../../../examples/" + name, import.meta.url),
            "utf8",
        );
    }

    describe("application examples", () => {
        it("shows the package upload boundary directly", () => {
            const example = source("40-dar-upload.ts");
            expect(example).toContain("listPackagesAsync(");
            expect(example).toContain("UploadDarFileRequest.create(");
            expect(example).toContain("uploadDarFileAsync(");
            expect(example).toContain("provePackageVisibility(");
        });

        it("shows transaction-returning create and exercise calls", () => {
            const example = source("50-create-and-exercise.ts");
            expect(example).toContain(
                "commandService.submitAndWaitForTransactionAsync(",
            );
            expect(example).toContain("buildCreateMessageRequest(");
            expect(example).toContain("buildReplaceMessageTextRequest(");
            expect(example).not.toContain("Echo");
        });
    });

- [ ] **Step 2: Run the source test and verify RED**

Run:

    rtk npx vitest run tests/unit/examples/application-example-sources.test.ts

Expected: FAIL because both scripts are absent.

- [ ] **Step 3: Implement 40-dar-upload.ts**

The executable must:

1. create the client;
2. load the fixture;
3. call packageService.listPackagesAsync with ledgerApiV2.ListPackagesRequest.create();
4. call packageManagementService.uploadDarFileAsync with ledgerApiV2.admin.UploadDarFileRequest.create({ darFile });
5. list packages again;
6. call provePackageVisibility;
7. print the main package ID and either already installed or newly visible;
8. dispose the client in finally.

Use this central body:

    const before = await client.packageService.listPackagesAsync(
        ledgerApiV2.ListPackagesRequest.create(),
    );
    await client.packageManagementService.uploadDarFileAsync(
        ledgerApiV2.admin.UploadDarFileRequest.create({
            darFile: fixture.darBytes,
        }),
    );
    const after = await client.packageService.listPackagesAsync(
        ledgerApiV2.ListPackagesRequest.create(),
    );
    const visibility = provePackageVisibility({
        mainPackageId: fixture.mainPackageId,
        before: before.packageIds,
        after: after.packageIds,
    });

Do not call ensureExampleDarUploadedAsync from this script because the upload call is its teaching boundary.

- [ ] **Step 4: Implement 50-create-and-exercise.ts**

The executable must:

1. load and ensure the DAR;
2. resolve or allocate the actor;
3. warn if allocation created durable party topology and always warn that contracts are durable;
4. submit the create request with submitAndWaitForTransactionAsync;
5. extract the original contract ID;
6. submit ReplaceText;
7. prove the archived ID equals the original and print both real IDs;
8. dispose the client in finally.

Core sequence:

    const fixture = await loadExampleApplicationFixtureAsync();
    await ensureExampleDarUploadedAsync(client, fixture);
    const actor = await resolveExamplePartyAsync(client);
    const createResponse =
        await client.commandService.submitAndWaitForTransactionAsync(
            buildCreateMessageRequest({
                party: actor.party,
                templateId: fixture.templateId,
                text: "Hello from the Canton TypeScript SDK",
            }),
        );
    const original = extractCreatedContract(createResponse);
    const replaceResponse =
        await client.commandService.submitAndWaitForTransactionAsync(
            buildReplaceMessageTextRequest({
                party: actor.party,
                templateId: fixture.templateId,
                contractId: original.contractId,
                replacement: "Updated by ReplaceText",
            }),
        );
    const replacement = extractReplacementContracts(replaceResponse);
    if (replacement.archivedContractId !== original.contractId) {
        throw new Error("ReplaceText archived an unexpected contract.");
    }

- [ ] **Step 5: Run tests, example type-check, lint, and commit**

Run:

    rtk npx vitest run tests/unit/examples/application-example-sources.test.ts tests/unit/examples/application-fixture.test.ts
    rtk npm run examples:check
    rtk npx eslint examples/40-dar-upload.ts examples/50-create-and-exercise.ts tests/unit/examples/application-example-sources.test.ts --max-warnings=0
    rtk git add examples/40-dar-upload.ts examples/50-create-and-exercise.ts tests/unit/examples/application-example-sources.test.ts
    rtk git diff --cached --check
    rtk git commit -m "feat: add package and command examples"

Expected: PASS.

### Task 5: Add generated ledger read requests and active-contract query

**Files:**

- Create: examples/shared/ledger-requests.ts
- Create: tests/unit/examples/ledger-requests.test.ts
- Create: examples/60-query-active-contracts.ts
- Modify: tests/unit/examples/application-example-sources.test.ts

- [ ] **Step 1: Write failing generated-request and extraction tests**

Create tests/unit/examples/ledger-requests.test.ts:

    import { describe, expect, it } from "vitest";
    import {
        buildActiveContractsRequest,
        findActiveMessage,
    } from "../../../examples/shared/ledger-requests.js";

    const templateId = {
        packageId: "package",
        moduleName: "DebugPlayground",
        entityName: "Message",
    };

    describe("application example ledger requests", () => {
        it("builds generated EventFormat for one party and template", () => {
            const request = buildActiveContractsRequest({
                party: "Alice::1",
                templateId,
            });
            const filters = request.eventFormat?.filtersByParty["Alice::1"];
            expect(filters?.cumulative[0]).toMatchObject({
                identifierFilter: {
                    oneofKind: "templateFilter",
                    templateFilter: {
                        templateId,
                        includeCreatedEventBlob: false,
                    },
                },
            });
            expect(request.eventFormat?.verbose).toBe(true);
        });

        it("finds the expected active Message contract", () => {
            const createdEvent = {
                contractId: "#message",
                templateId,
                createArgument: {
                    fields: [
                        {
                            label: "text",
                            value: {
                                sum: {
                                    oneofKind: "text",
                                    text: "hello",
                                },
                            },
                        },
                    ],
                },
            };
            expect(
                findActiveMessage(
                    [{
                        contractEntry: {
                            oneofKind: "activeContract",
                            activeContract: { createdEvent },
                        },
                    }],
                    "#message",
                ),
            ).toEqual(createdEvent);
            expect(findActiveMessage([], "#missing")).toBeUndefined();
        });
    });

Extend the source-contract test to require:

    expect(source("60-query-active-contracts.ts")).toContain(
        "stateService.getActiveContractsPageAsync(",
    );

- [ ] **Step 2: Run tests and verify RED**

Run:

    rtk npx vitest run tests/unit/examples/ledger-requests.test.ts tests/unit/examples/application-example-sources.test.ts

Expected: FAIL because helper and script are absent.

- [ ] **Step 3: Implement the generated active-contract request**

Create examples/shared/ledger-requests.ts with public protobuf imports only:

    import type { ExampleTemplateId } from "./application-fixture.js";
    import { ledgerApiV2 } from
        "@distrohelena/canton-typescript-sdk/protobuf";

    export function buildActiveContractsRequest(init: {
        readonly party: string;
        readonly templateId: ExampleTemplateId;
    }): ledgerApiV2.GetActiveContractsPageRequest {
        return ledgerApiV2.GetActiveContractsPageRequest.create({
            eventFormat: ledgerApiV2.EventFormat.create({
                filtersByParty: {
                    [init.party]: ledgerApiV2.Filters.create({
                        cumulative: [{
                            identifierFilter: {
                                oneofKind: "templateFilter",
                                templateFilter: {
                                    templateId: init.templateId,
                                    includeCreatedEventBlob: false,
                                },
                            },
                        }],
                    }),
                },
                verbose: true,
            }),
        });
    }

Use the exported local ExampleTemplateId type from application-fixture.ts so no
src import is needed.

Implement findActiveMessage by unwrapping only contractEntry.oneofKind equal to activeContract, reading activeContract.createdEvent, and matching its non-empty contractId. Return the generated CreatedEvent or undefined.

- [ ] **Step 4: Implement 60-query-active-contracts.ts**

The script must:

1. load/upload the fixture and resolve an actor;
2. submit one Message create and keep its known contract ID;
3. build the generated EventFormat request visibly;
4. call stateService.getActiveContractsPageAsync directly with a RequestOptions timeout;
5. locate the exact contract ID and print contract ID plus createArgument payload;
6. fail if the known contract is absent;
7. dispose in finally.

Core read:

    const request = buildActiveContractsRequest({
        party: actor.party,
        templateId: fixture.templateId,
    });
    const response = await client.stateService.getActiveContractsPageAsync(
        request,
        new RequestOptions({ timeoutMs: exampleTimeoutMs() }),
    );
    const message = findActiveMessage(
        response.activeContracts,
        created.contractId,
    );
    if (message === undefined) {
        throw new Error(
            "Created Message " + created.contractId +
            " was not present in the active-contract snapshot.",
        );
    }

- [ ] **Step 5: Run tests, checks, and commit**

Run:

    rtk npx vitest run tests/unit/examples/ledger-requests.test.ts tests/unit/examples/application-example-sources.test.ts
    rtk npm run examples:check
    rtk npx eslint examples/shared/ledger-requests.ts examples/60-query-active-contracts.ts tests/unit/examples/ledger-requests.test.ts tests/unit/examples/application-example-sources.test.ts --max-warnings=0
    rtk git add examples/shared/ledger-requests.ts examples/60-query-active-contracts.ts tests/unit/examples/ledger-requests.test.ts tests/unit/examples/application-example-sources.test.ts
    rtk git diff --cached --check
    rtk git commit -m "feat: add active contract query example"

Expected: PASS.

### Task 6: Add bounded update streaming

**Files:**

- Modify: examples/shared/ledger-requests.ts
- Modify: tests/unit/examples/ledger-requests.test.ts
- Create: examples/61-stream-updates.ts
- Modify: tests/unit/examples/application-example-sources.test.ts

- [ ] **Step 1: Add failing update request and matching tests**

Add tests that:

- build GetUpdatesRequest with beginExclusive, an ACS_DELTA TransactionFormat, and the same party/template EventFormat;
- match only a transaction whose created event contract ID equals the expected ID;
- ignore offset checkpoints, reassignments, other templates, and other contract IDs;
- extract updateId, offset, and created contract ID from a matching transaction.

Representative assertions:

    const request = buildUpdatesRequest({
        beginExclusive: "42",
        party: "Alice::1",
        templateId,
    });
    expect(request).toMatchObject({
        beginExclusive: "42",
        descendingOrder: false,
        updateFormat: {
            includeTransactions: {
                transactionShape: ledgerApiV2.TransactionShape.ACS_DELTA,
            },
        },
    });

    expect(
        matchCreatedMessageUpdate({
            response: {
                update: {
                    oneofKind: "transaction",
                    transaction: {
                        updateId: "update-1",
                        offset: "43",
                        events: [{
                            event: {
                                oneofKind: "created",
                                created: {
                                    contractId: "#message",
                                    templateId,
                                },
                            },
                        }],
                    },
                },
            },
            contractId: "#message",
        }),
    ).toEqual({
        updateId: "update-1",
        offset: "43",
        contractId: "#message",
    });

Extend source-contract tests to require getLedgerEndAsync, getUpdatesAsync, RequestOptions, submitAndWaitForTransactionAsync, and iterator.return in 61-stream-updates.ts.

- [ ] **Step 2: Run tests and verify RED**

Run:

    rtk npx vitest run tests/unit/examples/ledger-requests.test.ts tests/unit/examples/application-example-sources.test.ts

Expected: FAIL for missing update exports and script.

- [ ] **Step 3: Implement update request and matcher**

Add buildUpdatesRequest to ledger-requests.ts using:

    return ledgerApiV2.GetUpdatesRequest.create({
        beginExclusive: init.beginExclusive,
        updateFormat: ledgerApiV2.UpdateFormat.create({
            includeTransactions: ledgerApiV2.TransactionFormat.create({
                eventFormat: buildEventFormat(init),
                transactionShape:
                    ledgerApiV2.TransactionShape.ACS_DELTA,
            }),
        }),
        descendingOrder: false,
    });

Refactor buildEventFormat as a private shared function used by both generated requests. Implement matchCreatedMessageUpdate with generated oneof checks; do not use casts to any.

- [ ] **Step 4: Implement race-free 61-stream-updates.ts**

Required ordering:

1. fixture/package/party setup;
2. get ledger end;
3. construct GetUpdatesRequest;
4. call getUpdatesAsync with new RequestOptions({ timeoutMs });
5. obtain the iterator before submitting;
6. start iterator.next() before command submission;
7. submit Message and extract its contract ID;
8. consume the already-started first result followed by iterator.next() until that ID appears;
9. explicitly call iterator.return() in finally;
10. dispose client in outer finally.

Use a single deadline supplied to getUpdatesAsync. Catch the SDK deadline error only to add the actionable SDK_EXAMPLE_TIMEOUT_MS message, preserving the original cause. Do not create an AbortController because the public API has no AbortSignal parameter.

Skeleton:

    const stream = client.updateService.getUpdatesAsync(
        buildUpdatesRequest({
            beginExclusive: ledgerEnd.offset,
            party: actor.party,
            templateId: fixture.templateId,
        }),
        new RequestOptions({ timeoutMs }),
    );
    const iterator = stream[Symbol.asyncIterator]();
    const firstUpdatePromise = iterator.next();
    try {
        const createResponse =
            await client.commandService.submitAndWaitForTransactionAsync(
                buildCreateMessageRequest(...),
            );
        const created = extractCreatedContract(createResponse);
        let next = await firstUpdatePromise;
        while (!next.done) {
            const match = matchCreatedMessageUpdate({
                response: next.value,
                contractId: created.contractId,
            });
            if (match !== undefined) {
                console.log(...);
                return;
            }
            next = await iterator.next();
        }
        throw new Error("Update stream ended before the Message appeared.");
    } finally {
        await iterator.return?.();
    }

- [ ] **Step 5: Run tests, checks, and commit**

Run:

    rtk npx vitest run tests/unit/examples/ledger-requests.test.ts tests/unit/examples/application-example-sources.test.ts
    rtk npm run examples:check
    rtk npx eslint examples/shared/ledger-requests.ts examples/61-stream-updates.ts tests/unit/examples/ledger-requests.test.ts tests/unit/examples/application-example-sources.test.ts --max-warnings=0
    rtk git add examples/shared/ledger-requests.ts examples/61-stream-updates.ts tests/unit/examples/ledger-requests.test.ts tests/unit/examples/application-example-sources.test.ts
    rtk git diff --cached --check
    rtk git commit -m "feat: add bounded update stream example"

Expected: PASS.

### Task 7: Add read-only user rights and topology inspection

**Files:**

- Create: examples/70-user-rights.ts
- Create: examples/80-topology-inspection.ts
- Modify: tests/unit/examples/application-example-sources.test.ts

- [ ] **Step 1: Add failing source-contract tests**

Require 70-user-rights.ts to contain getUserAsync, listUserRightsAsync, listUsersAsync, SDK_EXAMPLE_USER_ID, and no grantUserRightsAsync.

Require 80-topology-inspection.ts to contain resolveExamplePartyAsync,
discoverSynchronizerIdAsync, TopologyStoreSynchronizer, new
ListPartyToParticipantRequest, listPartyToParticipantAsync, participantUid,
permission, threshold, serial, validFrom, and validUntil.

- [ ] **Step 2: Run the source test and verify RED**

Run:

    rtk npx vitest run tests/unit/examples/application-example-sources.test.ts

Expected: FAIL because both scripts are absent.

- [ ] **Step 3: Implement read-only 70-user-rights.ts**

Use public SDK GetUserRequest, ListUserRightsRequest, ListUsersRequest and UserRightKind.

The script must:

1. trim SDK_EXAMPLE_USER_ID or default to ledger-api-user;
2. call getUserAsync and fail if user is missing;
3. call listUserRightsAsync;
4. paginate listUsersAsync until the target user is observed or nextPageToken is absent;
5. print user state and each right as type plus optional party;
6. never call grantUserRightsAsync;
7. dispose in finally.

Pagination:

    let pageToken: string | undefined;
    let listed = false;
    do {
        const page = await client.userManagementService.listUsersAsync(
            new ListUsersRequest({ pageToken, pageSize: 100 }),
        );
        listed ||= page.users.some((user) => user.id === userId);
        pageToken = page.nextPageToken;
    } while (!listed && pageToken);

- [ ] **Step 4: Implement 80-topology-inspection.ts**

The script must:

1. resolve or allocate a hosted party and warn if allocated;
2. discover synchronizer ID, respecting SDK_EXAMPLE_SYNCHRONIZER;
3. build a TopologyBaseQuery with headState: true whose TopologyStoreId is
   synchronizer and whose TopologyStoreSynchronizer id is the discovered
   synchronizer;
4. call topologyManagerReadService.listPartyToParticipantAsync with new
   ListPartyToParticipantRequest({ baseQuery, filterParty: actor.party });
5. select a result whose item.party equals the actor;
6. fail if no valid result or participants are empty;
7. print synchronizer, party, threshold, every participant UID and permission,
   context serial, validFrom, and validUntil;
8. dispose in finally.

Do not use a generated protobuf topology request here; this public service intentionally accepts the SDK DTO.

- [ ] **Step 5: Run tests, checks, and commit**

Run:

    rtk npx vitest run tests/unit/examples/application-example-sources.test.ts
    rtk npm run examples:check
    rtk npx eslint examples/70-user-rights.ts examples/80-topology-inspection.ts tests/unit/examples/application-example-sources.test.ts --max-warnings=0
    rtk git add examples/70-user-rights.ts examples/80-topology-inspection.ts tests/unit/examples/application-example-sources.test.ts
    rtk git diff --cached --check
    rtk git commit -m "feat: add user and topology read examples"

Expected: PASS.

### Task 8: Add runnable scripts and lifecycle documentation

**Files:**

- Modify: package.json
- Modify: README.md
- Modify: tests/unit/examples/application-example-sources.test.ts

- [ ] **Step 1: Add a failing package-script test**

In application-example-sources.test.ts read package.json and assert exactly:

    expect(packageJson.scripts).toMatchObject({
        "example:dar:upload":
            "npm run build && node --loader ts-node/esm examples/40-dar-upload.ts",
        "example:contract:create-exercise":
            "npm run build && node --loader ts-node/esm examples/50-create-and-exercise.ts",
        "example:contract:query":
            "npm run build && node --loader ts-node/esm examples/60-query-active-contracts.ts",
        "example:updates:stream":
            "npm run build && node --loader ts-node/esm examples/61-stream-updates.ts",
        "example:user:rights":
            "npm run build && node --loader ts-node/esm examples/70-user-rights.ts",
        "example:topology:party-hosting":
            "npm run build && node --loader ts-node/esm examples/80-topology-inspection.ts",
    });

Also assert packageJson.files does not contain examples.

- [ ] **Step 2: Run the focused test and verify RED**

Run:

    rtk npx vitest run tests/unit/examples/application-example-sources.test.ts

Expected: FAIL for missing scripts.

- [ ] **Step 3: Add only the six scripts to package.json**

Preserve the current user-owned version value. Add the exact six script entries from Step 1 after example:party:decentralized.

- [ ] **Step 4: Document the lifecycle**

Add a Standalone TypeScript examples section before Localnet launchers in README.md. Include:

- npm run examples:check;
- the six existing setup/party examples;
- the six new commands in numerical/lifecycle order;
- default endpoints 3901 and 3902;
- SDK_EXAMPLE_LEDGER_ENDPOINT, SDK_EXAMPLE_LEDGER_ADMIN_ENDPOINT, SDK_EXAMPLE_PARTICIPANT_ADMIN_ENDPOINT;
- shared and per-surface bearer token variables;
- SDK_EXAMPLE_PARTY, SDK_EXAMPLE_USER_ID, SDK_EXAMPLE_SYNCHRONIZER, SDK_EXAMPLE_TIMEOUT_MS;
- durable-state labels for package upload, party fallback, and contracts;
- DAR name, source checkout, Apache-2.0, and SHA-256;
- developed and live-tested against Participant 3.5.7, with the gRPC examples also verified on the isolated Participant 3.5.8 sidecar.

State that examples are repository-only and not shipped in the npm tarball.

- [ ] **Step 5: Run focused checks**

Run:

    rtk npx vitest run tests/unit/examples
    rtk npm run examples:check
    rtk npx eslint examples tests/unit/examples --max-warnings=0
    rtk git diff --check

Expected: PASS.

- [ ] **Step 6: Stage package.json without staging the user version edit**

Use interactive hunk selection because package.json already contains a user-owned change:

    rtk git add README.md tests/unit/examples/application-example-sources.test.ts
    rtk git add -p package.json

Answer no to the version hunk and yes only to the six-script hunk. Then verify:

    rtk git diff --cached -- package.json
    rtk git diff --cached --name-only

Expected: the staged package.json diff contains only scripts. The user version edit remains unstaged.

- [ ] **Step 7: Commit scripts and documentation**

Run:

    rtk git commit -m "docs: add application example walkthroughs"

Expected: README, source test, and only the package script hunk are committed.

### Task 9: Prove every example on Participant 3.5.7

**Files:**

- Modify only if a live failure exposes a real implementation defect.

- [ ] **Step 1: Verify participant versions and connectivity**

Use the existing localnet version probe or participant status calls. Record that the primary target reports Canton 3.5.7 before claiming compatibility.

- [ ] **Step 2: Run the DAR upload twice**

Run:

    rtk npm run example:dar:upload
    rtk npm run example:dar:upload

Expected: both PASS; the second prints already installed.

- [ ] **Step 3: Run all application examples**

Run sequentially:

    rtk npm run example:contract:create-exercise
    rtk npm run example:contract:query
    rtk npm run example:updates:stream
    rtk npm run example:user:rights
    rtk npm run example:topology:party-hosting

Expected:

- create/exercise prints non-empty, different original and replacement contract IDs;
- active-contract query prints its known contract ID and Message payload;
- update stream prints update ID, offset, and the submitted contract ID, then exits before the deadline;
- user rights prints ledger-api-user and at least one readable right;
- topology prints a PartyToParticipant result with non-empty participants, permission, threshold, serial/effective information.

- [ ] **Step 4: Repeat with a supplied party**

Set SDK_EXAMPLE_PARTY to a party created by a prior run and rerun create/exercise, query, stream, and topology. Expected: no fallback party allocation, all PASS.

- [ ] **Step 5: Fix live defects with TDD**

For each defect:

1. add the smallest focused regression test;
2. run it and verify RED;
3. implement the minimal fix;
4. rerun the focused test and live script;
5. commit a narrow fix commit.

Do not weaken assertions or convert a transport/protocol failure into a skip.

### Task 10: Prove gRPC compatibility on Participant 3.5.8

**Files:**

- Modify only if a version-specific live defect exposes a real SDK/example issue.

- [ ] **Step 1: Start or verify the isolated sidecar**

Run:

    rtk npm run start:local-participant-358

Expected: participant 3.5.8 is healthy on Ledger 8901 and Admin 8902, connected to the existing synchronizer, without modifying cn-quickstart.

- [ ] **Step 2: Export the printed example environment**

Use the exact exports printed by the launcher:

    export SDK_EXAMPLE_LEDGER_ENDPOINT=localhost:8901
    export SDK_EXAMPLE_LEDGER_ADMIN_ENDPOINT=localhost:8901
    export SDK_EXAMPLE_PARTICIPANT_ADMIN_ENDPOINT=localhost:8902
    export SDK_EXAMPLE_BEARER_TOKEN="<contents of .generated/participant-358/ledger-api-user.token>"

Never print the token in logs or commit it.

- [ ] **Step 3: Run the six examples on 3.5.8**

Run:

    rtk npm run example:dar:upload
    rtk npm run example:dar:upload
    rtk npm run example:contract:create-exercise
    rtk npm run example:contract:query
    rtk npm run example:updates:stream
    rtk npm run example:user:rights
    rtk npm run example:topology:party-hosting

Expected: all PASS, repeat DAR upload reports already installed, update stream terminates, and topology returns valid PartyToParticipant state.

- [ ] **Step 4: Preserve the same implementation across versions**

Verify no 3.5.7/3.5.8 branches, version checks, or duplicated scripts were added. Any unavoidable unsupported operation must be reported rather than silently skipped; the target acceptance is the same example implementation on both participants.

- [ ] **Step 5: Fix version defects with focused regression tests**

Use the same RED/GREEN/commit loop from Task 9. Keep fixes in SDK/shared helpers when they represent reusable version normalization; keep presentation-only behavior in examples.

- [ ] **Step 6: Re-prove the final tree on Participant 3.5.7 after any fix**

If Task 10 changed any source, test, configuration, or documentation file,
restore the 3.5.7 example environment and repeat every command from Task 9,
Steps 2 through 4. Then restore the 3.5.8 environment and repeat Task 10,
Step 3. Do not claim cross-version compatibility unless the exact same final
commit passes both sequences after the last implementation change.

Expected: all examples PASS on 3.5.7 and 3.5.8 from the same final commit.

### Task 11: Final verification and handoff

**Files:**

- No planned modifications.

- [ ] **Step 1: Run focused example checks**

Run:

    rtk npx vitest run tests/unit/examples
    rtk npm run examples:check
    rtk npx eslint examples tests/unit/examples --max-warnings=0

Expected: PASS.

- [ ] **Step 2: Run repository verification**

Run:

    rtk npm run build
    rtk npm test
    rtk npm run test:live
    rtk npm run verify:pack
    rtk git diff --check

Expected: build, full unit/integration suite, live suite, npm-pack verification, and whitespace check all PASS. Existing intentional skips must be reported by name; new examples must not create skips.

- [ ] **Step 3: Verify publication and asset integrity**

Run:

    rtk sha256sum examples/assets/canton-explorer-debug-playground-0.1.0.dar
    rtk npm pack --dry-run

Expected: SHA-256 is 307cf7c52ac2770d1d1a2c5e1ec56a78ab7c70e7809c0cfb419abadb93cc6e29 and npm pack excludes examples/assets and all examples.

- [ ] **Step 4: Audit git state**

Run:

    rtk git status --short
    rtk git diff --cached --name-only
    rtk git log --oneline -12

Expected: no task changes remain unstaged or staged. The user-owned package.json version edit and the four pre-existing untracked plans remain untouched.

- [ ] **Step 5: Request final code review**

Use @superpowers:requesting-code-review against the complete implementation diff. Resolve Critical or Important findings with focused tests and re-run the relevant verification.

- [ ] **Step 6: Report evidence**

Handoff must include:

- implementation commit hashes;
- exact focused/full/live commands and pass counts;
- exact DAR SHA-256;
- named outputs proving real contract IDs, active query, bounded stream, user rights, and PartyToParticipant;
- explicit Participant 3.5.7 and 3.5.8 version evidence;
- confirmation that one implementation ran on both;
- confirmation that user-owned dirty files were not staged.
