import { GrpcTransportError } from "@distrohelena/canton-typescript-sdk";

export type WorkflowFailureKind =
    | "invalidChoice"
    | "duplicateCommand"
    | "staleContract";

export type WorkflowFailureOperation = "commandSubmission";

export interface WorkflowErrorCompatibility {
    readonly acceptedGrpcCodes: Readonly<
        Record<WorkflowFailureKind, readonly string[]>
    >;
}

const grpcStatusCodes: Readonly<Record<string, number>> = {
    INVALID_ARGUMENT: 3,
    ALREADY_EXISTS: 6,
};

const grpcOperations: Readonly<
    Record<WorkflowFailureOperation, { serviceName: string; methodName: string }>
> = {
    commandSubmission: {
        serviceName: "com.daml.ledger.api.v2.CommandService",
        methodName: "SubmitAndWaitForTransaction",
    },
};

export function classifyWorkflowFailure(init: {
    readonly error: unknown;
    readonly kind: WorkflowFailureKind;
    readonly operation: WorkflowFailureOperation;
    readonly compatibility: WorkflowErrorCompatibility;
}): WorkflowFailureKind {
    if (!(init.error instanceof GrpcTransportError)) {
        throw init.error;
    }

    const acceptedGrpcCodes = init.compatibility.acceptedGrpcCodes[init.kind];

    const expectedOperation = grpcOperations[init.operation];

    const expectedStatusCode = grpcStatusCodes[init.error.grpcCode];

    if (
        acceptedGrpcCodes === undefined
        || expectedOperation === undefined
        || !acceptedGrpcCodes.includes(init.error.grpcCode)
        || expectedStatusCode === undefined
        || init.error.status?.code !== expectedStatusCode
        || init.error.serviceName !== expectedOperation.serviceName
        || init.error.methodName !== expectedOperation.methodName
    ) {
        throw init.error;
    }

    return init.kind;
}
