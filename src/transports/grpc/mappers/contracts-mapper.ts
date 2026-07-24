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
    Filters,
} from "../generated/canton/com/daml/ledger/api/v2/transaction_filter.js";
import { Identifier } from "../generated/canton/com/daml/ledger/api/v2/value.js";

export function mapGrpcQueryContractsRequest(
    request: {
        party?: string;
        parties?: readonly string[];
        allParties?: boolean;
        templateId?: string;
        interfaceId?: string;
        includeInterfaceView?: boolean;
        includeCreatedEventBlob?: boolean;
        activeAtOffset?: string;
        maxPageSize?: number;
        pageToken?: Uint8Array;
    },
): GetActiveContractsPageRequest {
    return {
        activeAtOffset: request.activeAtOffset,
        eventFormat: createEventFormat(request),
        maxPageSize: request.maxPageSize,
        pageToken: request.pageToken,
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
    request: {
        party?: string;
        parties?: readonly string[];
        allParties?: boolean;
        templateId?: string;
        interfaceId?: string;
        includeInterfaceView?: boolean;
        includeCreatedEventBlob?: boolean;
    },
): EventFormat {
    const filters = createFilters(request);

    const parties = request.parties ?? (request.party === undefined ? [] : [request.party]);

    if (request.allParties === true) {
        if (parties.length > 0) {
            throw new ValidationError("allParties cannot be combined with party filters");
        }

        return {
            filtersByParty: {},
            filtersForAnyParty: filters,
            verbose: true,
        };
    } else if (parties.length === 0) {
        throw new ValidationError("A party filter or allParties is required");
    }

    return {
        filtersByParty: Object.fromEntries(parties.map((party) => [party, filters])),
        verbose: true,
    };
}

function createFilters(
    request: {
        templateId?: string;
        interfaceId?: string;
        includeInterfaceView?: boolean;
        includeCreatedEventBlob?: boolean;
    },
): Filters {
    const cumulative: CumulativeFilter[] = [];

    const includeCreatedEventBlob = request.includeCreatedEventBlob ?? false;

    if (request.templateId) {
        cumulative.push({
            identifierFilter: {
                oneofKind: "templateFilter",
                templateFilter: {
                    templateId: parseIdentifier(request.templateId, "templateId"),
                    includeCreatedEventBlob,
                },
            },
        });
    }

    if (request.interfaceId) {
        cumulative.push({
            identifierFilter: {
                oneofKind: "interfaceFilter",
                interfaceFilter: {
                    interfaceId: parseIdentifier(request.interfaceId, "interfaceId"),
                    includeInterfaceView: request.includeInterfaceView ?? false,
                    includeCreatedEventBlob,
                },
            },
        });
    }

    if (cumulative.length === 0) {
        cumulative.push(createWildcardFilter(includeCreatedEventBlob));
    }

    return { cumulative };
}

function createWildcardFilter(
    includeCreatedEventBlob: boolean,
): CumulativeFilter {
    return {
        identifierFilter: {
            oneofKind: "wildcardFilter",
            wildcardFilter: {
                includeCreatedEventBlob,
            },
        },
    };
}

function parseIdentifier(
    value: string,
    propertyName: string,
): Identifier {
    const parts = value.split(":");

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
        `${propertyName} must be '<module>:<entity>' or '<package>:<module>:<entity>', but was '${value}'.`,
    );
}
