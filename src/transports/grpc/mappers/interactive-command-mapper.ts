import { ValidationError } from "../../../core/errors/validation-error.js";
import { SignCommandResult } from "../../../core/signing/sign-command-result.js";
import { SubmitCommandRequest } from "../../../core/types/requests/submit-command-request.js";
import { SubmitCommandResponse } from "../../../core/types/responses/submit-command-response.js";
import {
    Signature,
    SignatureFormat,
    SigningAlgorithmSpec,
} from "../generated/canton/com/daml/ledger/api/v2/crypto.js";
import {
    ExecuteSubmissionAndWaitRequest,
    ExecuteSubmissionAndWaitResponse,
    HashingSchemeVersion,
    PrepareSubmissionRequest,
    PreparedTransaction,
} from "../generated/canton/com/daml/ledger/api/v2/interactive/interactive_submission_service.js";
import { mapGrpcLedgerCommand } from "./commands-mapper.js";

export function mapGrpcPrepareSubmissionRequest(
    request: SubmitCommandRequest,
    commandId: string,
): PrepareSubmissionRequest {
    return {
        userId: request.userId ?? "",
        commandId,
        commands: [mapGrpcLedgerCommand(request.command)],
        actAs: [...request.actAs],
        readAs: [...request.readAs],
        disclosedContracts: request.disclosedContracts.map(value => ({ createdEventBlob: value.createdEventBlob, contractId: value.contractId ?? "", synchronizerId: value.synchronizerId ?? "", templateId: value.templateId === undefined ? undefined : { packageId: value.templateId.packageId, moduleName: value.templateId.moduleName, entityName: value.templateId.entityName } })),
        synchronizerId: request.synchronizerId ?? "",
        packageIdSelectionPreference: [],
        prefetchContractKeys: [],
        verboseHashing: false,
    };
}

export function mapGrpcExecuteSubmissionAndWaitRequest(init: {
    request: SubmitCommandRequest;
    preparedTransaction: PreparedTransaction;
    hashingSchemeVersion: HashingSchemeVersion;
    submissionId: string;
    signerResults: readonly { readonly party: string; readonly result: SignCommandResult }[];
}): ExecuteSubmissionAndWaitRequest {
    return {
        preparedTransaction: init.preparedTransaction,
        partySignatures: {
            signatures: init.signerResults.map(({ party, result }) => ({ party, signatures: [mapGrpcSignature(result)] })),
        },
        deduplicationPeriod: {
            oneofKind: undefined,
        },
        submissionId: init.submissionId,
        userId: init.request.userId ?? "",
        hashingSchemeVersion: init.hashingSchemeVersion,
    };
}

export function mapGrpcInteractiveSubmitCommand(
    payload: ExecuteSubmissionAndWaitResponse,
): SubmitCommandResponse {
    return new SubmitCommandResponse({
        transactionId: payload.updateId,
    });
}

export function mapGrpcSignature(result: SignCommandResult): Signature {
    const algorithm = result.algorithm.toLowerCase();

    if (algorithm === "ed25519") {
        return {
            format: SignatureFormat.CONCAT,
            signature: result.signature,
            signedBy: result.signedBy,
            signingAlgorithmSpec: SigningAlgorithmSpec.ED25519,
        };
    }

    throw new ValidationError(
        `unsupported gRPC command signing algorithm '${result.algorithm}'`,
    );
}
