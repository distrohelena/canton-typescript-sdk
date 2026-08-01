import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import {
    DamlLfNodeKind,
    DamlLfPackageLoader,
    DarArchiveLoader,
} from "@distrohelena/canton-typescript-sdk/daml-lf";
import {
    AllocatePartyRequest,
    CantonClient,
    CreateCommand,
    DamlParty,
    DamlRecord,
    ExerciseCommand,
    SubmitCommandRequest,
} from "@distrohelena/canton-typescript-sdk";
import { ledgerApiV2 } from "@distrohelena/canton-typescript-sdk/protobuf";
import { createPartyHint } from "./localnet.js";

export const EXAMPLE_DAR_SHA256 =
    "307cf7c52ac2770d1d1a2c5e1ec56a78ab7c70e7809c0cfb419abadb93cc6e29";

export interface ExampleTemplateId {
    readonly packageId: string;
    readonly packageName: string;
    readonly moduleName: string;
    readonly entityName: string;
}

export interface ExampleApplicationFixture {
    readonly darBytes: Uint8Array;
    readonly mainPackageId: string;
    readonly packageIds: readonly string[];
    readonly templateId: ExampleTemplateId;
}

const EXAMPLE_APPLICATION_ID = "canton-typescript-sdk-examples";

export function provePackageVisibility(init: {
    mainPackageId: string;
    before: readonly string[];
    after: readonly string[];
}): { alreadyInstalled: boolean } {
    if (!init.after.includes(init.mainPackageId)) {
        throw new Error(
            `The main package '${init.mainPackageId}' is not visible after uploading the example DAR.`,
        );
    }

    return { alreadyInstalled: init.before.includes(init.mainPackageId) };
}

export async function ensureExampleDarUploadedAsync(
    client: Pick<CantonClient, "packageService" | "packageManagementService">,
    fixture: ExampleApplicationFixture,
): Promise<{ alreadyInstalled: boolean }> {
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

export function buildCreateMessageRequest(init: {
    party: string;
    templateId: ExampleTemplateId;
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
    templateId: ExampleTemplateId;
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
            choiceArgument: new DamlRecord({ replacement: init.replacement }),
        }),
    });
}

export function extractCreatedContract(response: {
    events: readonly unknown[];
}): { contractId: string; event: Record<string, unknown> } {
    for (const responseEvent of response.events) {
        const event = eventPayload(responseEvent, "created");

        const contractId = contractIdFromEvent(event);

        if (contractId && event) {
            return { contractId, event };
        }
    }

    throw new Error(
        "Expected a created event with a non-empty contract ID in the command response.",
    );
}

export function extractReplacementContracts(response: {
    events: readonly unknown[];
}): {
    archivedContractId: string;
    replacementContractId: string;
} {
    let archivedContractId: string | undefined;

    let replacementContractId: string | undefined;

    for (const responseEvent of response.events) {
        if (!archivedContractId) {
            archivedContractId = contractIdFromEvent(
                eventPayload(responseEvent, "archived"),
            );
        }

        if (!replacementContractId) {
            replacementContractId = contractIdFromEvent(
                eventPayload(responseEvent, "created"),
            );
        }
    }

    if (!archivedContractId) {
        throw new Error(
            "Expected an archived event with a non-empty contract ID in the replacement response.",
        );
    } else if (!replacementContractId) {
        throw new Error(
            "Expected a created event with a non-empty contract ID in the replacement response.",
        );
    }

    return { archivedContractId, replacementContractId };
}

export async function resolveExamplePartyAsync(
    client: Pick<CantonClient, "partyManagementService">,
    environment: NodeJS.ProcessEnv = process.env,
): Promise<{ party: string; allocated: boolean }> {
    const configuredParty = environment.SDK_EXAMPLE_PARTY?.trim();

    if (configuredParty) {
        return { party: configuredParty, allocated: false };
    }

    const partyHint = createPartyHint({ prefix: "application-example" });

    const userId = environment.SDK_EXAMPLE_USER_ID?.trim() || "ledger-api-user";

    const response = await client.partyManagementService.allocatePartyAsync(
        new AllocatePartyRequest({
            partyIdHint: partyHint,
            displayName: partyHint,
            userId,
        }),
    );

    const party = response.party.trim();

    if (!party) {
        throw new Error("Party allocation returned an empty party identifier.");
    }

    return { party, allocated: true };
}

export async function loadExampleApplicationFixtureAsync(
    darUrl = new URL(
        "../assets/canton-explorer-debug-playground-0.1.0.dar",
        import.meta.url,
    ),
): Promise<ExampleApplicationFixture> {
    const darBytes = new Uint8Array(await readFile(fileURLToPath(darUrl)));

    const archive = await new DarArchiveLoader().loadDarOrThrowAsync(darBytes);

    const packageLoader = new DamlLfPackageLoader();

    const packageIds = [
        ...new Set(
            archive.packageEntries.map(
                (entry) =>
                    packageLoader.loadRawPackageOrThrow(entry.bytes).packageId,
            ),
        ),
    ];

    const mainPackage = packageLoader.loadPackageOrThrow(
        archive.mainPackageEntry.bytes,
    );

    const mainPackageId = mainPackage.packageId;

    const templateId: ExampleTemplateId = {
        packageId: mainPackageId,
        packageName: mainPackage.packageName,
        moduleName: "DebugPlayground",
        entityName: "Message",
    };

    const containsMessageTemplate = mainPackage.modules.some(
        (module) =>
            module.name === templateId.moduleName
            && module.definitions.some(
                (definition) =>
                    isDamlLfTemplateDefinition(definition)
                    && definition.templateId.moduleName === templateId.moduleName
                    && definition.templateId.templateName === templateId.entityName,
            ),
    );

    if (!containsMessageTemplate) {
        throw new Error(
            `Canton Explorer Debug Playground main package '${mainPackageId}' does not contain template '${templateId.moduleName}:${templateId.entityName}'.`,
        );
    }

    return {
        darBytes,
        mainPackageId,
        packageIds,
        templateId,
    };
}

function isDamlLfTemplateDefinition(
    definition: unknown,
): definition is {
    readonly nodeKind: DamlLfNodeKind.template;
    readonly templateId: {
        readonly moduleName: string;
        readonly templateName: string;
    };
} {
    if (typeof definition !== "object" || definition === null) {
        return false;
    }

    const candidate = definition as {
        readonly nodeKind?: unknown;
        readonly templateId?: unknown;
    };

    return (
        candidate.nodeKind === DamlLfNodeKind.template
        && typeof candidate.templateId === "object"
        && candidate.templateId !== null
        && "moduleName" in candidate.templateId
        && "templateName" in candidate.templateId
        && typeof candidate.templateId.moduleName === "string"
        && typeof candidate.templateId.templateName === "string"
    );
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null;
}

function eventPayload(
    value: unknown,
    kind: "created" | "archived",
): Record<string, unknown> | undefined {
    if (!isRecord(value) || !isRecord(value.event)) {
        return undefined;
    }

    const event = value.event;

    if (event.oneofKind !== kind || !isRecord(event[kind])) {
        return undefined;
    }

    return event[kind];
}

function contractIdFromEvent(
    event: Record<string, unknown> | undefined,
): string | undefined {
    if (typeof event?.contractId !== "string") {
        return undefined;
    }

    const contractId = event.contractId.trim();

    return contractId || undefined;
}
