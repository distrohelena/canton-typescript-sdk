import * as fc from "fast-check";

export type LiveFuzzParticipant = "issuer" | "owner";

export type LiveFuzzCommand =
    | { readonly kind: "create" }
    | { readonly kind: "query"; readonly participant: LiveFuzzParticipant }
    | { readonly kind: "fetch"; readonly participant: LiveFuzzParticipant }
    | { readonly kind: "events"; readonly participant: LiveFuzzParticipant }
    | { readonly kind: "exercise"; readonly participant: LiveFuzzParticipant };

export interface LiveFuzzModel {
    readonly templateId: string;
    readonly payload: Readonly<Record<string, unknown>>;
    readonly contractId?: string;
    readonly active: boolean;
    readonly createdSeenBy: Readonly<Record<LiveFuzzParticipant, boolean>>;
    readonly lastLedgerEndByParticipant: Readonly<
        Partial<Record<LiveFuzzParticipant, string>>
    >;
}

export function liveFuzzCommandSequenceArbitrary(init: {
    maxCommands: number;
    requireArchive?: boolean;
}): fc.Arbitrary<readonly LiveFuzzCommand[]> {
    if (!Number.isSafeInteger(init.maxCommands) || init.maxCommands < 1) {
        throw new Error("Live fuzz maxCommands must be at least one.");
    } else if (init.requireArchive === true) {
        if (init.maxCommands < 4) {
            throw new Error(
                "Live fuzz archive smoke sequences require at least four commands.",
            );
        }

        return fc.constant([
            { kind: "create" },
            { kind: "query", participant: "issuer" },
            { kind: "fetch", participant: "owner" },
            { kind: "exercise", participant: "issuer" },
        ] satisfies readonly LiveFuzzCommand[]);
    }

    const preExerciseOperationArbitrary = fc.oneof(
        liveFuzzReadCommandArbitrary(),
        liveFuzzEventsCommandArbitrary(),
    );

    const postExerciseOperationArbitrary = fc.oneof(
        liveFuzzQueryCommandArbitrary(),
        liveFuzzEventsCommandArbitrary(),
    );

    return fc
        .array(preExerciseOperationArbitrary, {
            maxLength: init.maxCommands - 1,
        })
        .chain((preExercise) => {
            const remaining = init.maxCommands - 1 - preExercise.length;

            const exerciseArbitrary =
                remaining === 0
                    ? fc.constant<LiveFuzzCommand | undefined>(undefined)
                    : fc.option(liveFuzzExerciseCommandArbitrary(), {
                        nil: undefined,
                    });

            return exerciseArbitrary.chain((exercise) => {
                const postExerciseBudget = remaining - (exercise === undefined ? 0 : 1);

                return fc
                    .array(postExerciseOperationArbitrary, {
                        maxLength: postExerciseBudget,
                    })
                    .map((postExercise) => [
                        { kind: "create" },
                        ...preExercise,
                        ...(exercise === undefined ? [] : [exercise]),
                        ...postExercise,
                    ] satisfies readonly LiveFuzzCommand[]);
            });
        });
}

export function createInitialLiveFuzzModel(init: {
    templateId: string;
    payload: Readonly<Record<string, unknown>>;
}): LiveFuzzModel {
    return {
        templateId: init.templateId,
        payload: init.payload,
        active: false,
        createdSeenBy: {
            issuer: false,
            owner: false,
        },
        lastLedgerEndByParticipant: {},
    };
}

export function markLiveFuzzContractCreated(
    model: LiveFuzzModel,
    contractId: string,
): LiveFuzzModel {
    if (model.active || model.contractId !== undefined) {
        throw new Error("Live fuzz model cannot create a second active contract.");
    }

    return {
        ...model,
        contractId,
        active: true,
    };
}

export function markLiveFuzzParticipantObserved(
    model: LiveFuzzModel,
    participant: LiveFuzzParticipant,
): LiveFuzzModel {
    return {
        ...model,
        createdSeenBy: {
            ...model.createdSeenBy,
            [participant]: true,
        },
    };
}

export function markLiveFuzzLedgerEnd(
    model: LiveFuzzModel,
    participant: LiveFuzzParticipant,
    offset: string,
): LiveFuzzModel {
    return {
        ...model,
        lastLedgerEndByParticipant: {
            ...model.lastLedgerEndByParticipant,
            [participant]: offset,
        },
    };
}

export function applyLiveFuzzModelCommand(
    model: LiveFuzzModel,
    command: LiveFuzzCommand,
): LiveFuzzModel {
    switch (command.kind) {
        case "create":
            if (model.active || model.contractId !== undefined) {
                throw new Error("Live fuzz model cannot create a second contract.");
            }

            return model;
        case "query":
        case "events":
            if (model.contractId === undefined) {
                throw new Error(
                    `Live fuzz ${command.kind} requires a known contract ID.`,
                );
            }

            return model;
        case "fetch":
            assertActiveContract(model, "fetch");

            return model;
        case "exercise":
            assertActiveContract(model, "exercise");

            return {
                ...model,
                active: false,
            };
    }
}

function assertActiveContract(
    model: LiveFuzzModel,
    operation: string,
): asserts model is LiveFuzzModel & { contractId: string; active: true } {
    if (model.contractId === undefined) {
        throw new Error(`Live fuzz ${operation} requires a known contract ID.`);
    } else if (!model.active) {
        throw new Error(`Live fuzz ${operation} requires an active contract.`);
    }
}

function liveFuzzParticipantArbitrary(): fc.Arbitrary<LiveFuzzParticipant> {
    return fc.constantFrom("issuer", "owner");
}

function liveFuzzQueryCommandArbitrary(): fc.Arbitrary<LiveFuzzCommand> {
    return liveFuzzParticipantArbitrary().map((participant) => ({
        kind: "query",
        participant,
    }));
}

function liveFuzzReadCommandArbitrary(): fc.Arbitrary<LiveFuzzCommand> {
    return fc.oneof(
        liveFuzzQueryCommandArbitrary(),
        liveFuzzParticipantArbitrary().map((participant) => ({
            kind: "fetch",
            participant,
        })),
    );
}

function liveFuzzEventsCommandArbitrary(): fc.Arbitrary<LiveFuzzCommand> {
    return liveFuzzParticipantArbitrary().map((participant) => ({
        kind: "events",
        participant,
    }));
}

function liveFuzzExerciseCommandArbitrary(): fc.Arbitrary<LiveFuzzCommand> {
    return liveFuzzParticipantArbitrary().map((participant) => ({
        kind: "exercise",
        participant,
    }));
}
