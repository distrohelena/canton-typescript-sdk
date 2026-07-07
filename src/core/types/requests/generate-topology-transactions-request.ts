import { TopologyMapping } from "../topology/topology-mapping.js";
import { TopologyMappingOperation } from "../topology/topology-mapping-operation.js";
import { TopologyStoreId } from "../topology/topology-store-id.js";

export class GenerateTopologyTransactionsProposal {
    public readonly operation: TopologyMappingOperation;
    public readonly serial: number;
    public readonly mapping?: TopologyMapping;
    public readonly store?: TopologyStoreId;

    public constructor(init: {
        operation?: TopologyMappingOperation;
        serial?: number;
        mapping?: TopologyMapping;
        store?: TopologyStoreId;
    } = {}) {
        this.operation =
            init.operation ?? TopologyMappingOperation.unspecified;
        this.serial = init.serial ?? 0;
        this.mapping = init.mapping;
        this.store = init.store;
    }
}

export class GenerateTopologyTransactionsRequest {
    public readonly proposals: GenerateTopologyTransactionsProposal[];

    public constructor(init: {
        proposals?:
            | GenerateTopologyTransactionsProposal[]
            | {
                  operation?: TopologyMappingOperation;
                  serial?: number;
                  mapping?: TopologyMapping;
                  store?: TopologyStoreId;
              }[];
    } = {}) {
        this.proposals = (init.proposals ?? []).map((proposal) =>
            proposal instanceof GenerateTopologyTransactionsProposal
                ? proposal
                : new GenerateTopologyTransactionsProposal(proposal),
        );
    }
}
