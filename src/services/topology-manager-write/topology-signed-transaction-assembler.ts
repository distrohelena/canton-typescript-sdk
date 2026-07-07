import { AssembleSignedTopologyTransactionsRequest } from "../../core/types/requests/assemble-signed-topology-transactions-request.js";
import { SignedTopologyTransaction } from "../../core/types/topology/signed-topology-transaction.js";

export function assembleSignedTopologyTransactions(
    request: AssembleSignedTopologyTransactionsRequest,
): SignedTopologyTransaction[] {
    return request.preparedTransactions.map(
        (preparedTransaction) =>
            new SignedTopologyTransaction({
                transaction: preparedTransaction.serializedTransaction,
                signatures: [],
                proposal: preparedTransaction.proposal,
                multiTransactionSignatures: [],
            }),
    );
}
