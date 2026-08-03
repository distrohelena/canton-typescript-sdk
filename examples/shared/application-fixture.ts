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
    CommandDeduplicationPeriod,
    CreateAndExerciseCommand,
    CreateCommand,
    DamlParty,
    DamlRecord,
    ExerciseCommand,
    RequestOptions,
    SubmitCommandsRequest,
} from "@distrohelena/canton-typescript-sdk";
import { ledgerApiV2 } from "@distrohelena/canton-typescript-sdk/protobuf";
import { createPartyHint } from "./localnet.js";
import type { RequestOptionsFactory } from "./request-options-factory.js";

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
    requestOptionsFactory?: RequestOptionsFactory,
): Promise<{ alreadyInstalled: boolean }> {
    const beforeRequest = ledgerApiV2.ListPackagesRequest.create();

    const before = await callWithRequestOptions(
        requestOptionsFactory,
        options => client.packageService.listPackagesAsync(beforeRequest, options),
        () => client.packageService.listPackagesAsync(beforeRequest),
    );

    const uploadRequest = ledgerApiV2.admin.UploadDarFileRequest.create({
        darFile: fixture.darBytes,
    });

    await callWithRequestOptions(
        requestOptionsFactory,
        options =>
            client.packageManagementService.uploadDarFileAsync(
                uploadRequest,
                options,
            ),
        () => client.packageManagementService.uploadDarFileAsync(uploadRequest),
    );

    const afterRequest = ledgerApiV2.ListPackagesRequest.create();

    const after = await callWithRequestOptions(
        requestOptionsFactory,
        options => client.packageService.listPackagesAsync(afterRequest, options),
        () => client.packageService.listPackagesAsync(afterRequest),
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
    userId?: string;
    commandId?: string;
    deduplicationPeriod?: CommandDeduplicationPeriod;
}): SubmitCommandsRequest {
    return new SubmitCommandsRequest({
        applicationId: EXAMPLE_APPLICATION_ID,
        userId: init.userId,
        actAs: [init.party],
        readAs: [init.party],
        commands: [new CreateCommand({
            templateId: init.templateId,
            createArguments: new DamlRecord({
                sender: new DamlParty(init.party),
                recipient: new DamlParty(init.party),
                text: init.text,
            }),
        })],
        commandId: init.commandId,
        deduplicationPeriod: init.deduplicationPeriod,
    });
}

export function buildReplaceMessageTextRequest(init: {
    party: string;
    templateId: ExampleTemplateId;
    contractId: string;
    replacement: string;
    commandId?: string;
    deduplicationPeriod?: CommandDeduplicationPeriod;
}): SubmitCommandsRequest {
    return new SubmitCommandsRequest({
        applicationId: EXAMPLE_APPLICATION_ID,
        actAs: [init.party],
        readAs: [init.party],
        commands: [new ExerciseCommand({
            templateId: init.templateId,
            contractId: init.contractId,
            choice: "ReplaceText",
            choiceArgument: new DamlRecord({ replacement: init.replacement }),
        })],
        commandId: init.commandId,
        deduplicationPeriod: init.deduplicationPeriod,
    });
}

export function buildCreateAndReplaceMessageTextRequest(init: {
    party: string;
    templateId: ExampleTemplateId;
    text: string;
    replacement: string;
    commandId?: string;
    deduplicationPeriod?: CommandDeduplicationPeriod;
}): SubmitCommandsRequest {
    return new SubmitCommandsRequest({
        applicationId: EXAMPLE_APPLICATION_ID,
        actAs: [init.party],
        readAs: [init.party],
        commands: [new CreateAndExerciseCommand({
            templateId: init.templateId,
            createArguments: new DamlRecord({
                sender: new DamlParty(init.party),
                recipient: new DamlParty(init.party),
                text: init.text,
            }),
            choice: "ReplaceText",
            choiceArgument: new DamlRecord({ replacement: init.replacement }),
        })],
        commandId: init.commandId,
        deduplicationPeriod: init.deduplicationPeriod,
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

export function extractSoleCreatedContract(response: {
    events: readonly unknown[];
}): { contractId: string; event: Record<string, unknown> } {
    const createdContracts: Array<{
        contractId: string;
        event: Record<string, unknown>;
    }> = [];

    for (const responseEvent of response.events) {
        const event = eventPayload(responseEvent, "created");

        const contractId = contractIdFromEvent(event);

        if (contractId !== undefined && event !== undefined) {
            createdContracts.push({ contractId, event });
        }
    }

    if (createdContracts.length === 0) {
        throw new Error(
            "Expected a created event with a non-empty contract ID in the command response.",
        );
    } else if (createdContracts.length !== 1) {
        throw new Error(
            "Expected exactly one created event with a non-empty contract ID in the command response.",
        );
    }

    return createdContracts[0]!;
}

export function extractReplacementContracts(response: {
    events: readonly unknown[];
}): {
    archivedContractId: string;
    replacementContractId: string;
} {
    const archivedContractIds: string[] = [];

    const replacementContractIds: string[] = [];

    for (const responseEvent of response.events) {
        const archivedContractId = contractIdFromEvent(
            eventPayload(responseEvent, "archived"),
        );

        if (archivedContractId !== undefined) {
            archivedContractIds.push(archivedContractId);
        }

        const replacementContractId = contractIdFromEvent(
            eventPayload(responseEvent, "created"),
        );

        if (replacementContractId !== undefined) {
            replacementContractIds.push(replacementContractId);
        }
    }

    if (archivedContractIds.length === 0) {
        throw new Error(
            "Expected an archived event with a non-empty contract ID in the replacement response.",
        );
    } else if (archivedContractIds.length !== 1) {
        throw new Error(
            "Expected exactly one archived event with a non-empty contract ID in the replacement response.",
        );
    } else if (replacementContractIds.length === 0) {
        throw new Error(
            "Expected a created event with a non-empty contract ID in the replacement response.",
        );
    } else if (replacementContractIds.length !== 1) {
        throw new Error(
            "Expected exactly one created event with a non-empty contract ID in the replacement response.",
        );
    }

    return {
        archivedContractId: archivedContractIds[0]!,
        replacementContractId: replacementContractIds[0]!,
    };
}

export function readCreatedMessageText(event: {
    contractId: string;
    createArguments?: unknown;
}): string {
    const text = ledgerApiV2.Record.is(event.createArguments)
        ? event.createArguments.fields.find(field => field.label === "text")
            ?.value
        : undefined;

    if (text?.sum.oneofKind !== "text") {
        throw new Error(
            `Created Message '${event.contractId}' did not contain the expected text field.`,
        );
    }

    return text.sum.text;
}

export function assertExactCreatedMessagePayload(init: {
    readonly event: {
        readonly contractId: string;
        readonly createArguments?: unknown;
    };
    readonly sender: string;
    readonly recipient: string;
    readonly text: string;
    readonly requireFieldLabels?: boolean;
}): void {
    if (!ledgerApiV2.Record.is(init.event.createArguments)) {
        throw exactMessagePayloadError(init.event.contractId);
    }

    const expectedFields = [
        { label: "sender", kind: "party", value: init.sender },
        { label: "recipient", kind: "party", value: init.recipient },
        { label: "text", kind: "text", value: init.text },
    ] as const;

    if (init.event.createArguments.fields.length !== expectedFields.length) {
        throw exactMessagePayloadError(init.event.contractId);
    }

    const fields = init.event.createArguments.fields;

    const labelsAreAllBlank = fields.every(field => field.label === "");

    const labelsAreAllPresent = fields.every(field => field.label !== "");

    if (
        (!labelsAreAllBlank && !labelsAreAllPresent)
        || (init.requireFieldLabels === true && !labelsAreAllPresent)
    ) {
        throw exactMessagePayloadError(init.event.contractId);
    }

    for (const [index, expected] of expectedFields.entries()) {
        const field = labelsAreAllBlank
            ? fields[index]
            : fields.find(candidate => candidate.label === expected.label);

        if (field?.value === undefined) {
            throw exactMessagePayloadError(init.event.contractId);
        } else if (expected.kind === "party") {
            if (
                field.value.sum.oneofKind !== "party"
                || field.value.sum.party !== expected.value
            ) {
                throw exactMessagePayloadError(init.event.contractId);
            }
        } else if (
            field.value.sum.oneofKind !== "text"
            || field.value.sum.text !== expected.value
        ) {
            throw exactMessagePayloadError(init.event.contractId);
        }
    }
}

export async function resolveExamplePartyAsync(
    client: Pick<CantonClient, "partyManagementService">,
    environment: NodeJS.ProcessEnv = process.env,
    requestOptionsFactory?: RequestOptionsFactory,
): Promise<{ party: string; allocated: boolean }> {
    const configuredParty = environment.SDK_EXAMPLE_PARTY?.trim();

    if (configuredParty) {
        return { party: configuredParty, allocated: false };
    }

    const partyHint = createPartyHint({ prefix: "application-example" });

    const configuredUserId = environment.SDK_EXAMPLE_USER_ID;

    const userId =
        configuredUserId !== undefined && configuredUserId.trim().length > 0
            ? configuredUserId
            : "ledger-api-user";

    const request = new AllocatePartyRequest({
        partyIdHint: partyHint,
        displayName: partyHint,
        userId,
    });

    const response = await callWithRequestOptions(
        requestOptionsFactory,
        options => client.partyManagementService.allocatePartyAsync(request, options),
        () => client.partyManagementService.allocatePartyAsync(request),
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

function exactMessagePayloadError(contractId: string): Error {
    return new Error(
        `Created Message '${contractId}' did not contain the exact Message payload.`,
    );
}

function callWithRequestOptions<T>(
    requestOptionsFactory: RequestOptionsFactory | undefined,
    withOptions: (options: RequestOptions) => Promise<T>,
    withoutOptions: () => Promise<T>,
): Promise<T> {
    if (requestOptionsFactory === undefined) {
        return withoutOptions();
    }

    return withOptions(requestOptionsFactory.createRequestOptions());
}
