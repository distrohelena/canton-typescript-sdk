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

    const exerciseRows: ExerciseRow[] = [];

    for (const item of pending.sort((left, right) => compareOffset(left.transaction.offset, right.transaction.offset) || nodeId(left.event) - nodeId(right.event))) {
        if (item.kind === "created") {
            addCreatedContract(contracts, item.event, item.transaction.offset);
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
                controllers: immutableStrings(item.event.actingParties),
                lastDescendantNodeId: String(validNodeId(item.event.lastDescendantNodeId, "last descendant node id")),
                witnesses: immutableStrings(item.event.witnessParties),
            });

            if (item.event.consuming) {
                contracts.set(target.contractId, { ...target, archivedEventOffset: item.transaction.offset, archivedAt: timestamp(item.transaction.effectiveAt, "transaction effective time"), active: false });
            }
        }
    }

    for (const created of activeCreatedEvents(activeContracts)) {
        const existing = contracts.get(created.contractId);

        if (existing === undefined) {
            addCreatedContract(contracts, created, created.offset);
        } else if (existing.active === false) {
            throw new ValidationError(`gRPC query ACS contains archived contract ${created.contractId}`);
        } else if (!sameCreatedContract(existing, created)) {
            throw new ValidationError(`gRPC query ACS conflicts with history for contract ${created.contractId}`);
        }
    }

    const typeIdentities = [...new Map(
        [...pending.map((item) => item.event), ...activeCreatedEvents(activeContracts)].flatMap((event) => typeIdentityRows(event, registry).map((item) => [item.pk, item])),
    ).values()].sort((left, right) => Number(left.pk) - Number(right.pk));

    const packageIdentities = [...new Set([...pending.map((item) => requiredTemplate(item.event.templateId, "event template").packageId), ...activeCreatedEvents(activeContracts).map((item) => requiredTemplate(item.templateId, "ACS template").packageId)])]
        .sort()
        .map((id) => ({ pk: registry.get(packageIdentity(id))!, id }));

    return immutableQueryValue({
        contracts: [...contracts.values()].sort((left, right) => left.contractId.localeCompare(right.contractId)),
        transactions: transactionRows,
        events: eventRows,
        exercises: exerciseRows.sort((left, right) => `${left.exercisedAtIx}:${left.exerciseEventPk}`.localeCompare(`${right.exercisedAtIx}:${right.exerciseEventPk}`)),
        typeIdentities,
        packageIdentities,
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

}

function addCreatedContract(contracts: Map<string, ContractRow>, event: CreatedEvent, offset: string): void {
    const templateId = requiredTemplate(event.templateId, "created event template");

    if (event.createArguments === undefined) {
        throw new ValidationError("gRPC query created event has no create arguments");
    } else if (contracts.has(event.contractId)) {
        throw new ValidationError(`gRPC query has duplicate contract creation ${event.contractId}`);
    }

    contracts.set(event.contractId, {
        contractId: event.contractId,
        templateId: copyTemplate(templateId),
        packageId: event.representativePackageId || templateId.packageId,
        payload: mapGrpcQueryValue({ sum: { oneofKind: "record", record: event.createArguments } }),
        witnesses: immutableStrings(event.witnessParties),
        createdEventOffset: offset,
        createdAt: timestamp(event.createdAt, "created event time"),
        archivedEventOffset: null,
        archivedAt: null,
        active: true,
    });
}

function mapTransaction(transaction: Transaction): TransactionRow {
    if (transaction.updateId.length === 0) {
        throw new ValidationError("gRPC query transaction update id is missing");
    }

    return {
        ix: transaction.offset,
        offset: transaction.offset,
        transactionId: transaction.updateId,
        effectiveAt: timestamp(transaction.effectiveAt, "transaction effective time"),
        workflowId: nullableString(transaction.workflowId),
        domainId: nullableString(transaction.synchronizerId),
        traceContext: transaction.traceContext === undefined ? null : transaction.traceContext,
        externalTransactionHash: transaction.externalTransactionHash === undefined ? null : Uint8Array.from(transaction.externalTransactionHash),
        paidTrafficCost: transaction.paidTrafficCost === undefined ? null : signedInt64(transaction.paidTrafficCost, "paid traffic cost"),
    };
}

function identitiesFor(event: CreatedEvent | ExercisedEvent): readonly string[] {
    const template = requiredTemplate(event.templateId, "event template");

    return isExercised(event)
        ? [eventIdentity(event), contractIdentity(template), packageIdentity(template.packageId), exerciseIdentity(template, event.choice, event.consuming)]
        : [eventIdentity(event), contractIdentity(template), packageIdentity(template.packageId)];
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
function immutableStrings(value: readonly string[]): readonly string[] {
    if (value.some((item) => item.length === 0)) {
        throw new ValidationError("gRPC query party is missing");
    }

    return Object.freeze([...value]);
}
function nullableString(value: string): string | null {
    return value.length === 0 ? null : value;
}
function sameCreatedContract(contract: ContractRow, created: CreatedEvent): boolean {
    const template = requiredTemplate(created.templateId, "ACS template");

    return contract.createdEventOffset === created.offset
        && contract.templateId.packageId === template.packageId
        && contract.templateId.moduleName === template.moduleName
        && contract.templateId.entityName === template.entityName;
}
function validNodeId(value: number, name: string): number {
    if (!Number.isSafeInteger(value) || value < 0) {
        throw new ValidationError(`gRPC query ${name} is invalid`);
    }

    return value;
}
function validOffset(value: string, name: string): string {
    if (!/^(?:0|[1-9]\d*)$/.test(value)) {
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
function timestamp(value: { seconds: string; nanos: number } | undefined, name: string): Date | null {
    if (value === undefined) {
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
