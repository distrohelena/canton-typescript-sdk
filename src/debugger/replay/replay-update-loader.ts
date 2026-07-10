import { GetUpdateByOffsetRequest } from "../../core/types/requests/get-update-by-offset-request.js";
import { GetUpdateByOffsetResponse } from "../../core/types/responses/get-update-by-offset-response.js";
import { ReplayUnsupportedUpdateException } from "../errors/replay-unsupported-update.exception.js";
import { ReplayEntrypoint } from "./replay-entrypoint.js";
import { validateReplayVisibilityOrThrow } from "./replay-update-visibility-validator.js";

interface IReplayUpdateService {
    getUpdateByOffsetAsync(
        request: GetUpdateByOffsetRequest,
    ): Promise<GetUpdateByOffsetResponse>;
}

export class ReplayUpdateLoader {
    public constructor(
        private readonly dependencies: {
            updateService: IReplayUpdateService;
        },
    ) {}

    public async loadOrThrowAsync(offset: string): Promise<{
        kind: "transaction";
        offset: string;
        updateId?: string;
        events: readonly unknown[];
        entrypoint: ReplayEntrypoint;
    }> {
        const response =
            await this.dependencies.updateService.getUpdateByOffsetAsync(
                new GetUpdateByOffsetRequest({
                    offset,
                    updateFormat: {
                        includeTransactions: true,
                        includeCreatedEventBlob: true,
                        includeExercises: true,
                    },
                }),
            );
        const transaction = response.update as
            | {
                  updateId?: string;
                  offset?: string;
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
