import { CreateCommand } from "../../core/types/commands/create-command.js";
import { ExerciseCommand } from "../../core/types/commands/exercise-command.js";
import { DamlRecord } from "../../core/types/daml-values.js";
import { SubmitCommandRequest } from "../../core/types/requests/submit-command-request.js";
import { DeclarativeAction } from "../daml/daml-action-arbitrary.js";
import { DeclarativeChoiceAction } from "../daml/daml-choice-action-arbitrary.js";
import { TestingConfigurationError } from "../errors/testing-configuration-error.js";
import {
    CantonTestRuntime,
    toCampaignMetricOutcome,
} from "./canton-test-runtime.js";
import { CampaignMetricOutcome } from "../campaign/campaign-metrics.js";

/**
 * Converts a generated declarative action into SDK command types and submits
 * it over the actor's configured Canton route. Choice actions deliberately
 * require an explicit contract resolver: the testing SDK never guesses an
 * active contract ID from stale local state.
 */
export async function executeDeclarativeActionAsync(init: {
    readonly action: DeclarativeAction;
    readonly applicationId: string;
    readonly resolveContractIdAsync?: (action: DeclarativeChoiceAction) => Promise<string>;
    readonly runtime: CantonTestRuntime;
}): Promise<CampaignMetricOutcome> {
    const route = init.runtime.resolveRoute(init.action.actor);

    const command = "choice" in init.action
        ? await createExerciseCommandAsync(init.action, init.resolveContractIdAsync)
        : new CreateCommand({
            templateId: toTemplateId(init.action.templateId),
            createArguments: new DamlRecord({ ...init.action.payload }),
        });

    return toCampaignMetricOutcome(await init.runtime.submitAndWaitAsync(
        init.action.actor,
        new SubmitCommandRequest({
            applicationId: init.applicationId,
            actAs: route.actAs,
            readAs: route.readAs,
            command,
        }),
    ));
}

async function createExerciseCommandAsync(
    action: DeclarativeChoiceAction,
    resolveContractIdAsync: ((action: DeclarativeChoiceAction) => Promise<string>) | undefined,
): Promise<ExerciseCommand> {
    if (resolveContractIdAsync === undefined) {
        throw new TestingConfigurationError(
            `Declarative choice target '${action.targetKey}' requires resolveContractIdAsync.`,
        );
    }

    const contractId = await resolveContractIdAsync(action);

    if (contractId.length === 0) {
        throw new TestingConfigurationError(
            `Declarative choice target '${action.targetKey}' resolved an empty contract ID.`,
        );
    }

    return new ExerciseCommand({
        templateId: toTemplateId(action.templateId),
        contractId,
        choice: action.choice,
        choiceArgument: action.argument,
    });
}

function toTemplateId(templateId: string) {
    const [packageId = "", moduleName, entityName] = templateId.split(":").length === 2
        ? ["", ...templateId.split(":")]
        : templateId.split(":");

    return { packageId, moduleName, entityName };
}
