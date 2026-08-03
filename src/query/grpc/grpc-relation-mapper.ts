import { ValidationError } from "../../core/errors/validation-error.js";
import { immutableQueryValue } from "../canonical/query-dataset.js";
import type { ContractRow, EventRow, ExerciseRow, TransactionRow } from "../model-types.js";
import type { CreatedEvent, Event, ExercisedEvent } from "../../transports/grpc/generated/canton/com/daml/ledger/api/v2/event.js";
import type { Transaction } from "../../transports/grpc/generated/canton/com/daml/ledger/api/v2/transaction.js";
import type { GetActiveContractsResponse } from "../../transports/grpc/generated/canton/com/daml/ledger/api/v2/state_service.js";
import { mapGrpcQueryValue } from "./grpc-query-value-mapper.js";

type TemplateId = NonNullable<CreatedEvent["templateId"]>;

export interface GrpcQueryTypeIdentity {
    readonly pk: string;
    readonly templateId: Readonly<{ packageId: string; moduleName: string; entityName: string }>;
    readonly packageId: string;
    readonly choice?: string;
    readonly consuming?: boolean;
}

export interface GrpcQueryPackageIdentity {
    readonly pk: string;
    readonly id: string;
}

export interface GrpcQueryCreationIdentity {
    readonly contractId: string;
    readonly offset: string;
    readonly templateId: Readonly<{ packageId: string; moduleName: string; entityName: string }>;
    readonly creationPackageId: string;
    readonly representativePackageId: string | null;
    readonly payload: unknown;
    readonly witnesses: readonly string[];
    readonly createdAt: Date;
}

/**
 * The Task 5 transport-neutral core. Task 6 enriches its identity descriptors with
 * package metadata and creates the complete QueryDataset/edges; public rows never
 * receive private PQS join columns.
 */
export interface GrpcQueryRelationFragment {
    readonly contracts: readonly ContractRow[];
    readonly transactions: readonly TransactionRow[];
    readonly events: readonly EventRow[];
    readonly exercises: readonly ExerciseRow[];
    readonly typeIdentities: readonly GrpcQueryTypeIdentity[];
    readonly packageIdentities: readonly GrpcQueryPackageIdentity[];
    readonly creationIdentities: readonly GrpcQueryCreationIdentity[];
}

interface PendingCreatedEvent {
    readonly transaction: Transaction;
    readonly event: CreatedEvent;
    readonly kind: "created";
    readonly identity: string;
}
interface PendingExercisedEvent {
    readonly transaction: Transaction;
    readonly event: ExercisedEvent;
    readonly kind: "exercised";
    readonly identity: string;
}
type PendingEvent = PendingCreatedEvent | PendingExercisedEvent;

/** Materializes ledger-effects transactions and optionally seeds still-active ACS contracts. */
export function mapGrpcQueryRelationFragment(
    source: readonly Transaction[],
    activeContracts: readonly GetActiveContractsResponse[] = [],
): GrpcQueryRelationFragment {
    const transactions = [...source].sort((left, right) => compareOffset(left.offset, right.offset));

    const seenOffsets = new Set<string>();

    const pending: PendingEvent[] = [];

    for (const transaction of transactions) {
        validOffset(transaction.offset, "transaction offset");

        validateTransaction(transaction);

        if (seenOffsets.has(transaction.offset)) {
            throw new ValidationError(`gRPC query has duplicate transaction offset ${transaction.offset}`);
        }

        seenOffsets.add(transaction.offset);

        for (const event of transaction.events) {
            pending.push(pendingEvent(transaction, event));
        }
    }

    const eventIdentities = new Set<string>();

    for (const event of pending) {
        if (eventIdentities.has(event.identity)) {
            throw new ValidationError(`gRPC query has duplicate event ${eventId(event.event)}`);
        }

        eventIdentities.add(event.identity);
    }

    const registry = keyRegistry([
        ...pending.map((item) => item.identity),
        ...pending.flatMap((item) => identitiesFor(item.event)),
        ...activeCreatedEvents(activeContracts).flatMap(identitiesFor),
    ]);

    const transactionRows = transactions.map(mapTransaction);

    const eventRows = pending
        .slice()
        .sort((left, right) => compareOffset(left.transaction.offset, right.transaction.offset) || nodeId(left.event) - nodeId(right.event))
        .map((item) => ({ pk: registry.get(item.identity)!, txIx: item.transaction.offset, eventId: eventId(item.event), type: item.kind }));

    const eventPkByIdentity = new Map(pending.map((item) => [item.identity, registry.get(item.identity)!]));

    const contracts = new Map<string, ContractRow>();

    const creations = new Map<string, GrpcQueryCreationIdentity>();

    const exerciseRows: ExerciseRow[] = [];

    for (const item of pending.sort((left, right) => compareOffset(left.transaction.offset, right.transaction.offset) || nodeId(left.event) - nodeId(right.event))) {
        if (item.kind === "created") {
            addCreatedContract(contracts, creations, item.event, item.transaction.offset);
        } else {
            const target = contracts.get(item.event.contractId);

            if (target === undefined) {
                throw new ValidationError(`gRPC query exercise references unknown contract ${item.event.contractId}`);
            } else if (!target.active) {
                throw new ValidationError(`gRPC query exercise archives already archived contract ${item.event.contractId}`);
            }

            const template = requiredTemplate(item.event.templateId, "exercise template");

            exerciseRows.push({
                tpePk: registry.get(exerciseIdentity(template, item.event.choice, item.event.consuming))!,
                contractTpePk: registry.get(contractIdentity(target.templateId))!,
                exerciseEventPk: eventPkByIdentity.get(item.identity)!,
                exercisedAtIx: item.transaction.offset,
                contractId: item.event.contractId,
                argument: mapRequiredValue(item.event.choiceArgument, "exercise argument"),
                result: item.event.exerciseResult === undefined ? null : mapGrpcQueryValue(item.event.exerciseResult),
                redactionId: null,
                packagePk: registry.get(packageIdentity(template.packageId))!,
                controllers: immutableStrings(item.event.actingParties, "exercise acting parties", true),
                lastDescendantNodeId: String(validNodeId(item.event.lastDescendantNodeId, "last descendant node id")),
                witnesses: immutableStrings(item.event.witnessParties, "exercise witnesses", true),
            });

            if (item.event.consuming) {
                contracts.set(target.contractId, { ...target, archivedEventOffset: item.transaction.offset, archivedAt: timestamp(item.transaction.effectiveAt, "transaction effective time", true), active: false });
            }
        }
    }

    const activeCreations = activeCreatedEvents(activeContracts);

    const activeContractIds = new Set<string>();

    for (const created of activeCreations) {
        if (activeContractIds.has(created.contractId)) {
            throw new ValidationError(`gRPC query has duplicate ACS contract ${created.contractId}`);
        }

        activeContractIds.add(created.contractId);

        const existing = contracts.get(created.contractId);

        const candidate = creationDescriptor(created, created.offset);

        if (existing === undefined) {
            addCreatedContract(contracts, creations, created, created.offset);
        } else if (existing.active === false) {
            throw new ValidationError(`gRPC query ACS contains archived contract ${created.contractId}`);
        } else if (canonicalCreation(creations.get(created.contractId)!) !== canonicalCreation(candidate)) {
            throw new ValidationError(`gRPC query ACS conflicts with history for contract ${created.contractId}`);
        }
    }

    const typeIdentities = [...new Map(
        [...pending.map((item) => item.event), ...activeCreatedEvents(activeContracts)].flatMap((event) => typeIdentityRows(event, registry).map((item) => [item.pk, item])),
    ).values()].sort((left, right) => Number(left.pk) - Number(right.pk));

    const packageIdentities = [...new Set([...pending.flatMap((item) => packageIdsFor(item.event)), ...activeCreations.flatMap(packageIdsFor)])]
        .sort()
        .map((id) => ({ pk: registry.get(packageIdentity(id))!, id }));

    return immutableQueryValue({
        contracts: [...contracts.values()].sort((left, right) => left.contractId.localeCompare(right.contractId)),
        transactions: transactionRows,
        events: eventRows,
        exercises: exerciseRows.sort((left, right) => `${left.exercisedAtIx}:${left.exerciseEventPk}`.localeCompare(`${right.exercisedAtIx}:${right.exerciseEventPk}`)),
        typeIdentities,
        packageIdentities,
        creationIdentities: [...creations.values()].sort((left, right) => left.contractId.localeCompare(right.contractId)),
    });
}

function pendingEvent(transaction: Transaction, event: Event): PendingEvent {
    switch (event.event.oneofKind) {
        case "created":
            validatePending(transaction, event.event.created, "created");

            return { transaction, event: event.event.created, kind: "created", identity: eventIdentity(event.event.created) };
        case "exercised":
            validatePending(transaction, event.event.exercised, "exercised");

            return { transaction, event: event.event.exercised, kind: "exercised", identity: eventIdentity(event.event.exercised) };
        default: throw new ValidationError("gRPC query history contains a non-ledger-effects event");
    }
}

function validatePending(transaction: Transaction, event: CreatedEvent | ExercisedEvent, kind: PendingEvent["kind"]): void {
    validOffset(event.offset, `${kind} event offset`);
    validNodeId(event.nodeId, `${kind} node id`);

    if (event.offset !== transaction.offset) {
        throw new ValidationError(`gRPC query ${kind} event offset differs from its transaction`);
    } else if (event.contractId.length === 0) {
        throw new ValidationError(`gRPC query ${kind} event contract id is missing`);
    }

    requiredTemplate(event.templateId, `${kind} event template`);

    if (isExercised(event)) {
        if (event.choice.length === 0) {
            throw new ValidationError("gRPC query exercise choice is missing");
        } else if (event.packageName.length === 0) {
            throw new ValidationError("gRPC query exercise package name is missing");
        } else if (event.choiceArgument === undefined) {
            throw new ValidationError("gRPC query exercise argument is missing");
        }

        immutableStrings(event.actingParties, "exercise acting parties", true);
        immutableStrings(event.witnessParties, "exercise witnesses", true);
        validNodeId(event.lastDescendantNodeId, "last descendant node id");
    } else {
        creationDescriptor(event, event.offset);
    }
}

function addCreatedContract(contracts: Map<string, ContractRow>, creations: Map<string, GrpcQueryCreationIdentity>, event: CreatedEvent, offset: string): void {
    const creation = creationDescriptor(event, offset);

    if (contracts.has(event.contractId)) {
        throw new ValidationError(`gRPC query has duplicate contract creation ${event.contractId}`);
    }

    contracts.set(event.contractId, {
        contractId: creation.contractId,
        templateId: creation.templateId,
        packageId: creation.creationPackageId,
        payload: creation.payload,
        witnesses: creation.witnesses,
        createdEventOffset: creation.offset,
        createdAt: creation.createdAt,
        archivedEventOffset: null,
        archivedAt: null,
        active: true,
    });
    creations.set(event.contractId, creation);
}

function mapTransaction(transaction: Transaction): TransactionRow {
    return {
        ix: transaction.offset,
        offset: transaction.offset,
        transactionId: transaction.updateId,
        effectiveAt: timestamp(transaction.effectiveAt, "transaction effective time", true),
        workflowId: nullableString(transaction.workflowId),
        domainId: transaction.synchronizerId,
        traceContext: transaction.traceContext === undefined ? null : transaction.traceContext,
        externalTransactionHash: transaction.externalTransactionHash === undefined ? null : Uint8Array.from(transaction.externalTransactionHash),
        paidTrafficCost: transaction.paidTrafficCost === undefined ? null : signedInt64(transaction.paidTrafficCost, "paid traffic cost"),
    };
}

function identitiesFor(event: CreatedEvent | ExercisedEvent): readonly string[] {
    const template = requiredTemplate(event.templateId, "event template");

    return isExercised(event)
        ? [eventIdentity(event), contractIdentity(template), ...packageIdsFor(event).map(packageIdentity), exerciseIdentity(template, event.choice, event.consuming)]
        : [eventIdentity(event), contractIdentity(template), ...packageIdsFor(event).map(packageIdentity)];
}

function typeIdentityRows(event: CreatedEvent | ExercisedEvent, registry: ReadonlyMap<string, string>): readonly GrpcQueryTypeIdentity[] {
    const template = requiredTemplate(event.templateId, "event template");

    const contract = { pk: registry.get(contractIdentity(template))!, templateId: copyTemplate(template), packageId: template.packageId };

    return isExercised(event) ? [contract, { pk: registry.get(exerciseIdentity(template, event.choice, event.consuming))!, templateId: copyTemplate(template), packageId: template.packageId, choice: event.choice, consuming: event.consuming }] : [contract];
}

function activeCreatedEvents(responses: readonly GetActiveContractsResponse[]): readonly CreatedEvent[] {
    return responses.map((response) => {
        if (response.contractEntry.oneofKind !== "activeContract" || response.contractEntry.activeContract.createdEvent === undefined) {
            throw new ValidationError("gRPC query ACS contains incomplete assigned or unassigned contract data");
        }

        return response.contractEntry.activeContract.createdEvent;
    });
}

function creationDescriptor(event: CreatedEvent, offset: string): GrpcQueryCreationIdentity {
    validOffset(offset, "created event offset");
    validNodeId(event.nodeId, "created node id");

    if (event.contractId.length === 0) {
        throw new ValidationError("gRPC query created event contract id is missing");
    } else if (event.packageName.length === 0) {
        throw new ValidationError("gRPC query created event package name is missing");
    }

    const template = requiredTemplate(event.templateId, "created event template");

    if (event.createArguments === undefined) {
        throw new ValidationError("gRPC query created event has no create arguments");
    }

    const createdAt = requiredTimestamp(event.createdAt, "created event time");

    return {
        contractId: event.contractId,
        offset,
        templateId: copyTemplate(template),
        creationPackageId: template.packageId,
        representativePackageId: nullableString(event.representativePackageId),
        payload: mapGrpcQueryValue({ sum: { oneofKind: "record", record: event.createArguments } }),
        witnesses: immutableStrings(event.witnessParties, "created event witnesses", true),
        createdAt,
    };
}

function validateTransaction(transaction: Transaction): void {
    if (transaction.events.length === 0) {
        throw new ValidationError("gRPC query transaction has no events");
    } else if (transaction.updateId.length === 0) {
        throw new ValidationError("gRPC query transaction update id is missing");
    } else if (transaction.synchronizerId.length === 0) {
        throw new ValidationError("gRPC query transaction synchronizer id is missing");
    }

    timestamp(transaction.effectiveAt, "transaction effective time", true);
}

function packageIdsFor(event: CreatedEvent | ExercisedEvent): readonly string[] {
    const template = requiredTemplate(event.templateId, "event template");

    return isExercised(event) ? [template.packageId] : [template.packageId, ...event.representativePackageId.length === 0 ? [] : [event.representativePackageId]];
}

function keyRegistry(identities: readonly string[]): ReadonlyMap<string, string> {
    return new Map([...new Set(identities)].sort().map((identity, index) => [identity, String(index + 1)]));
}
function contractIdentity(template: TemplateId): string {
    return `contract-type\u0000${template.packageId}\u0000${template.moduleName}\u0000${template.entityName}`;
}
function packageIdentity(id: string): string {
    return `package\u0000${id}`;
}
function exerciseIdentity(template: TemplateId, choice: string, consuming: boolean): string {
    return `exercise-type\u0000${template.packageId}\u0000${template.moduleName}\u0000${template.entityName}\u0000${choice}\u0000${consuming}`;
}
function eventIdentity(event: CreatedEvent | ExercisedEvent): string {
    return `event\u0000${event.offset}\u0000${event.nodeId}`;
}
function eventId(event: CreatedEvent | ExercisedEvent): string {
    return `${event.offset}:${event.nodeId}`;
}
function nodeId(event: CreatedEvent | ExercisedEvent): number {
    return validNodeId(event.nodeId, "event node id");
}
function isExercised(event: CreatedEvent | ExercisedEvent): event is ExercisedEvent {
    return typeof (event as ExercisedEvent).choice === "string";
}

function requiredTemplate(template: TemplateId | undefined, name: string): TemplateId {
    if (template === undefined || template.packageId.length === 0 || template.moduleName.length === 0 || template.entityName.length === 0) {
        throw new ValidationError(`gRPC query ${name} is missing`);
    }

    return template;
}
function copyTemplate(template: TemplateId): { packageId: string; moduleName: string; entityName: string } {
    return { packageId: template.packageId, moduleName: template.moduleName, entityName: template.entityName };
}
function mapRequiredValue(value: Parameters<typeof mapGrpcQueryValue>[0] | undefined, name: string): unknown {
    if (value === undefined) {
        throw new ValidationError(`gRPC query ${name} is missing`);
    }

    return mapGrpcQueryValue(value);
}
function immutableStrings(value: readonly string[], name: string, required = false): readonly string[] {
    if ((required && value.length === 0) || value.some((item) => item.length === 0)) {
        throw new ValidationError(`gRPC query ${name} is missing`);
    }

    return Object.freeze([...value]);
}
function nullableString(value: string): string | null {
    return value.length === 0 ? null : value;
}
function validNodeId(value: number, name: string): number {
    if (!Number.isSafeInteger(value) || value < 0) {
        throw new ValidationError(`gRPC query ${name} is invalid`);
    }

    return value;
}
function validOffset(value: string, name: string): string {
    if (!/^[1-9]\d*$/.test(value)) {
        throw new ValidationError(`gRPC query ${name} is invalid`);
    } else if (BigInt(value) > 9_223_372_036_854_775_807n) {
        throw new ValidationError(`gRPC query ${name} is outside the int64 range`);
    }

    return value;
}
function signedInt64(value: string, name: string): string {
    if (!/^-?(?:0|[1-9]\d*)$/.test(value)) {
        throw new ValidationError(`gRPC query ${name} is invalid`);
    } else if (BigInt(value) < -9_223_372_036_854_775_808n || BigInt(value) > 9_223_372_036_854_775_807n) {
        throw new ValidationError(`gRPC query ${name} is outside the int64 range`);
    }

    return value;
}
function compareOffset(left: string, right: string): number {
    validOffset(left, "transaction offset"); validOffset(right, "transaction offset");

    const first = BigInt(left);

    const second = BigInt(right);

    return first < second ? -1 : first > second ? 1 : 0;
}
function timestamp(value: { seconds: string; nanos: number } | undefined, name: string, required = false): Date | null {
    if (value === undefined) {
        if (required) {
            throw new ValidationError(`gRPC query ${name} is missing`);
        }

        return null;
    } else if (!/^-?(?:0|[1-9]\d*)$/.test(value.seconds) || !Number.isInteger(value.nanos) || value.nanos < 0 || value.nanos > 999_999_999) {
        throw new ValidationError(`gRPC query ${name} is invalid`);
    }

    const milliseconds = BigInt(value.seconds) * 1_000n + BigInt(Math.trunc(value.nanos / 1_000_000));

    if (milliseconds < -62_135_596_800_000n || milliseconds > 253_402_300_799_999n) {
        throw new ValidationError(`gRPC query ${name} is outside the Ledger API range`);
    }

    return new Date(Number(milliseconds));
}

function requiredTimestamp(value: { seconds: string; nanos: number } | undefined, name: string): Date {
    const mapped = timestamp(value, name, true);

    if (mapped === null) {
        throw new ValidationError(`gRPC query ${name} is missing`);
    }

    return mapped;
}

function canonicalCreation(value: GrpcQueryCreationIdentity): string {
    return JSON.stringify({ ...value, createdAt: value.createdAt.toISOString(), payload: canonicalJson(value.payload), witnesses: [...value.witnesses] });
}

function canonicalJson(value: unknown): unknown {
    if (Array.isArray(value)) {
        return value.map(canonicalJson);
    } else if (value !== null && typeof value === "object") {
        return Object.fromEntries(Object.keys(value as Record<string, unknown>).sort().map((key) => [key, canonicalJson((value as Record<string, unknown>)[key])]));
    }

    return value;
}
