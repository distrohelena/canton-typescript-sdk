import { TransportKind } from "../../../src/index.js";
import {
    LiveTestEnvironment,
    createLiveNodeTestEnvironment,
} from "./live-test-environment.js";

export interface LiveMultiNodeEnvironment {
    readonly runId: string;
    readonly transportKind: TransportKind;
    readonly nodes: readonly LiveTestEnvironment[];
}

export function createLiveMultiNodeEnvironment(init: {
    transportKind: TransportKind;
    runId?: string;
    nodeCount?: number;
}): LiveMultiNodeEnvironment {
    const nodeCount = init.nodeCount ?? getConfiguredLiveMultiNodeCount();
    const primaryNodeEnvironment = createLiveNodeTestEnvironment({
        transportKind: init.transportKind,
        nodeIndex: 0,
        runId: init.runId,
    });

    const nodes = Array.from({ length: nodeCount }, (_, index) =>
        index === 0
            ? primaryNodeEnvironment
            : createLiveNodeTestEnvironment({
                  transportKind: init.transportKind,
                  nodeIndex: index,
                  runId: primaryNodeEnvironment.runId,
              }),
    );

    return {
        runId: primaryNodeEnvironment.runId,
        transportKind: init.transportKind,
        nodes,
    };
}

export function getConfiguredLiveMultiNodeCount(): number {
    return 3;
}
