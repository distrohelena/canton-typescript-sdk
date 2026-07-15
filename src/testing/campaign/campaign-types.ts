export interface CantonTestActor {
    readonly party: string;
    readonly participant: string;
    readonly actAs?: readonly string[];
    readonly readAs?: readonly string[];
}

export type CampaignIsolation =
    | { readonly kind: "cleanup" }
    | { readonly kind: "external" }
    | { readonly kind: "snapshot" };

export interface CampaignRuntime {
    readonly actors: Readonly<Record<string, CantonTestActor>>;
    readonly isolation: CampaignIsolation;
}

export interface InvariantCampaignConfig {
    readonly runs: number;
    readonly depth: number;
    readonly failOnRevert?: boolean;
    readonly path?: string;
    readonly seed?: number;
    readonly timeoutMs?: number;
}

export interface ResolvedInvariantCampaignConfig {
    readonly runs: number;
    readonly depth: number;
    readonly failOnRevert: boolean;
    readonly path?: string;
    readonly seed?: number;
    readonly timeoutMs?: number;
}

export interface CampaignTarget {
    readonly key: string;
    readonly actors?: readonly string[];
}

export type CampaignInvariant<Model = unknown, Ghost = unknown> = ((
    context: {
        readonly model: Model;
        readonly ghost: Ghost;
    },
) => void | Promise<void>) & {
    readonly label?: string;
};

export function invariant<Model = unknown, Ghost = unknown>(
    label: string,
    check: CampaignInvariant<Model, Ghost>,
): CampaignInvariant<Model, Ghost> {
    if (label.length === 0) {
        throw new Error("Invariant campaign invariant names must not be empty.");
    }

    const named: CampaignInvariant<Model, Ghost> = (context) => check(context);

    Object.defineProperty(named, "label", {
        value: label,
        enumerable: true,
    });

    return Object.freeze(named);
}

export interface InvariantCampaign<Model = unknown, Ghost = unknown> {
    readonly runtime: CampaignRuntime;
    readonly config: ResolvedInvariantCampaignConfig;
    readonly targets: readonly CampaignTarget[];
    readonly handlers: readonly CampaignHandler[];
    readonly invariants: readonly CampaignInvariant<Model, Ghost>[];
}
import { CampaignHandler } from "../handlers/handler.js";
