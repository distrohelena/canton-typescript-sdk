import { GetContractRequest } from "../../core/types/requests/get-contract-request.js";
import { GetEventsByContractIdRequest } from "../../core/types/requests/get-events-by-contract-id-request.js";
import { GetContractResponse } from "../../core/types/responses/get-contract-response.js";
import { GetEventsByContractIdResponse } from "../../core/types/responses/get-events-by-contract-id-response.js";
import { ReplayStateHydrationException } from "../errors/replay-state-hydration.exception.js";
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

        for (const visibleContract of this.getVisibleCreatedContracts(snapshot)) {
            this.addPackageId(packageIds, visibleContract.templateId?.packageId);
            contracts.set(visibleContract.contractId, visibleContract);
        }

        for (const contractId of this.getRequiredContractIds(snapshot)) {
            const hydratedContract =
                await this.hydrateContractOrThrowAsync(contractId, snapshot);
            this.addPackageId(packageIds, hydratedContract.templateId?.packageId);
            contracts.set(contractId, hydratedContract);
        }

        this.addPackageId(packageIds, snapshot.entrypoint.templateId?.packageId);

        return {
            kind: snapshot.kind,
            offset: snapshot.offset,
            updateId: snapshot.updateId,
            actAs: [...(snapshot.actAs ?? [])],
            readAs: [...(snapshot.readAs ?? [])],
            entrypoint: snapshot.entrypoint,
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
                    payload: this.normalizeLedgerValue(
                        event.event.created.createArguments,
                    ),
                    rawCreatedEvent: event.event.created,
                    history: {
                        created: {
                            contractId: event.event.created.contractId,
                            templateId: event.event.created.templateId,
                            payload: this.normalizeLedgerValue(
                                event.event.created.createArguments,
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

    private async hydrateContractOrThrowAsync(
        contractId: string,
        snapshot: IReplayTransactionSnapshot,
    ): Promise<IHydratedReplayContract> {
        const queryingParties = this.getQueryingParties(snapshot);
        const contractResponse =
            await this.dependencies.contractService.getContractAsync(
                new GetContractRequest({
                    contractId,
                    queryingParties,
                }),
            );
        const createdEvent = this.asCreatedEvent(contractResponse.createdEvent);

        if (createdEvent?.contractId === undefined) {
            throw new ReplayStateHydrationException(
                `could not hydrate contract '${contractId}' from the ledger`,
            );
        }

        if (createdEvent.createArguments === undefined) {
            throw new ReplayStateHydrationException(
                `contract '${contractId}' did not expose a visible payload`,
            );
        }

        const eventHistory =
            await this.dependencies.eventQueryService.getEventsByContractIdAsync(
                new GetEventsByContractIdRequest({
                    contractId,
                    eventFormat: createReplayEventFormat(queryingParties),
                }),
            );
        const createdHistory = this.asCreatedEvent(
            eventHistory.created?.createdEvent,
        );
        const archivedHistory = this.asArchivedEvent(
            eventHistory.archived?.archivedEvent,
        );

        return {
            contractId,
            templateId: createdEvent.templateId,
            payload: this.normalizeLedgerValue(createdEvent.createArguments),
            rawCreatedEvent: createdEvent,
            synchronizerId: eventHistory.created?.synchronizerId,
            history: {
                created:
                    createdHistory === undefined
                        ? undefined
                        : {
                            contractId: createdHistory.contractId,
                            templateId: createdHistory.templateId,
                            payload: this.normalizeLedgerValue(
                                createdHistory.createArguments,
                            ),
                            rawEvent: createdHistory,
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

    private normalizeLedgerValue(value: unknown): unknown {
        if (Array.isArray(value)) {
            return value.map((item) => this.normalizeLedgerValue(item));
        }

        if (value === null || value === undefined || typeof value !== "object") {
            return value;
        }

        if ("sum" in value && this.isOneofValue(value.sum)) {
            return this.normalizeOneofValue(value.sum);
        }

        if (
            "fields" in value
            && Array.isArray(value.fields)
            && value.fields.every(
                (field) =>
                    field !== null
                    && typeof field === "object"
                    && "value" in field,
            )
        ) {
            return Object.fromEntries(
                value.fields.map((field, index) => [
                    this.getRecordFieldKey(field, index),
                    this.normalizeLedgerValue(field.value),
                ]),
            );
        }

        return Object.fromEntries(
            Object.entries(value)
                .filter(([, child]) => child !== undefined)
                .map(([key, child]) => [key, this.normalizeLedgerValue(child)]),
        );
    }

    private isOneofValue(
        value: unknown,
    ): value is { oneofKind?: string } & Record<string, unknown> {
        return value !== null && typeof value === "object";
    }

    private normalizeOneofValue(
        value: { oneofKind?: string } & Record<string, unknown>,
    ): unknown {
        switch (value.oneofKind) {
            case "unit":
                return null;
            case "bool":
            case "int64":
            case "date":
            case "timestamp":
            case "numeric":
            case "party":
            case "text":
            case "contractId":
                return value[value.oneofKind];
            case "optional":
                return this.normalizeOptionalValue(value.optional);
            case "list":
                return this.normalizeListValue(value.list);
            case "textMap":
                return this.normalizeTextMapValue(value.textMap);
            case "genMap":
                return this.normalizeGenMapValue(value.genMap);
            case "record":
                return this.normalizeLedgerValue(value.record);
            case "variant":
                return {
                    constructor: this.readObjectString(value.variant, "constructor"),
                    value: this.normalizeLedgerValue(
                        this.readObjectProperty(value.variant, "value"),
                    ),
                };
            case "enum":
                return this.readObjectString(value.enum, "constructor");
            default:
                return value;
        }
    }

    private normalizeOptionalValue(value: unknown): unknown {
        if (value === null || value === undefined || typeof value !== "object") {
            return undefined;
        }

        return this.normalizeLedgerValue(
            this.readObjectProperty(value, "value"),
        );
    }

    private normalizeListValue(value: unknown): unknown {
        if (value === null || value === undefined || typeof value !== "object") {
            return [];
        }

        const elements = this.readObjectProperty(value, "elements");
        return Array.isArray(elements)
            ? elements.map((element) => this.normalizeLedgerValue(element))
            : [];
    }

    private normalizeTextMapValue(value: unknown): unknown {
        if (value === null || value === undefined || typeof value !== "object") {
            return {};
        }

        const entries = this.readObjectProperty(value, "entries");

        if (!Array.isArray(entries)) {
            return {};
        }

        return Object.fromEntries(
            entries.map((entry) => [
                this.readObjectString(entry, "key"),
                this.normalizeLedgerValue(this.readObjectProperty(entry, "value")),
            ]),
        );
    }

    private normalizeGenMapValue(value: unknown): unknown {
        if (value === null || value === undefined || typeof value !== "object") {
            return [];
        }

        const entries = this.readObjectProperty(value, "entries");

        if (!Array.isArray(entries)) {
            return [];
        }

        return entries.map((entry) => ({
            key: this.normalizeLedgerValue(this.readObjectProperty(entry, "key")),
            value: this.normalizeLedgerValue(
                this.readObjectProperty(entry, "value"),
            ),
        }));
    }

    private getRecordFieldKey(field: unknown, index: number): string {
        if (
            field !== null
            && typeof field === "object"
            && "label" in field
            && typeof field.label === "string"
            && field.label.length > 0
        ) {
            return field.label;
        }

        return index.toString();
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
