import { GetUpdateByOffsetRequest } from "../../core/types/requests/get-update-by-offset-request.js";
import { GetUpdateByOffsetResponse } from "../../core/types/responses/get-update-by-offset-response.js";
import { ReplayUnsupportedUpdateException } from "../errors/replay-unsupported-update.exception.js";
import { ReplayEntrypoint } from "./replay-entrypoint.js";
import { validateReplayVisibilityOrThrow } from "./replay-update-visibility-validator.js";
import { TransactionShape } from "../../transports/grpc/generated/canton/com/daml/ledger/api/v2/transaction_filter.js";

interface IReplayUpdateService {
    getUpdateByOffsetAsync(
        request: GetUpdateByOffsetRequest,
    ): Promise<GetUpdateByOffsetResponse>;
}

export class ReplayUpdateLoader {
    public constructor(
        private readonly dependencies: {
            updateService: IReplayUpdateService;
            visibleParties?: readonly string[];
        },
    ) {}

    public async loadOrThrowAsync(offset: string): Promise<{
        kind: "transaction";
        offset: string;
        updateId?: string;
        actAs?: readonly string[];
        readAs?: readonly string[];
        events: readonly unknown[];
        entrypoint: ReplayEntrypoint;
    }> {
        const response =
            await this.dependencies.updateService.getUpdateByOffsetAsync(
                new GetUpdateByOffsetRequest({
                    offset,
                    updateFormat: createReplayUpdateFormat(
                        this.dependencies.visibleParties,
                    ),
                }),
            );
        const transaction = response.update as
            | {
                  updateId?: string;
                  offset?: string;
                  actAs?: readonly string[];
                  readAs?: readonly string[];
                  events?: {
                      event?: {
                          oneofKind?: string;
                          created?: {
                              contractId?: string;
                              templateId?: {
                                  packageId?: string;
                                  moduleName?: string;
                                  entityName?: string;
                              };
                              createArguments?: unknown;
                          };
                          exercised?: {
                              templateId?: {
                                  packageId?: string;
                                  moduleName?: string;
                                  entityName?: string;
                              };
                              contractId?: string;
                              choice?: string;
                              choiceArgument?: unknown;
                          };
                      };
                  }[];
              }
            | undefined;

        if (
            transaction === undefined ||
            !Array.isArray(transaction.events) ||
            transaction.offset === undefined
        ) {
            throw new ReplayUnsupportedUpdateException(
                "update is not a replayable transaction payload",
            );
        }

        validateReplayVisibilityOrThrow(transaction);

        return {
            kind: "transaction",
            offset: transaction.offset,
            updateId: transaction.updateId,
            actAs: transaction.actAs,
            readAs: transaction.readAs,
            events: transaction.events,
            entrypoint: this.deriveEntrypointOrThrow(transaction.events),
        };
    }

    private deriveEntrypointOrThrow(
        events: readonly {
            event?: {
                oneofKind?: string;
                created?: {
                    templateId?: {
                        packageId?: string;
                        moduleName?: string;
                        entityName?: string;
                    };
                    createArguments?: unknown;
                };
                exercised?: {
                    templateId?: {
                        packageId?: string;
                        moduleName?: string;
                        entityName?: string;
                    };
                    contractId?: string;
                    choice?: string;
                    choiceArgument?: unknown;
                };
            };
        }[],
    ): ReplayEntrypoint {
        const firstEvent = events[0]?.event;

        if (
            firstEvent?.oneofKind === "created" &&
            firstEvent.created?.templateId !== undefined &&
            firstEvent.created.createArguments !== undefined
        ) {
            return new ReplayEntrypoint({
                kind: "create",
                templateId: firstEvent.created.templateId,
                argument: firstEvent.created.createArguments,
            });
        }

        if (
            firstEvent?.oneofKind === "exercised" &&
            firstEvent.exercised?.templateId !== undefined &&
            firstEvent.exercised.contractId !== undefined &&
            firstEvent.exercised.choice !== undefined &&
            firstEvent.exercised.choiceArgument !== undefined
        ) {
            return new ReplayEntrypoint({
                kind: "exercise",
                templateId: firstEvent.exercised.templateId,
                contractId: firstEvent.exercised.contractId,
                choice: firstEvent.exercised.choice,
                argument: firstEvent.exercised.choiceArgument,
            });
        }

        throw new ReplayUnsupportedUpdateException(
            "could not derive a replay entrypoint from the visible update payload",
        );
    }
}

function createReplayUpdateFormat(
    visibleParties?: readonly string[],
): Record<string, unknown> {
    return {
        includeTransactions: {
            eventFormat: createReplayEventFormat(visibleParties),
            transactionShape: TransactionShape.LEDGER_EFFECTS,
        },
    };
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
