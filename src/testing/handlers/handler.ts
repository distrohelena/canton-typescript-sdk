export type CampaignHandlerCleanup =
    | "none"
    | {
        readonly archive: (contractId: string) => Promise<void>;
        readonly discover: () => Promise<readonly string[]>;
        readonly trackCreated?: (contractId: string) => void;
    };

export interface CampaignHandler<Input = unknown, Context = unknown> {
    readonly assume?: (context: Context, input: Input) => boolean | Promise<boolean>;
    readonly cleanup: CampaignHandlerCleanup;
    readonly name: string;
}

export function handler<Input = unknown, Context = unknown>(
    name: string,
    init: Omit<CampaignHandler<Input, Context>, "name">,
): CampaignHandler<Input, Context> {
    if (name.length === 0) {
        throw new Error("Invariant campaign handler names must not be empty.");
    }

    return Object.freeze({
        name,
        cleanup: init.cleanup,
        ...(init.assume === undefined ? {} : { assume: init.assume }),
    });
}

export async function evaluateHandlerAssumptionAsync<Input, Context>(
    value: CampaignHandler<Input, Context>,
    context: Context,
    input: Input,
): Promise<
    | { readonly kind: "eligible" }
    | { readonly kind: "discarded"; readonly reason: string }
> {
    if (value.assume === undefined || await value.assume(context, input)) {
        return { kind: "eligible" };
    }

    return {
        kind: "discarded",
        reason: "handler assumption returned false",
    };
}

export function bound(value: number, minimum: number, maximum: number): number;
export function bound(value: bigint, minimum: bigint, maximum: bigint): bigint;
export function bound(
    value: number | bigint,
    minimum: number | bigint,
    maximum: number | bigint,
): number | bigint {
    if (minimum > maximum) {
        throw new Error("Invariant campaign bounds require minimum <= maximum.");
    }

    else if (value < minimum) {
        return minimum;
    } else if (value > maximum) {
        return maximum;
    }

    return value;
}
