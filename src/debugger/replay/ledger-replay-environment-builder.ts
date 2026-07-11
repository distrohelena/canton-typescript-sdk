import { GetContractRequest } from "../../core/types/requests/get-contract-request.js";
import { GetEventsByContractIdRequest } from "../../core/types/requests/get-events-by-contract-id-request.js";
import { GetContractResponse } from "../../core/types/responses/get-contract-response.js";
import { GetEventsByContractIdResponse } from "../../core/types/responses/get-events-by-contract-id-response.js";
import { ReplayStateHydrationException } from "../errors/replay-state-hydration.exception.js";
import {
    attachReplayRecordId,
    collectReplayLedgerContractIds,
    normalizeReplayLedgerValue,
} from "./replay-ledger-value-normalizer.js";
import { ReplayEntrypoint } from "./replay-entrypoint.js";

interface IReplayContractService {
    getContractAsync(
        request: GetContractRequest,
    ): Promise<GetContractResponse>;
}

interface IReplayEventQueryService {
    getEventsByContractIdAsync(
        request: GetEventsByContractIdRequest,
    ): Promise<GetEventsByContractIdResponse>;
}

interface IReplayIdentifier {
    packageId?: string;
    moduleName?: string;
    entityName?: string;
}

interface IReplayCreatedEvent {
    contractId?: string;
    templateId?: IReplayIdentifier;
    createArguments?: unknown;
}

interface IReplayExercisedEvent {
    contractId?: string;
    templateId?: IReplayIdentifier;
    choice?: string;
    choiceArgument?: unknown;
}

interface IReplayArchivedEvent {
    contractId?: string;
    templateId?: IReplayIdentifier;
}

interface IReplayTransactionEvent {
    event?: {
        oneofKind?: string;
        created?: IReplayCreatedEvent;
        exercised?: IReplayExercisedEvent;
        archived?: IReplayArchivedEvent;
    };
}

export interface IReplayTransactionSnapshot {
    readonly kind: "transaction";
    readonly offset: string;
    readonly updateId?: string;
    readonly actAs?: readonly string[];
    readonly readAs?: readonly string[];
    readonly events: readonly IReplayTransactionEvent[];
    readonly entrypoint: ReplayEntrypoint;
}

export interface IHydratedReplayHistoryEntry {
    readonly contractId?: string;
    readonly templateId?: IReplayIdentifier;
    readonly payload?: unknown;
    readonly rawEvent?: unknown;
}

export interface IHydratedReplayContract {
    readonly contractId: string;
    readonly templateId?: IReplayIdentifier;
    readonly payload: unknown;
    readonly rawCreatedEvent?: unknown;
    readonly synchronizerId?: string;
    readonly history: {
        readonly created?: IHydratedReplayHistoryEntry;
        readonly archived?: IHydratedReplayHistoryEntry;
    };
}

export interface ILedgerReplayEnvironment {
    readonly kind: "transaction";
    readonly offset: string;
    readonly updateId?: string;
    readonly actAs: readonly string[];
    readonly readAs: readonly string[];
    readonly entrypoint: ReplayEntrypoint;
    readonly contracts: ReadonlyMap<string, IHydratedReplayContract>;
    readonly packageIds: readonly string[];
}

export class LedgerReplayEnvironmentBuilder {
    public constructor(
        private readonly dependencies: {
            contractService: IReplayContractService;
            eventQueryService: IReplayEventQueryService;
            queryingParties?: readonly string[];
        },
    ) {}

    public async buildOrThrowAsync(
        snapshot: IReplayTransactionSnapshot,
    ): Promise<ILedgerReplayEnvironment> {
        const packageIds = new Set<string>();
        const contracts = new Map<string, IHydratedReplayContract>();
        const pendingContractIds = new Set<string>(
            this.getRequiredContractIds(snapshot),
        );
        const normalizedEntrypointArgument = normalizeReplayLedgerValue(
            snapshot.entrypoint.argument,
        );

        for (const visibleContract of this.getVisibleCreatedContracts(snapshot)) {
            this.addPackageId(packageIds, visibleContract.templateId?.packageId);
            contracts.set(visibleContract.contractId, visibleContract);
            this.addReferencedContractIds(
                pendingContractIds,
                visibleContract.payload,
            );
        }

        this.addReferencedContractIds(
            pendingContractIds,
            normalizedEntrypointArgument,
        );

        while (pendingContractIds.size > 0) {
            const contractId = pendingContractIds.values().next().value as
                | string
                | undefined;

            if (contractId === undefined) {
                break;
            }

            pendingContractIds.delete(contractId);

            if (contracts.has(contractId)) {
                continue;
            }

            const hydratedContract =
                await this.hydrateContractOrThrowAsync(contractId, snapshot);
            this.addPackageId(packageIds, hydratedContract.templateId?.packageId);
            contracts.set(contractId, hydratedContract);
            this.addReferencedContractIds(
                pendingContractIds,
                hydratedContract.payload,
            );
        }

        this.addPackageId(packageIds, snapshot.entrypoint.templateId?.packageId);

        return {
            kind: snapshot.kind,
            offset: snapshot.offset,
            updateId: snapshot.updateId,
            actAs: [...(snapshot.actAs ?? [])],
            readAs: [...(snapshot.readAs ?? [])],
            entrypoint: new ReplayEntrypoint({
                kind: snapshot.entrypoint.kind,
                templateId: snapshot.entrypoint.templateId,
                contractId: snapshot.entrypoint.contractId,
                choice: snapshot.entrypoint.choice,
                argument: normalizedEntrypointArgument,
            }),
            contracts,
            packageIds: [...packageIds].sort(),
        };
    }

    private getVisibleCreatedContracts(
        snapshot: IReplayTransactionSnapshot,
    ): IHydratedReplayContract[] {
        return snapshot.events.flatMap((event): IHydratedReplayContract[] => {
            if (
                event.event?.oneofKind !== "created"
                || event.event.created?.contractId === undefined
            ) {
                return [];
            }

            return [
                {
                    contractId: event.event.created.contractId,
                    templateId: event.event.created.templateId,
                    payload: attachReplayRecordId(
                        normalizeReplayLedgerValue(
                            event.event.created.createArguments,
                        ),
                        event.event.created.templateId === undefined
                            ? undefined
                            : {
                                packageId: event.event.created.templateId.packageId,
                                moduleName: event.event.created.templateId.moduleName,
                                entityName: event.event.created.templateId.entityName,
                            },
                    ),
                    rawCreatedEvent: event.event.created,
                    history: {
                        created: {
                            contractId: event.event.created.contractId,
                            templateId: event.event.created.templateId,
                            payload: attachReplayRecordId(
                                normalizeReplayLedgerValue(
                                    event.event.created.createArguments,
                                ),
                                event.event.created.templateId === undefined
                                    ? undefined
                                    : {
                                        packageId: event.event.created.templateId.packageId,
                                        moduleName: event.event.created.templateId.moduleName,
                                        entityName: event.event.created.templateId.entityName,
                                    },
                            ),
                            rawEvent: event.event.created,
                        },
                    },
                },
            ];
        });
    }

    private getRequiredContractIds(
        snapshot: IReplayTransactionSnapshot,
    ): readonly string[] {
        const contractIds = new Set<string>();

        if (
            snapshot.entrypoint.kind === "exercise"
            && snapshot.entrypoint.contractId !== undefined
        ) {
            contractIds.add(snapshot.entrypoint.contractId);
        }

        for (const event of snapshot.events) {
            const contractId = event.event?.exercised?.contractId;

            if (contractId !== undefined) {
                contractIds.add(contractId);
            }
        }

        return [...contractIds];
    }

    private addReferencedContractIds(
        contractIds: Set<string>,
        value: unknown,
    ): void {
        for (const contractId of collectReplayLedgerContractIds(value)) {
            if (contractId.length > 0) {
                contractIds.add(contractId);
            }
        }
    }

    private async hydrateContractOrThrowAsync(
        contractId: string,
        snapshot: IReplayTransactionSnapshot,
    ): Promise<IHydratedReplayContract> {
        const queryingParties = this.getQueryingParties(snapshot);
        let contractResponse: GetContractResponse | undefined;

        try {
            contractResponse =
                await this.dependencies.contractService.getContractAsync(
                    new GetContractRequest({
                        contractId,
                        queryingParties,
                    }),
                );
        }
        catch {
            contractResponse = undefined;
        }

        const eventHistory =
            await this.dependencies.eventQueryService.getEventsByContractIdAsync(
                new GetEventsByContractIdRequest({
                    contractId,
                    eventFormat: createReplayEventFormat(queryingParties),
                }),
            );
        const createdEvent = this.asCreatedEvent(contractResponse?.createdEvent);
        const createdHistory = this.asCreatedEvent(
            eventHistory.created?.createdEvent,
        );
        const archivedHistory = this.asArchivedEvent(
            eventHistory.archived?.archivedEvent,
        );
        const materializedCreatedEvent = [
            createdEvent,
            createdHistory,
        ].find(
            (event) =>
                event?.contractId !== undefined
                && event.createArguments !== undefined,
        );

        if (materializedCreatedEvent?.contractId === undefined) {
            throw new ReplayStateHydrationException(
                `could not hydrate contract '${contractId}' from the ledger`,
            );
        }

        if (materializedCreatedEvent.createArguments === undefined) {
            throw new ReplayStateHydrationException(
                `contract '${contractId}' did not expose a visible payload`,
            );
        }

        return {
            contractId,
            templateId: materializedCreatedEvent.templateId,
            payload: attachReplayRecordId(
                normalizeReplayLedgerValue(materializedCreatedEvent.createArguments),
                materializedCreatedEvent.templateId === undefined
                    ? undefined
                    : {
                        packageId: materializedCreatedEvent.templateId.packageId,
                        moduleName: materializedCreatedEvent.templateId.moduleName,
                        entityName: materializedCreatedEvent.templateId.entityName,
                    },
            ),
            rawCreatedEvent: materializedCreatedEvent,
            synchronizerId: eventHistory.created?.synchronizerId,
            history: {
                created:
                    (createdHistory ?? materializedCreatedEvent) === undefined
                        ? undefined
                        : {
                            contractId:
                                (createdHistory ?? materializedCreatedEvent)
                                    .contractId,
                            templateId:
                                (createdHistory ?? materializedCreatedEvent)
                                    .templateId,
                            payload: attachReplayRecordId(
                                normalizeReplayLedgerValue(
                                    (createdHistory ?? materializedCreatedEvent)
                                        .createArguments,
                                ),
                                (createdHistory ?? materializedCreatedEvent)
                                    .templateId === undefined
                                    ? undefined
                                    : {
                                        packageId:
                                            (
                                                createdHistory
                                                ?? materializedCreatedEvent
                                            ).templateId?.packageId,
                                        moduleName:
                                            (
                                                createdHistory
                                                ?? materializedCreatedEvent
                                            ).templateId?.moduleName,
                                        entityName:
                                            (
                                                createdHistory
                                                ?? materializedCreatedEvent
                                            ).templateId?.entityName,
                                    },
                            ),
                            rawEvent: createdHistory ?? materializedCreatedEvent,
                        },
                archived:
                    archivedHistory === undefined
                        ? undefined
                        : {
                            contractId: archivedHistory.contractId,
                            templateId: archivedHistory.templateId,
                            rawEvent: archivedHistory,
                        },
            },
        };
    }

    private getQueryingParties(
        snapshot: IReplayTransactionSnapshot,
    ): readonly string[] {
        const configuredParties = this.dependencies.queryingParties ?? [];

        if (configuredParties.length > 0) {
            return [...new Set(configuredParties)];
        }

        return [
            ...new Set([...(snapshot.actAs ?? []), ...(snapshot.readAs ?? [])]),
        ];
    }

    private addPackageId(packageIds: Set<string>, packageId?: string): void {
        if (packageId !== undefined && packageId.length > 0) {
            packageIds.add(packageId);
        }
    }

    private asCreatedEvent(value: unknown): IReplayCreatedEvent | undefined {
        if (value === undefined || value === null || typeof value !== "object") {
            return undefined;
        }

        return value as IReplayCreatedEvent;
    }

    private asArchivedEvent(value: unknown): IReplayArchivedEvent | undefined {
        if (value === undefined || value === null || typeof value !== "object") {
            return undefined;
        }

        return value as IReplayArchivedEvent;
    }

    private readObjectProperty(
        value: unknown,
        propertyName: string,
    ): unknown {
        if (value === null || value === undefined || typeof value !== "object") {
            return undefined;
        }

        return (value as Record<string, unknown>)[propertyName];
    }

    private readObjectString(value: unknown, propertyName: string): string {
        const property = this.readObjectProperty(value, propertyName);
        return typeof property === "string" ? property : "";
    }
}

function createReplayEventFormat(
    visibleParties?: readonly string[],
): Record<string, unknown> {
    const wildcardFilter = {
        cumulative: [
            {
                identifierFilter: {
                    oneofKind: "wildcardFilter",
                    wildcardFilter: {
                        includeCreatedEventBlob: true,
                    },
                },
            },
        ],
    };

    if (Array.isArray(visibleParties) && visibleParties.length > 0) {
        return {
            filtersByParty: Object.fromEntries(
                [...new Set(visibleParties)]
                    .filter((party) => typeof party === "string" && party.length > 0)
                    .map((party) => [party, wildcardFilter]),
            ),
            verbose: true,
        };
    }

    return {
        filtersByParty: {},
        filtersForAnyParty: wildcardFilter,
        verbose: true,
    };
}
