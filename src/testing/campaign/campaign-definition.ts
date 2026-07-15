import { TestingConfigurationError } from "../errors/testing-configuration-error.js";
import { CampaignHandler } from "../handlers/handler.js";
import {
    CampaignInvariant,
    CampaignRuntime,
    CampaignTarget,
    InvariantCampaign,
    InvariantCampaignConfig,
    ResolvedInvariantCampaignConfig,
} from "./campaign-types.js";

export function defineInvariantCampaign<Model = unknown, Ghost = unknown>(init: {
    readonly runtime: CampaignRuntime;
    readonly config: InvariantCampaignConfig;
    readonly handlers?: readonly CampaignHandler[];
    readonly targets: readonly CampaignTarget[];
    readonly invariants: readonly CampaignInvariant<Model, Ghost>[];
}): InvariantCampaign<Model, Ghost> {
    const config = resolveConfig(init.config);

    const targetKeys = new Set<string>();

    const targets = init.targets.map((target) => {
        validateTarget(target, init.runtime);

        if (targetKeys.has(target.key)) {
            throw new TestingConfigurationError(
                `Invariant campaign target '${target.key}' is duplicated.`,
            );
        }

        targetKeys.add(target.key);

        return Object.freeze({
            key: target.key,
            ...(target.actors === undefined
                ? {}
                : { actors: Object.freeze([...target.actors]) }),
        });
    });

    if (targets.length === 0) {
        throw new TestingConfigurationError(
            "Invariant campaigns require at least one target.",
        );
    }

    const handlers = Object.freeze([...(init.handlers ?? [])]);

    validateHandlers(handlers, init.runtime);

    return Object.freeze({
        runtime: init.runtime,
        config,
        targets: Object.freeze(targets),
        handlers,
        invariants: Object.freeze([...init.invariants]),
    });
}

function validateHandlers(
    handlers: readonly CampaignHandler[],
    runtime: CampaignRuntime,
): void {
    const names = new Set<string>();

    for (const handler of handlers) {
        if (names.has(handler.name)) {
            throw new TestingConfigurationError(
                `Invariant campaign handler '${handler.name}' is duplicated.`,
            );
        }

        names.add(handler.name);

        if (runtime.isolation.kind === "cleanup" && handler.cleanup === "none") {
            throw new TestingConfigurationError(
                `Invariant campaign handler '${handler.name}' requires discovery cleanup under cleanup isolation.`,
            );
        }
    }
}

function resolveConfig(
    config: InvariantCampaignConfig,
): ResolvedInvariantCampaignConfig {
    if (!Number.isSafeInteger(config.runs) || config.runs < 1) {
        throw new TestingConfigurationError(
            "Invariant campaign runs must be a positive safe integer.",
        );
    }

    else if (!Number.isSafeInteger(config.depth) || config.depth < 1) {
        throw new TestingConfigurationError(
            "Invariant campaign depth must be a positive safe integer.",
        );
    }

    return Object.freeze({
        runs: config.runs,
        depth: config.depth,
        failOnRevert: config.failOnRevert ?? false,
        ...(config.path === undefined ? {} : { path: config.path }),
        ...(config.seed === undefined ? {} : { seed: config.seed }),
        ...(config.timeoutMs === undefined ? {} : { timeoutMs: config.timeoutMs }),
    });
}

function validateTarget(
    target: CampaignTarget,
    runtime: CampaignRuntime,
): void {
    if (target.key.length === 0) {
        throw new TestingConfigurationError(
            "Invariant campaign target keys must not be empty.",
        );
    }

    else if (target.actors !== undefined && target.actors.length === 0) {
        throw new TestingConfigurationError(
            `Invariant campaign target '${target.key}' requires at least one actor.`,
        );
    }

    for (const actor of target.actors ?? []) {
        if (runtime.actors[actor] === undefined) {
            throw new TestingConfigurationError(
                `Invariant campaign target '${target.key}' references unknown actor '${actor}'.`,
            );
        }
    }
}
