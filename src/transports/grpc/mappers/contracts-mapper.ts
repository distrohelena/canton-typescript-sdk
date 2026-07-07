import { ValidationError } from "../../../core/errors/validation-error.js";
import { GetContractRequest } from "../../../core/types/requests/get-contract-request.js";
import { GetContractResponse } from "../../../core/types/responses/get-contract-response.js";
import { QueryContractsResponse } from "../../../core/types/responses/query-contracts-response.js";
import { GetContractRequest as GrpcGetContractRequest } from "../generated/canton/com/daml/ledger/api/v2/contract_service.js";
import { GetContractResponse as GrpcGetContractResponse } from "../generated/canton/com/daml/ledger/api/v2/contract_service.js";
import { GetActiveContractsPageRequest } from "../generated/canton/com/daml/ledger/api/v2/state_service.js";
import {
    CumulativeFilter,
    EventFormat,
} from "../generated/canton/com/daml/ledger/api/v2/transaction_filter.js";
import { Identifier } from "../generated/canton/com/daml/ledger/api/v2/value.js";

export function mapGrpcQueryContractsRequest(
    request: {
        party: string;
        templateId?: string;
    },
): GetActiveContractsPageRequest {
    return {
        eventFormat: createEventFormat(request.party, request.templateId),
    };
}

export function mapGrpcQueryContracts(payload: {
    contracts?: unknown[];
    activeContracts?: Array<{
        contractEntry?: {
            oneofKind?: string;
            activeContract?: unknown;
        };
    }>;
}): QueryContractsResponse {
    return new QueryContractsResponse({
        contracts:
            payload.contracts
            ?? payload.activeContracts?.map((contract) =>
                contract.contractEntry?.oneofKind === "activeContract"
                    ? contract.contractEntry.activeContract
                    : contract,
            )
            ?? [],
    });
}

export function mapGrpcGetContractRequest(
    request: GetContractRequest,
): GrpcGetContractRequest {
    return {
        contractId: request.contractId,
        queryingParties: [...request.queryingParties],
    };
}

export function mapGrpcGetContract(
    payload: Partial<GrpcGetContractResponse>,
): GetContractResponse {
    return new GetContractResponse({
        createdEvent: payload.createdEvent,
    });
}

function createEventFormat(
    party: string,
    templateId?: string,
): EventFormat {
    return {
        filtersByParty: {
            [party]: {
                cumulative: [createTemplateFilter(templateId)],
            },
        },
        verbose: true,
    };
}

function createTemplateFilter(templateId?: string): CumulativeFilter {
    if (!templateId) {
        return {
            identifierFilter: {
                oneofKind: "wildcardFilter",
                wildcardFilter: {
                    includeCreatedEventBlob: false,
                },
            },
        };
    }

    return {
        identifierFilter: {
            oneofKind: "templateFilter",
            templateFilter: {
                templateId: parseTemplateIdentifier(templateId),
                includeCreatedEventBlob: false,
            },
        },
    };
}

function parseTemplateIdentifier(templateId: string): Identifier {
    const parts = templateId.split(":");

    if (parts.length === 2) {
        return {
            packageId: "",
            moduleName: parts[0],
            entityName: parts[1],
        };
    }

    else if (parts.length === 3) {
        return {
            packageId: parts[0],
            moduleName: parts[1],
            entityName: parts[2],
        };
    }

    throw new ValidationError(
        `templateId must be '<module>:<entity>' or '<package>:<module>:<entity>', but was '${templateId}'.`,
    );
}
