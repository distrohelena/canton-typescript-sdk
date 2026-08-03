import { ValidationError } from "../../core/errors/validation-error.js";
import { createQueryDataset, immutableQueryValue, type QueryDataset, type QueryRow } from "../canonical/query-dataset.js";
import type { ContractRow, ContractTypeRow, EventRow, ExerciseRow, ExerciseTypeRow, PackageRow, TransactionRow, WatermarkRow } from "../model-types.js";
import type { GrpcPackageMetadata } from "./grpc-package-relation-reader.js";
import type { CreatedEvent, Event, ExercisedEvent } from "../../transports/grpc/generated/canton/com/daml/ledger/api/v2/event.js";
import type { Transaction } from "../../transports/grpc/generated/canton/com/daml/ledger/api/v2/transaction.js";
import type { GetActiveContractsResponse } from "../../transports/grpc/generated/canton/com/daml/ledger/api/v2/state_service.js";
import { mapGrpcQueryValue, validDottedNameString, validLedgerString, validNameString, validPackageIdString, validPartyId } from "./grpc-query-value-mapper.js";

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

/** Private Task 5 activation metadata retained for later relation construction. */
export interface GrpcActiveContractIdentity {
    readonly contractId: string;
    readonly synchronizerId: string;
    readonly reassignmentCounter: string;
    readonly activationOffset: string;
    readonly activationNodeId: number;
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
    readonly activeContractIdentities: readonly GrpcActiveContractIdentity[];
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

interface ActiveContractEntry {
    readonly event: CreatedEvent;
    readonly synchronizerId: string;
    readonly reassignmentCounter: string;
}

/** Materializes ledger-effects transactions and optionally seeds still-active ACS contracts. */
export function mapGrpcQueryRelationFragment(
    source: readonly Transaction[],
    activeContracts: readonly GetActiveContractsResponse[] = [],
): GrpcQueryRelationFragment {
    const transactions = [...source].sort((left, right) => compareOffset(left.offset, right.offset));

    const activeEntries = activeContractEntries(activeContracts);

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
        ...activeEntries.map((entry) => entry.event).flatMap(identitiesFor),
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

    reconcileActiveContracts(contracts, creations, activeEntries);

    const typeIdentities = [...new Map(
        [...pending.map((item) => item.event), ...activeEntries.map((entry) => entry.event)].flatMap((event) => typeIdentityRows(event, registry).map((item) => [item.pk, item])),
    ).values()].sort((left, right) => compareOffset(left.pk, right.pk));

    const packageIdentities = [...new Set([...pending.flatMap((item) => packageIdsFor(item.event)), ...activeEntries.map((entry) => entry.event).flatMap(packageIdsFor)])]
        .sort()
        .map((id) => ({ pk: registry.get(packageIdentity(id))!, id }));

    return immutableQueryValue({
        contracts: [...contracts.values()].sort((left, right) => left.contractId.localeCompare(right.contractId)),
        transactions: transactionRows,
        events: eventRows,
        exercises: exerciseRows.sort((left, right) => compareOffset(left.exercisedAtIx ?? "1", right.exercisedAtIx ?? "1") || compareOffset(left.exerciseEventPk ?? "1", right.exerciseEventPk ?? "1") || left.contractId.localeCompare(right.contractId)),
        typeIdentities,
        packageIdentities,
        creationIdentities: [...creations.values()].sort((left, right) => left.contractId.localeCompare(right.contractId)),
        activeContractIdentities: activeEntries.map((entry) => ({ contractId: entry.event.contractId, synchronizerId: entry.synchronizerId, reassignmentCounter: entry.reassignmentCounter, activationOffset: entry.event.offset, activationNodeId: entry.event.nodeId }))
            .sort((left, right) => left.contractId.localeCompare(right.contractId) || left.synchronizerId.localeCompare(right.synchronizerId)),
    });
}

/**
 * Combines the Task 5 ledger fragment with decoded LF package metadata into the
 * complete immutable eight-relation snapshot. Private edge keys retain the
 * creation template identity without exposing a synthetic field in contract rows.
 */
export function createGrpcQueryDataset(
    fragment: GrpcQueryRelationFragment,
    packages: readonly GrpcPackageMetadata[],
    endInclusive: string,
    instanceId: string,
): QueryDataset {
    validSnapshotOffset(endInclusive);

    if (instanceId.length === 0) {
        throw new ValidationError("gRPC query snapshot instance id is missing");
    }

    const normalizedPackages = normalizeGrpcPackageMetadata(packages);

    const packageById = new Map<string, GrpcPackageMetadata>();

    for (const pkg of normalizedPackages) {
        if (packageById.has(pkg.id)) {
            throw new ValidationError(`gRPC query has duplicate package metadata ${pkg.id}`);
        }

        packageById.set(pkg.id, pkg);
    }

    const templates = normalizedPackages.flatMap((pkg) => pkg.templates.map((template) => ({ package: pkg, template })));

    const templateByIdentity = new Map<string, (typeof templates)[number]>();

    for (const entry of templates) {
        const identity = templateIdentity(entry.package.id, entry.template.moduleName, entry.template.entityName);

        if (templateByIdentity.has(identity)) {
            throw new ValidationError(`gRPC query has duplicate DAML-LF template ${identity}`);
        }

        templateByIdentity.set(identity, entry);
    }

    const registry = keyRegistry([
        ...normalizedPackages.map((pkg) => packageIdentity(pkg.id)),
        ...templates.map(({ package: pkg, template }) => contractIdentity({ packageId: pkg.id, moduleName: template.moduleName, entityName: template.entityName })),
        ...templates.flatMap(({ package: pkg, template }) => template.choices.map((choice) => exerciseIdentity({ packageId: pkg.id, moduleName: template.moduleName, entityName: template.entityName }, choice.choice, choice.consuming))),
    ]);

    const packageRows: PackageRow[] = [...normalizedPackages]
        .sort((left, right) => left.id.localeCompare(right.id))
        .map((pkg) => ({ pk: registry.get(packageIdentity(pkg.id))!, name: pkg.name, version: pkg.version, id: pkg.id }));

    const contractTypeRows: ContractTypeRow[] = [...templates]
        .sort(compareTemplateMetadata)
        .map(({ package: pkg, template }) => ({
            pk: registry.get(contractIdentity({ packageId: pkg.id, moduleName: template.moduleName, entityName: template.entityName }))!,
            payloadType: template.payloadType,
            aliases: template.aliases,
            packageName: pkg.name,
            moduleName: template.moduleName,
            entityName: template.entityName,
            templateFqn: template.templateFqn,
        }));

    const exerciseTypeRows: ExerciseTypeRow[] = [...templates]
        .flatMap(({ package: pkg, template }) => template.choices.map((choice) => ({ package: pkg, template, choice })))
        .sort((left, right) => compareTemplateMetadata(left, right) || left.choice.choice.localeCompare(right.choice.choice) || Number(left.choice.consuming) - Number(right.choice.consuming))
        .map(({ package: pkg, template, choice }) => ({
            pk: registry.get(exerciseIdentity({ packageId: pkg.id, moduleName: template.moduleName, entityName: template.entityName }, choice.choice, choice.consuming))!,
            choice: choice.choice,
            consuming: choice.consuming,
            aliases: choice.aliases,
            packageName: pkg.name,
            moduleName: template.moduleName,
            entityName: template.entityName,
            templateFqn: template.templateFqn,
            choiceFqn: choice.choiceFqn,
        }));

    const typeIdentityByOldPk = new Map(fragment.typeIdentities.map((identity) => [identity.pk, identity]));

    const packageIdByOldPk = new Map(fragment.packageIdentities.map((identity) => [identity.pk, identity.id]));

    const creationByContract = new Map(fragment.creationIdentities.map((identity) => [identity.contractId, identity]));

    const exercises = fragment.exercises.map((exercise) => ({
        ...exercise,
        tpePk: registryKeyForType(typeIdentityByOldPk.get(exercise.tpePk), registry),
        contractTpePk: registryKeyForRepresentativeContract(exercise.contractId, creationByContract, registry),
        packagePk: registryKeyForPackage(packageIdByOldPk.get(exercise.packagePk), registry),
    }));

    const contractPrivateKeys = fragment.contracts.map((contract) => {
        const creation = creationByContract.get(contract.contractId);

        if (creation === undefined) {
            throw new ValidationError(`gRPC query creation identity is missing ${contract.contractId}`);
        }

        return templateKey(creation.representativePackageId ?? creation.creationPackageId, creation.templateId.moduleName, creation.templateId.entityName);
    });

    const templatePrivateKeys = [...templates]
        .sort(compareTemplateMetadata)
        .map(({ package: pkg, template }) => templateKey(pkg.id, template.moduleName, template.entityName));

    const watermark: readonly WatermarkRow[] = [{ singleton: true, ix: endInclusive, offset: endInclusive, instanceId }];

    const transactionOffsets = new Set(fragment.transactions.map((transaction) => transaction.ix));

    const activeContractIds = new Set(fragment.activeContractIdentities.map((identity) => identity.contractId));

    const contractsWithoutCreatedTransaction = fragment.contracts.filter((contract) => !transactionOffsets.has(contract.createdEventOffset));

    const createdTransactionIncomplete = contractsWithoutCreatedTransaction.length > 0 && contractsWithoutCreatedTransaction.every((contract) => activeContractIds.has(contract.contractId));

    return createQueryDataset({
        rows: {
            contracts: fragment.contracts as unknown as readonly QueryRow[],
            contractTypes: contractTypeRows as unknown as readonly QueryRow[],
            events: fragment.events as unknown as readonly QueryRow[],
            exercises: exercises as unknown as readonly QueryRow[],
            exerciseTypes: exerciseTypeRows as unknown as readonly QueryRow[],
            packages: packageRows as unknown as readonly QueryRow[],
            transactions: fragment.transactions as unknown as readonly QueryRow[],
            watermark: watermark as unknown as readonly QueryRow[],
        },
        sourceLocalKeys: {
            contracts: [["contractId"]], contractTypes: [["pk"]], events: [["pk"]], exercises: [["tpePk", "contractTpePk", "exerciseEventPk", "contractId"]], exerciseTypes: [["pk"]], packages: [["pk"], ["id"]], transactions: [["ix"], ["offset"]], watermark: [["singleton"]],
        },
        edges: {
            contracts: {
                contractType: { privateKeys: { source: contractPrivateKeys, target: templatePrivateKeys } },
                createdTransaction: { from: ["createdEventOffset"], to: ["ix"], ...(createdTransactionIncomplete ? { complete: false } : {}) },
                archivedTransaction: { from: ["archivedEventOffset"], to: ["ix"] },
                exercises: { from: ["contractId"], to: ["contractId"] },
            },
            contractTypes: {
                contracts: { privateKeys: { source: templatePrivateKeys, target: contractPrivateKeys } },
                exercises: { from: ["pk"], to: ["contractTpePk"] },
            },
            events: { transaction: { from: ["txIx"], to: ["ix"] }, exercises: { from: ["pk"], to: ["exerciseEventPk"] } },
            exercises: {
                exerciseType: { from: ["tpePk"], to: ["pk"] }, contractType: { from: ["contractTpePk"], to: ["pk"] }, event: { from: ["exerciseEventPk"], to: ["pk"] }, transaction: { from: ["exercisedAtIx"], to: ["ix"] }, package: { from: ["packagePk"], to: ["pk"] }, contract: { from: ["contractId"], to: ["contractId"] },
            },
            exerciseTypes: { exercises: { from: ["pk"], to: ["tpePk"] } },
            packages: { exercises: { from: ["pk"], to: ["packagePk"] } },
            transactions: {
                events: { from: ["ix"], to: ["txIx"] }, createdContracts: { from: ["ix"], to: ["createdEventOffset"] }, archivedContracts: { from: ["ix"], to: ["archivedEventOffset"] }, exercises: { from: ["ix"], to: ["exercisedAtIx"] },
            },
            watermark: {},
        },
    });
}

/** Package payloads required for a contract/history relation plan, excluding creation-only provenance. */
export function referencedGrpcPackageIds(fragment: GrpcQueryRelationFragment): readonly string[] {
    return Object.freeze([...new Set([
        ...fragment.creationIdentities.map((creation) => creation.representativePackageId ?? creation.creationPackageId),
        ...fragment.typeIdentities.filter((identity) => identity.choice !== undefined).map((identity) => identity.packageId),
    ])].sort());
}

function compareTemplateMetadata(left: { readonly package: GrpcPackageMetadata; readonly template: GrpcPackageMetadata["templates"][number] }, right: { readonly package: GrpcPackageMetadata; readonly template: GrpcPackageMetadata["templates"][number] }): number {
    return left.package.id.localeCompare(right.package.id) || left.template.moduleName.localeCompare(right.template.moduleName) || left.template.entityName.localeCompare(right.template.entityName);
}

function normalizeGrpcPackageMetadata(packages: readonly GrpcPackageMetadata[]): readonly GrpcPackageMetadata[] {
    try {
        return normalizeGrpcPackageMetadataUnsafe(packages);
    } catch (error) {
        if (isValidationError(error)) {
            throw error;
        }

        throw new ValidationError("gRPC query package metadata is invalid");
    }
}

function normalizeGrpcPackageMetadataUnsafe(packages: unknown): readonly GrpcPackageMetadata[] {
    if (!Array.isArray(packages)) {
        throw new ValidationError("gRPC query package metadata is not an array");
    }

    const packageValues = Array.from(packages) as readonly unknown[];

    const packageIds = new Set<string>();

    const packageNameVersions = new Set<string>();

    const normalized: GrpcPackageMetadata[] = [];

    for (const pkg of packageValues) {
        if (pkg === null || typeof pkg !== "object") {
            throw new ValidationError("gRPC query package metadata is invalid");
        }

        const value = pkg as Partial<GrpcPackageMetadata>;

        const packageId = packageText(value.id, "id");

        validPackageIdString(packageId, "package metadata id");

        const packageName = packageText(value.name, "name");

        const packageVersion = packageText(value.version, "version");

        if (packageIds.has(packageId)) {
            throw new ValidationError(`gRPC query has duplicate package metadata ${packageId}`);
        }

        packageIds.add(packageId);

        const nameVersion = `${packageName}\u0000${packageVersion}`;

        if (packageNameVersions.has(nameVersion)) {
            throw new ValidationError(`gRPC query has duplicate package metadata ${packageName}@${packageVersion}`);
        }

        packageNameVersions.add(nameVersion);

        const templatesValue = value.templates;

        if (!Array.isArray(templatesValue)) {
            throw new ValidationError(`gRPC query package ${packageId} templates are invalid`);
        }

        const templateValues = Array.from(templatesValue) as readonly unknown[];

        const templateIdentities = new Set<string>();

        const templates = Object.freeze(templateValues.map((template) => normalizePackageTemplate(packageId, packageName, template, templateIdentities)));

        normalized.push(Object.freeze({ id: packageId, name: packageName, version: packageVersion, templates }));
    }

    return Object.freeze(normalized);
}

function normalizePackageTemplate(packageId: string, packageName: string, template: unknown, identities: Set<string>): GrpcPackageMetadata["templates"][number] {
    if (template === null || typeof template !== "object") {
        throw new ValidationError(`gRPC query package ${packageId} template is invalid`);
    }

    const value = template as Partial<GrpcPackageMetadata["templates"][number]>;

    const moduleName = dottedPackageName(value.moduleName, `package ${packageId} template module`);

    const entityName = dottedPackageName(value.entityName, `package ${packageId} template entity`);

    const identity = templateIdentity(packageId, moduleName, entityName);

    if (identities.has(identity)) {
        throw new ValidationError(`gRPC query has duplicate DAML-LF template ${identity}`);
    }

    identities.add(identity);

    const payloadType = value.payloadType;

    if (payloadType !== "template") {
        throw new ValidationError(`gRPC query package ${packageId} template payload type is invalid`);
    }

    const aliases = exactAlias(value.aliases, `${moduleName}:${entityName}`, `package ${packageId} template`);

    const templateFqn = exactText(value.templateFqn, `${packageName}:${moduleName}:${entityName}`, `package ${packageId} template FQN`);

    const choicesValue = value.choices;

    if (!Array.isArray(choicesValue)) {
        throw new ValidationError(`gRPC query package ${packageId} template choices are invalid`);
    }

    const choiceValues = Array.from(choicesValue) as readonly unknown[];

    const choiceNames = new Set<string>();

    const choices = Object.freeze(choiceValues.map((choice) => normalizePackageChoice(packageId, packageName, moduleName, entityName, choice, choiceNames)));

    return Object.freeze({ moduleName, entityName, payloadType, aliases, templateFqn, choices });
}

function normalizePackageChoice(packageId: string, packageName: string, moduleName: string, entityName: string, choice: unknown, choiceNames: Set<string>): GrpcPackageMetadata["templates"][number]["choices"][number] {
    if (choice === null || typeof choice !== "object") {
        throw new ValidationError(`gRPC query package ${packageId} choice is invalid`);
    }

    const value = choice as Partial<GrpcPackageMetadata["templates"][number]["choices"][number]>;

    const choiceName = value.choice;

    if (typeof choiceName !== "string") {
        throw new ValidationError(`gRPC query package ${packageId} choice name is invalid`);
    }

    validNameString(choiceName, `package ${packageId} choice name`);

    if (choiceNames.has(choiceName)) {
        throw new ValidationError(`gRPC query has duplicate DAML-LF choice ${packageId}:${moduleName}:${entityName}:${choiceName}`);
    }

    choiceNames.add(choiceName);

    const consuming = value.consuming;

    if (typeof consuming !== "boolean") {
        throw new ValidationError(`gRPC query package ${packageId} choice consuming flag is invalid`);
    }

    const aliases = exactAlias(value.aliases, `${moduleName}:${entityName}:${choiceName}`, `package ${packageId} choice`);

    const choiceFqn = exactText(value.choiceFqn, `${packageName}:${moduleName}:${entityName}:${choiceName}`, `package ${packageId} choice FQN`);

    return Object.freeze({ choice: choiceName, consuming, aliases, choiceFqn });
}

function packageText(value: unknown, name: string): string {
    if (typeof value !== "string" || value.length === 0 || /[:\u0000-\u001F\u007F]/.test(value)) {
        throw new ValidationError(`gRPC query package metadata ${name} is invalid`);
    }

    return value;
}

function dottedPackageName(value: unknown, name: string): string {
    if (typeof value !== "string") {
        throw new ValidationError(`gRPC query ${name} is invalid`);
    }

    return validDottedNameString(value, name);
}

function exactAlias(value: unknown, expected: string, name: string): readonly string[] {
    if (!Array.isArray(value)) {
        throw new ValidationError(`gRPC query ${name} aliases are invalid`);
    }

    const aliases = Array.from(value) as readonly unknown[];

    if (aliases.length !== 1 || aliases[0] !== expected) {
        throw new ValidationError(`gRPC query ${name} aliases are invalid`);
    }

    return Object.freeze([expected]);
}

function exactText(value: unknown, expected: string, name: string): string {
    if (value !== expected) {
        throw new ValidationError(`gRPC query ${name} is invalid`);
    }

    return expected;
}

function isValidationError(error: unknown): error is ValidationError {
    try {
        return error instanceof ValidationError;
    } catch {
        return false;
    }
}

function templateIdentity(packageId: string, moduleName: string, entityName: string): string {
    return `${packageId}\u0000${moduleName}\u0000${entityName}`;
}
function templateKey(packageId: string, moduleName: string, entityName: string): readonly string[] {
    return [packageId, moduleName, entityName];
}
function registryKeyForType(identity: GrpcQueryTypeIdentity | undefined, registry: ReadonlyMap<string, string>): string {
    if (identity === undefined) {
        throw new ValidationError("gRPC query relation type identity is missing");
    }

    const key = identity.choice === undefined
        ? registry.get(contractIdentity(identity.templateId))
        : registry.get(exerciseIdentity(identity.templateId, identity.choice, identity.consuming!));

    if (key === undefined) {
        throw new ValidationError("gRPC query relation type metadata is missing");
    }

    return key;
}
function registryKeyForRepresentativeContract(contractId: string, creations: ReadonlyMap<string, GrpcQueryCreationIdentity>, registry: ReadonlyMap<string, string>): string {
    const creation = creations.get(contractId);

    if (creation === undefined) {
        throw new ValidationError(`gRPC query creation identity is missing ${contractId}`);
    }

    const packageId = creation.representativePackageId ?? creation.creationPackageId;

    const key = registry.get(contractIdentity({ packageId, moduleName: creation.templateId.moduleName, entityName: creation.templateId.entityName }));

    if (key === undefined) {
        throw new ValidationError(`gRPC query representative contract type metadata is missing ${packageId}:${creation.templateId.moduleName}:${creation.templateId.entityName}`);
    }

    return key;
}
function registryKeyForPackage(packageId: string | undefined, registry: ReadonlyMap<string, string>): string {
    const key = packageId === undefined ? undefined : registry.get(packageIdentity(packageId));

    if (key === undefined) {
        throw new ValidationError("gRPC query relation package metadata is missing");
    }

    return key;
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
    }

    validLedgerString(event.contractId, `${kind} event contract id`);

    requiredTemplate(event.templateId, `${kind} event template`);

    if (isExercised(event)) {
        if (event.packageName.length === 0) {
            throw new ValidationError("gRPC query exercise package name is missing");
        } else if (event.choiceArgument === undefined) {
            throw new ValidationError("gRPC query exercise argument is missing");
        }

        validNameString(event.choice, "exercise choice");

        immutableStrings(event.actingParties, "exercise acting parties", true);
        immutableStrings(event.witnessParties, "exercise witnesses", true);
        validNodeId(event.lastDescendantNodeId, "last descendant node id");

        if (event.lastDescendantNodeId < event.nodeId) {
            throw new ValidationError("gRPC query exercise last descendant node id precedes its node id");
        }
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
        externalTransactionHash: transaction.transactionHash === undefined
            ? transaction.externalTransactionHash === undefined ? null : Uint8Array.from(transaction.externalTransactionHash)
            : Uint8Array.from(transaction.transactionHash),
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

function activeContractEntries(responses: readonly GetActiveContractsResponse[]): readonly ActiveContractEntry[] {
    const entries = responses.map((response) => {
        const contractEntry = response.contractEntry;

        if (contractEntry.oneofKind !== "activeContract") {
            throw new ValidationError("gRPC query ACS contains incomplete assigned or unassigned contract data");
        }

        const active = contractEntry.activeContract;

        const event = active.createdEvent;

        if (event === undefined) {
            throw new ValidationError("gRPC query ACS contains incomplete assigned or unassigned contract data");
        } else if (active.synchronizerId.length === 0) {
            throw new ValidationError("gRPC query ACS active contract synchronizer id is missing");
        }

        creationDescriptor(event, event.offset);

        return { event, synchronizerId: active.synchronizerId, reassignmentCounter: uint64(active.reassignmentCounter, "ACS active contract reassignment counter") };
    });

    const seen = new Set<string>();

    for (const entry of entries) {
        const key = `${entry.event.contractId}\u0000${entry.synchronizerId}`;

        if (seen.has(key)) {
            throw new ValidationError(`gRPC query has duplicate ACS activation for ${entry.event.contractId} on ${entry.synchronizerId}`);
        }

        seen.add(key);
    }

    return entries;
}

function reconcileActiveContracts(contracts: Map<string, ContractRow>, creations: Map<string, GrpcQueryCreationIdentity>, entries: readonly ActiveContractEntry[]): void {
    const grouped = new Map<string, ActiveContractEntry[]>();

    for (const entry of entries) {
        let bucket = grouped.get(entry.event.contractId);

        if (bucket === undefined) {
            bucket = [];
            grouped.set(entry.event.contractId, bucket);
        }

        bucket.push(entry);
    }

    for (const [contractId, group] of grouped) {
        const descriptors = group.map((entry) => creationDescriptor(entry.event, entry.event.offset));

        const facts = canonicalCreationFacts(descriptors[0]!);

        if (descriptors.some((descriptor) => canonicalCreationFacts(descriptor) !== facts)) {
            throw new ValidationError(`gRPC query ACS conflicts within activations for contract ${contractId}`);
        }

        const existing = contracts.get(contractId);

        const historical = creations.get(contractId);

        if (existing !== undefined && existing.active === false) {
            throw new ValidationError(`gRPC query ACS contains archived contract ${contractId}`);
        } else if (historical !== undefined && canonicalCreationFacts(historical) !== facts) {
            throw new ValidationError(`gRPC query ACS conflicts with history for contract ${contractId}`);
        }

        const witnesses = partyUnion([...(historical?.witnesses ?? []), ...descriptors.flatMap((descriptor) => descriptor.witnesses)], "created event witnesses", true);

        if (existing === undefined) {
            const representative = [...group].sort(compareActivation)[0]!;

            addCreatedContract(contracts, creations, representative.event, representative.event.offset);
        }

        const creation = creations.get(contractId)!;

        const updatedCreation = { ...creation, witnesses };

        creations.set(contractId, updatedCreation);
        contracts.set(contractId, { ...contracts.get(contractId)!, witnesses });
    }
}

function compareActivation(left: ActiveContractEntry, right: ActiveContractEntry): number {
    const counter = BigInt(left.reassignmentCounter) - BigInt(right.reassignmentCounter);

    return counter < 0n ? -1 : counter > 0n ? 1 : compareOffset(left.event.offset, right.event.offset) || left.synchronizerId.localeCompare(right.synchronizerId);
}

function creationDescriptor(event: CreatedEvent, offset: string): GrpcQueryCreationIdentity {
    validOffset(offset, "created event offset");
    validNodeId(event.nodeId, "created node id");

    validLedgerString(event.contractId, "created event contract id");

    if (event.packageName.length === 0) {
        throw new ValidationError("gRPC query created event package name is missing");
    }

    validPackageIdString(event.representativePackageId, "created event representative package id");

    const template = requiredTemplate(event.templateId, "created event template");

    if (event.createArguments === undefined) {
        throw new ValidationError("gRPC query created event has no create arguments");
    }

    const createdAt = requiredTimestamp(event.createdAt, "created event time");

    immutableStrings(event.signatories, "created event signatories", true);
    immutableStrings(event.observers, "created event observers");

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
    } else if (transaction.synchronizerId.length === 0) {
        throw new ValidationError("gRPC query transaction synchronizer id is missing");
    }

    validLedgerString(transaction.updateId, "transaction update id");

    if (transaction.workflowId.length > 0) {
        validLedgerString(transaction.workflowId, "transaction workflow id");
    }

    timestamp(transaction.effectiveAt, "transaction effective time", true);
    timestamp(transaction.recordTime, "transaction record time", true);
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
    if (template === undefined) {
        throw new ValidationError(`gRPC query ${name} is missing`);
    }

    validPackageIdString(template.packageId, `${name} package id`);
    validDottedNameString(template.moduleName, `${name} module name`);
    validDottedNameString(template.entityName, `${name} entity name`);

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
    if (required && value.length === 0) {
        throw new ValidationError(`gRPC query ${name} is missing`);
    }

    return Object.freeze([...new Set(value.map(validPartyId))].sort());
}
function partyUnion(value: readonly string[], name: string, required = false): readonly string[] {
    return immutableStrings(value, name, required);
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
function validSnapshotOffset(value: string): string {
    if (!/^(?:0|[1-9]\d*)$/.test(value)) {
        throw new ValidationError("gRPC query snapshot end offset is invalid");
    } else if (BigInt(value) > 9_223_372_036_854_775_807n) {
        throw new ValidationError("gRPC query snapshot end offset is outside the int64 range");
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
function uint64(value: string, name: string): string {
    if (!/^(?:0|[1-9]\d*)$/.test(value)) {
        throw new ValidationError(`gRPC query ${name} is invalid`);
    } else if (BigInt(value) > 18_446_744_073_709_551_615n) {
        throw new ValidationError(`gRPC query ${name} is outside the uint64 range`);
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

function canonicalCreationFacts(value: GrpcQueryCreationIdentity): string {
    return JSON.stringify({ contractId: value.contractId, templateId: value.templateId, creationPackageId: value.creationPackageId, representativePackageId: value.representativePackageId, createdAt: value.createdAt.toISOString(), payload: canonicalJson(value.payload) });
}

function canonicalJson(value: unknown): unknown {
    if (Array.isArray(value)) {
        return value.map(canonicalJson);
    } else if (value !== null && typeof value === "object") {
        return Object.fromEntries(Object.keys(value as Record<string, unknown>).sort().map((key) => [key, canonicalJson((value as Record<string, unknown>)[key])]));
    }

    return value;
}
