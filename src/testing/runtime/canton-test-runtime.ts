import { CampaignIsolation, CantonTestActor } from "../campaign/campaign-types.js";
import { TestingConfigurationError } from "../errors/testing-configuration-error.js";

export interface CantonTestRoute {
    readonly actAs: readonly string[];
    readonly actor: string;
    readonly participant: string;
    readonly party: string;
    readonly readAs: readonly string[];
}

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
