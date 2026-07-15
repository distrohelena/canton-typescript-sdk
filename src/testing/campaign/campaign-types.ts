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

export type CampaignInvariant<Model = unknown, Ghost = unknown> = (
    context: {
        readonly model: Model;
        readonly ghost: Ghost;
    },
) => void | Promise<void>;

export interface InvariantCampaign<Model = unknown, Ghost = unknown> {
    readonly runtime: CampaignRuntime;
    readonly config: ResolvedInvariantCampaignConfig;
    readonly targets: readonly CampaignTarget[];
    readonly handlers: readonly CampaignHandler[];
    readonly invariants: readonly CampaignInvariant<Model, Ghost>[];
}
import { CampaignHandler } from "../handlers/handler.js";
