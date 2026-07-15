export type CampaignRunIsolation =
    | { readonly kind: "cleanup" }
    | {
        readonly kind: "external";
        readonly reset: (phase: "before-run" | "after-run") => Promise<void>;
    }
    | {
        readonly create: () => Promise<string>;
        readonly kind: "snapshot";
        readonly restore: (snapshot: string) => Promise<void>;
    };

export async function runWithCampaignIsolationAsync(init: {
    readonly isolation: CampaignRunIsolation;
    readonly runAsync: () => Promise<void>;
}): Promise<void> {
    if (init.isolation.kind === "external") {
        await init.isolation.reset("before-run");

        try {
            await init.runAsync();
        } finally {
            await init.isolation.reset("after-run");
        }

        return;
    } else if (init.isolation.kind === "snapshot") {
        const snapshot = await init.isolation.create();

        try {
            await init.runAsync();
        } finally {
            await init.isolation.restore(snapshot);
        }

        return;
    }

    await init.runAsync();
}
