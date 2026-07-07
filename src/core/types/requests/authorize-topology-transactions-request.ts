import { TopologyDuration } from "../topology/topology-duration.js";
import { TopologyForceFlag } from "../topology/topology-force-flag.js";
import { TopologyMapping } from "../topology/topology-mapping.js";
import { TopologyMappingOperation } from "../topology/topology-mapping-operation.js";
import { TopologyStoreId } from "../topology/topology-store-id.js";

export class AuthorizeTopologyTransactionsProposal {
    public readonly operation: TopologyMappingOperation;
    public readonly serial: number;
    public readonly mapping?: TopologyMapping;

    public constructor(init: {
        operation?: TopologyMappingOperation;
        serial?: number;
        mapping?: TopologyMapping;
    } = {}) {
        this.operation =
            init.operation ?? TopologyMappingOperation.unspecified;
        this.serial = init.serial ?? 0;
        this.mapping = init.mapping;
    }
}

export class AuthorizeTopologyTransactionsRequest {
    public readonly proposal?: AuthorizeTopologyTransactionsProposal;
    public readonly transactionHash?: string;
    public readonly mustFullyAuthorize: boolean;
    public readonly forceChanges: TopologyForceFlag[];
    public readonly signedBy: string[];
    public readonly store?: TopologyStoreId;
    public readonly waitToBecomeEffective?: TopologyDuration;

    public constructor(init: {
        proposal?:
            | AuthorizeTopologyTransactionsProposal
            | {
                  operation?: TopologyMappingOperation;
                  serial?: number;
                  mapping?: TopologyMapping;
              };
        transactionHash?: string;
        mustFullyAuthorize?: boolean;
        forceChanges?: TopologyForceFlag[];
        signedBy?: string[];
        store?: TopologyStoreId;
        waitToBecomeEffective?: TopologyDuration;
    } = {}) {
        this.proposal =
            init.proposal === undefined
                ? undefined
                : init.proposal instanceof AuthorizeTopologyTransactionsProposal
                  ? init.proposal
                  : new AuthorizeTopologyTransactionsProposal(init.proposal);
        this.transactionHash = init.transactionHash;
        this.mustFullyAuthorize = init.mustFullyAuthorize ?? false;
        this.forceChanges = [...(init.forceChanges ?? [])];
        this.signedBy = [...(init.signedBy ?? [])];
        this.store = init.store;
        this.waitToBecomeEffective = init.waitToBecomeEffective;
    }
}
