import { AssembleSignedTopologyTransactionsRequest } from "../../core/types/requests/assemble-signed-topology-transactions-request.js";
import { ValidationError } from "../../core/errors/validation-error.js";
import { SignedTopologyTransaction } from "../../core/types/topology/signed-topology-transaction.js";
import { TopologySignatureFormat } from "../../core/types/topology/topology-signature-format.js";
import { TopologyTransactionSignature } from "../../core/types/topology/topology-transaction-signature.js";

export function assembleSignedTopologyTransactions(
    request: AssembleSignedTopologyTransactionsRequest,
): SignedTopologyTransaction[] {
    const preparedTransactionsByHash = new Map(
        request.preparedTransactions.map((preparedTransaction) => [
            toHex(preparedTransaction.transactionHash),
            preparedTransaction,
        ]),
    );

    const signaturesByHash = new Map<string, TopologyTransactionSignature[]>();
    const seenSignerPairs = new Set<string>();

    for (const signature of request.signatures) {
        validateExternalSignature(signature);

        const hashKey = toHex(signature.transactionHash);
        const preparedTransaction = preparedTransactionsByHash.get(hashKey);

        if (preparedTransaction === undefined) {
            throw new ValidationError(
                `No prepared transaction matches detached signature hash ${hashKey}.`,
            );
        }

        const signerKey = `${hashKey}:${signature.signedByFingerprint}`;

        if (seenSignerPairs.has(signerKey)) {
            throw new ValidationError(
                `Duplicate detached signature for signer ${signature.signedByFingerprint} on transaction ${hashKey}.`,
            );
        }

        seenSignerPairs.add(signerKey);

        const mappedSignature = new TopologyTransactionSignature({
            format: mapExternalSignatureFormatToRawFormat(
                signature.signatureFormat,
            ),
            signature: signature.signature,
            signedByFingerprint: signature.signedByFingerprint,
            signingAlgorithmSpec:
                signature.signingAlgorithmSpec
                ?? mapExternalSignatureFormatToAlgorithmSpec(
                    signature.signatureFormat,
                ),
            signatureDelegation: signature.signatureDelegation,
        });

        const existing = signaturesByHash.get(hashKey) ?? [];

        existing.push(mappedSignature);
        signaturesByHash.set(hashKey, existing);
    }

    return request.preparedTransactions.map(
        (preparedTransaction) =>
            new SignedTopologyTransaction({
                transaction: preparedTransaction.serializedTransaction,
                signatures:
                    signaturesByHash.get(
                        toHex(preparedTransaction.transactionHash),
                    ) ?? [],
                proposal: preparedTransaction.proposal,
                multiTransactionSignatures: [],
            }),
    );
}

function validateExternalSignature(signature: {
    transactionHash: Uint8Array;
    signature: Uint8Array;
    signedByFingerprint: string;
    signatureFormat?: TopologySignatureFormat;
}): void {
    if (signature.transactionHash.length === 0) {
        throw new ValidationError(
            "Detached topology signatures require a transactionHash.",
        );
    }

    if (signature.signature.length === 0) {
        throw new ValidationError(
            "Detached topology signatures require signature bytes.",
        );
    }

    if (signature.signedByFingerprint.length === 0) {
        throw new ValidationError(
            "Detached topology signatures require signedByFingerprint.",
        );
    }

    if (signature.signatureFormat === undefined) {
        throw new ValidationError(
            "Detached topology signatures require signatureFormat.",
        );
    }
}

function mapExternalSignatureFormatToRawFormat(
    signatureFormat: TopologySignatureFormat,
): string {
    switch (signatureFormat) {
        case TopologySignatureFormat.ed25519:
            return "concat";
        default:
            return "unspecified";
    }
}

function mapExternalSignatureFormatToAlgorithmSpec(
    signatureFormat: TopologySignatureFormat,
): string {
    switch (signatureFormat) {
        case TopologySignatureFormat.ed25519:
            return "ed25519";
        default:
            return "unspecified";
    }
}

function toHex(bytes: Uint8Array): string {
    return [...bytes]
        .map((value) => value.toString(16).padStart(2, "0"))
        .join("");
}
