import { PreparedTopologyTransaction } from "../topology/prepared-topology-transaction.js";
import { ExternalPartySigningResult } from "./create-external-party-request.js";

export interface PreparedDecentralizedPartySigningRequest {
    readonly id: string;
    readonly transactionHash: Uint8Array;
    readonly payload: Uint8Array;
    readonly publicKeyFingerprint: string;
    readonly role: "owner" | "partySigningKey";
}

export class PreparedDecentralizedParty {
    public readonly partyId: string;
    public readonly decentralizedNamespace: string;
    public readonly ownerThreshold: number;
    public readonly partySigningThreshold: number;
    public readonly transactions: readonly PreparedTopologyTransaction[];
    public readonly signingRequests: readonly PreparedDecentralizedPartySigningRequest[];

    public constructor(init: {
        partyId: string;
        decentralizedNamespace: string;
        ownerThreshold: number;
        partySigningThreshold: number;
        transactions?: readonly PreparedTopologyTransaction[];
        signingRequests?: readonly PreparedDecentralizedPartySigningRequest[];
    }) {
        this.partyId = init.partyId;
        this.decentralizedNamespace = init.decentralizedNamespace;
        this.ownerThreshold = init.ownerThreshold;
        this.partySigningThreshold = init.partySigningThreshold;
        this.transactions = [...(init.transactions ?? [])].map(
            (transaction) => new PreparedTopologyTransaction({
                serializedTransaction: transaction.serializedTransaction,
                transactionHash: transaction.transactionHash,
                proposal: transaction.proposal,
            }),
        );
        this.signingRequests = [...(init.signingRequests ?? [])].map(
            (request) => ({
                ...request,
                transactionHash: new Uint8Array(request.transactionHash),
                payload: new Uint8Array(request.payload),
            }),
        );
    }
}

export interface DecentralizedPartyDetachedSignature {
    readonly signingRequestId: string;
    readonly result: ExternalPartySigningResult;
}

export class FinalizeDecentralizedPartyRequest {
    public readonly prepared: PreparedDecentralizedParty;
    public readonly signatures: readonly DecentralizedPartyDetachedSignature[];

    public constructor(init: {
        prepared: PreparedDecentralizedParty;
        signatures?: readonly DecentralizedPartyDetachedSignature[];
    }) {
        this.prepared = init.prepared;
        this.signatures = [...(init.signatures ?? [])].map((signature) => ({
            signingRequestId: signature.signingRequestId,
            result: {
                signature: new Uint8Array(signature.result.signature),
                format: signature.result.format,
                signingAlgorithmSpec: signature.result.signingAlgorithmSpec,
            },
        }));
    }
}
