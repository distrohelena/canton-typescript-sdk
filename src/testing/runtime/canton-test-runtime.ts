import { CampaignIsolation, CantonTestActor } from "../campaign/campaign-types.js";
import { TestingConfigurationError } from "../errors/testing-configuration-error.js";

export interface CantonTestRoute {
    readonly actAs: readonly string[];
    readonly actor: string;
    readonly participant: string;
    readonly party: string;
    readonly readAs: readonly string[];
}

export type CantonCommandOutcome =
    | { readonly kind: "accepted" }
    | {
        readonly details: string;
        readonly kind: "protocol-revert";
        readonly statusCode: number;
    }
    | {
        readonly details: string;
        readonly kind: "transport-error";
        readonly statusCode?: number;
    }
    | {
        readonly details: string;
        readonly kind: "timeout";
        readonly statusCode?: number;
    }
    | { readonly details: string; readonly kind: "malformed-response" }
    | {
        readonly details: string;
        readonly kind: "unknown-commit-outcome";
        readonly statusCode?: number;
    };

export interface CantonTestRuntime<Participant = unknown> {
    readonly actors: Readonly<Record<string, CantonTestActor>>;
    readonly isolation: CampaignIsolation;
    readonly participants: Readonly<Record<string, Participant>>;
    resolveRoute(actor: string): CantonTestRoute;
}

export function createCantonTestRuntime<Participant>(init: {
    readonly actors: Readonly<Record<string, CantonTestActor>>;
    readonly isolation: CampaignIsolation;
    readonly participants: Readonly<Record<string, Participant>>;
}): CantonTestRuntime<Participant> {
    for (const [name, actor] of Object.entries(init.actors)) {
        if (init.participants[actor.participant] === undefined) {
            throw new TestingConfigurationError(
                `Canton test actor '${name}' references unknown participant '${actor.participant}'.`,
            );
        }
    }

    const actors = Object.freeze({ ...init.actors });

    const participants = Object.freeze({ ...init.participants });

    return Object.freeze({
        actors,
        participants,
        isolation: init.isolation,
        resolveRoute(actorName: string): CantonTestRoute {
            const actor = actors[actorName];

            if (actor === undefined) {
                throw new TestingConfigurationError(
                    `Canton test runtime has no actor '${actorName}'.`,
                );
            }

            return Object.freeze({
                actor: actorName,
                participant: actor.participant,
                party: actor.party,
                actAs: Object.freeze([...(actor.actAs ?? [actor.party])]),
                readAs: Object.freeze([...(actor.readAs ?? [])]),
            });
        },
    });
}

export function classifyCantonCommandOutcome(input: {
    readonly error?: unknown;
    readonly response?: unknown;
}): CantonCommandOutcome {
    if (input.error === undefined) {
        return { kind: "accepted" };
    }

    const statusCode = readNumberProperty(input.error, "code");

    const details = readStringProperty(input.error, "details") ?? "Unknown command failure.";

    if (
        (statusCode === 9 && details.startsWith("DAML_INTERPRETATION_ERROR("))
        || (statusCode === 3 && details.startsWith("DAML_AUTHORIZATION_ERROR("))
    ) {
        return { kind: "protocol-revert", statusCode, details };
    } else if (statusCode === 14 || statusCode === 13) {
        return { kind: "transport-error", statusCode, details };
    } else if (statusCode === 4) {
        return { kind: "timeout", statusCode, details };
    }

    return { kind: "unknown-commit-outcome", statusCode, details };
}

function readNumberProperty(value: unknown, key: string): number | undefined {
    const candidate = value as Record<string, unknown>;

    const property = candidate?.[key];

    return typeof property === "number" ? property : undefined;
}

function readStringProperty(value: unknown, key: string): string | undefined {
    const candidate = value as Record<string, unknown>;

    const property = candidate?.[key];

    return typeof property === "string" ? property : undefined;
}
