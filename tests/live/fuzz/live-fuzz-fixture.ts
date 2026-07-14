import { createHash } from "node:crypto";
import * as fc from "fast-check";
import {
    AllocatePartyRequest,
    CantonClient,
    CreateCommand,
    ExerciseCommand,
    GetActiveContractsPageRequest,
    GetPackageContentsRequest,
    GetPackageRequest,
    ListPackagesRequest,
    ParticipantListPackagesRequest,
    SubmitCommandRequest,
    TransportKind,
} from "../../../src/index.js";
import { DamlLfNodeKind, DamlLfPackageLoader } from "../../../src/daml-lf/index.js";
import {
    assertLiveMultiNodeConnectivityAsync,
} from "../runtime/live-connectivity-preflight.js";
import {
    LiveMultiNodeClients,
    createLiveMultiNodeClients,
    disposeLiveMultiNodeClientsAsync,
} from "../runtime/live-multi-node-client-factory.js";
import {
    LiveMultiNodeEnvironment,
    createLiveMultiNodeEnvironment,
} from "../runtime/live-multi-node-test-environment.js";
import { LiveFuzzConfig } from "./live-fuzz-config.js";

export const LIVE_IOU_TEMPLATE_ID = "Main:Iou";

const MAX_NUMERIC_INTEGER_DIGITS = 5;

const NUMERIC_FRACTION_DIGITS = 5;

const MAX_AMOUNT_SUFFIX = 99_999;

export interface LiveFuzzFixtureDefinition {
    readonly runId: string;
    readonly issuerParty: string;
    readonly ownerParty: string;
}

export interface LiveFuzzFixture extends LiveFuzzFixtureDefinition {
    readonly environment: LiveMultiNodeEnvironment;
    readonly clients: LiveMultiNodeClients;
    readonly issuerClient: CantonClient;
    readonly ownerClient: CantonClient;
    readonly templateId: typeof LIVE_IOU_TEMPLATE_ID;
    readonly createPayloadArbitrary: fc.Arbitrary<number>;
    readonly buildCreateRequest: (amountSuffix: number) => SubmitCommandRequest;
    readonly buildArchiveRequest: (contractId: string) => SubmitCommandRequest;
}

export function createAmountArbitrary(): fc.Arbitrary<number> {
    return fc.integer({ min: 0, max: MAX_AMOUNT_SUFFIX });
}

export function createRunAmount(runId: string, amountSuffix: number): string {
    if (!Number.isSafeInteger(amountSuffix) || amountSuffix < 0 || amountSuffix > MAX_AMOUNT_SUFFIX) {
        throw new Error(
            `Live fuzz amount suffix must be an integer between 0 and ${MAX_AMOUNT_SUFFIX}.`,
        );
    }

    const digestPrefix = createHash("sha256")
        .update(runId)
        .digest()
        .readUInt32BE(0);

    const integerComponent = digestPrefix % 100_000;

    const integerDigits = String(integerComponent).padStart(
        MAX_NUMERIC_INTEGER_DIGITS,
        "0",
    );

    const fractionDigits = String(amountSuffix).padStart(
        NUMERIC_FRACTION_DIGITS,
        "0",
    );

    return `${integerDigits}.${fractionDigits}`;
}

export function buildCreateRequest(init: {
    runId: string;
    issuerParty: string;
    ownerParty: string;
    amountSuffix: number;
}): SubmitCommandRequest {
    return new SubmitCommandRequest({
        applicationId: "sdk-live-fuzz",
        actAs: [init.issuerParty],
        command: new CreateCommand({
            templateId: LIVE_IOU_TEMPLATE_ID,
            payload: {
                issuer: init.issuerParty,
                owner: init.ownerParty,
                amount: Number(createRunAmount(init.runId, init.amountSuffix)),
            },
        }),
    });
}

export function buildArchiveRequest(init: {
    contractId: string;
    issuerParty: string;
}): SubmitCommandRequest {
    return new SubmitCommandRequest({
        applicationId: "sdk-live-fuzz",
        actAs: [init.issuerParty],
        command: new ExerciseCommand({
            templateId: LIVE_IOU_TEMPLATE_ID,
            contractId: init.contractId,
            choice: "Archive",
            argument: {},
        }),
    });
}

export function createPartyHint(runId: string, role: "issuer" | "owner"): string {
    const digest = createHash("sha256").update(runId).digest("hex").slice(0, 16);

    return `sdk-live-fuzz-${digest}-${role}`;
}

export async function createLiveFuzzFixtureAsync(
    config: LiveFuzzConfig,
): Promise<LiveFuzzFixture> {
    const environment = createLiveMultiNodeEnvironment({
        transportKind: TransportKind.grpc,
        nodeCount: 2,
        runId: config.runId,
    });

    await assertLiveMultiNodeConnectivityAsync(environment, {
        requiredNodeCount: 2,
    });

    const clients = createLiveMultiNodeClients(environment);

    const ownerClient = clients.secondary;

    if (ownerClient !== undefined) {
        try {
            await Promise.all([
                assertMainIouPackageAsync(clients.primary),
                assertMainIouPackageAsync(ownerClient),
            ]);

            const issuerParty = await allocateOrUsePartyAsync(
                clients.primary,
                config.issuerParty,
                createPartyHint(config.runId, "issuer"),
            );

            const ownerParty = await allocateOrUsePartyAsync(
                ownerClient,
                config.ownerParty,
                createPartyHint(config.runId, "owner"),
            );

            await Promise.all([
                assertPartyCanQueryMainIouAsync(clients.primary, issuerParty),
                assertPartyCanQueryMainIouAsync(ownerClient, ownerParty),
            ]);

            console.info(
                `Live fuzz fixture ready: runId=${config.runId}, issuer=${issuerParty}, owner=${ownerParty}`,
            );

            const definition = {
                runId: config.runId,
                issuerParty,
                ownerParty,
            } satisfies LiveFuzzFixtureDefinition;

            return {
                ...definition,
                environment,
                clients,
                issuerClient: clients.primary,
                ownerClient,
                templateId: LIVE_IOU_TEMPLATE_ID,
                createPayloadArbitrary: createAmountArbitrary(),
                buildCreateRequest: (amountSuffix) =>
                    buildCreateRequest({ ...definition, amountSuffix }),
                buildArchiveRequest: (contractId) =>
                    buildArchiveRequest({
                        contractId,
                        issuerParty,
                    }),
            };
        } catch (error) {
            await disposeLiveMultiNodeClientsAsync(clients);

            throw error;
        }
    }

    await disposeLiveMultiNodeClientsAsync(clients);

    throw new Error("Live fuzz fixture requires a second gRPC participant.");
}

async function allocateOrUsePartyAsync(
    client: CantonClient,
    configuredParty: string | undefined,
    partyIdHint: string,
): Promise<string> {
    if (configuredParty !== undefined) {
        return configuredParty;
    }

    const response = await client.partyManagementService.allocatePartyAsync(
        new AllocatePartyRequest({
            partyIdHint,
            displayName: partyIdHint,
        }),
    );

    return response.party;
}

async function assertMainIouPackageAsync(client: CantonClient): Promise<void> {
    const packageIds = (
        await client.packageService.listPackagesAsync(new ListPackagesRequest())
    ).packageIds;

    const participantPackages =
        await client.participantPackageService.listPackagesAsync(
            new ParticipantListPackagesRequest(),
        );

    const participantPackageIds = new Set(
        participantPackages.packageDescriptions.map(
            (description) => description.packageId,
        ),
    );

    const candidatePackageIds = packageIds.filter((packageId) =>
        participantPackageIds.has(packageId),
    );

    for (const packageId of candidatePackageIds) {
        const contents =
            await client.participantPackageService.getPackageContentsAsync(
                new GetPackageContentsRequest({ packageId }),
            );

        if (!contents.modules.some((module) => module.name === "Main")) {
            continue;
        }

        const packageResponse = await client.packageService.getPackageAsync(
            new GetPackageRequest({ packageId }),
        );

        const packageModel = new DamlLfPackageLoader().loadPackageOrThrow(
            packageResponse.archivePayload,
        );

        const hasIou = packageModel.modules.some((module) =>
            module.name === "Main"
            && module.definitions.some(
                (definition) =>
                    definition.nodeKind === DamlLfNodeKind.template
                    && "templateId" in definition
                    && definition.templateId.moduleName === "Main"
                    && definition.templateId.templateName === "Iou",
            ),
        );

        if (hasIou) {
            return;
        }
    }

    throw new Error(
        `Live fuzz fixture could not find ${LIVE_IOU_TEMPLATE_ID} in participant package set. Ledger packages: ${packageIds.join(", ") || "<none>"}.`,
    );
}

async function assertPartyCanQueryMainIouAsync(
    client: CantonClient,
    party: string,
): Promise<void> {
    await client.stateService.getActiveContractsPageAsync(
        new GetActiveContractsPageRequest({
            party,
            templateId: LIVE_IOU_TEMPLATE_ID,
        }),
    );
}
