import { StreamTransactionsRequest } from "../../../core/types/requests/stream-transactions-request.js";
import { GetUpdatesRequest } from "../generated/canton/com/daml/ledger/api/v2/update_service.js";
import { TransactionShape } from "../generated/canton/com/daml/ledger/api/v2/transaction_filter.js";
import { mapGrpcQueryContractsRequest } from "./contracts-mapper.js";

export function mapGrpcStreamTransactionsRequest(
    request: StreamTransactionsRequest,
): GetUpdatesRequest {
    const queryRequest = mapGrpcQueryContractsRequest({
        party: request.party,
        templateId: request.templateId ?? "",
    });

    return {
        beginExclusive: request.beginOffset ?? "0",
        endInclusive: request.endOffset,
        updateFormat: {
            includeTransactions: {
                eventFormat: queryRequest.eventFormat,
                transactionShape: TransactionShape.ACS_DELTA,
            },
        },
        descendingOrder: false,
    };
}

export function mapGrpcTransactionEvents(
    payload: { events?: unknown[] } | readonly unknown[],
): readonly unknown[] {
    if (Array.isArray(payload)) {
        return payload.map((item) => {
            if (isGrpcUpdateEnvelope(item)) {
                switch (item.update.oneofKind) {
                    case "transaction":
                        return item.update.transaction;
                    case "reassignment":
                        return item.update.reassignment;
                    case "offsetCheckpoint":
                        return item.update.offsetCheckpoint;
                    case "topologyTransaction":
                        return item.update.topologyTransaction;
                }
            }

            return item;
        });
    }

    const envelope = payload as { events?: unknown[] };

    return envelope.events ?? [];
}

function isGrpcUpdateEnvelope(
    value: unknown,
): value is {
    update: {
        oneofKind: string;
        transaction?: unknown;
        reassignment?: unknown;
        offsetCheckpoint?: unknown;
        topologyTransaction?: unknown;
    };
} {
    return (
        typeof value === "object"
        && value !== null
        && "update" in value
        && typeof value.update === "object"
        && value.update !== null
        && "oneofKind" in value.update
    );
}
