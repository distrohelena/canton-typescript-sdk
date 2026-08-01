import { GrpcTransportError } from "@distrohelena/canton-typescript-sdk";
import { describe, expect, it } from "vitest";
import { Status } from "../../../src/transports/grpc/generated/canton/google/rpc/status.js";
import {
    classifyWorkflowFailure,
    type WorkflowFailureKind,
} from "../../../examples/shared/workflow-errors.js";

const compatibility = {
    participantVersion: "3.5.8-SNAPSHOT",
    releaseCore: "3.5.8",
    path: "common",
    acceptedGrpcCodes: {
        invalidChoice: ["INVALID_ARGUMENT"],
        duplicateCommand: ["ALREADY_EXISTS"],
        staleContract: ["INVALID_ARGUMENT"],
    },
} as const;

describe("classifyWorkflowFailure", () => {
    it.each<[WorkflowFailureKind, string, number]>([
        ["invalidChoice", "INVALID_ARGUMENT", 3],
        ["duplicateCommand", "ALREADY_EXISTS", 6],
        ["staleContract", "INVALID_ARGUMENT", 3],
    ])("classifies %s from the selected structured compatibility code", (
        kind,
        grpcCode,
        statusCode,
    ) => {
        expect(
            classifyWorkflowFailure({
                error: grpcError({ grpcCode, statusCode, message: "unrelated prose" }),
                kind,
                operation: "commandSubmission",
                compatibility,
            }),
        ).toBe(kind);
    });

    it("does not accept an error merely because its prose resembles an expected failure", () => {
        const error = new Error("duplicate command with an invalid choice on a stale contract");

        expect(() =>
            classifyWorkflowFailure({
                error,
                kind: "duplicateCommand",
                operation: "commandSubmission",
                compatibility,
            }),
        ).toThrow(error);
    });

    it("classifies the observed stale-contract NOT_FOUND status when compatibility selects it", () => {
        const error = grpcError({
            grpcCode: "NOT_FOUND",
            statusCode: 5,
        });

        expect(
            classifyWorkflowFailure({
                error,
                kind: "staleContract",
                operation: "commandSubmission",
                compatibility: {
                    ...compatibility,
                    acceptedGrpcCodes: {
                        ...compatibility.acceptedGrpcCodes,
                        staleContract: ["NOT_FOUND"],
                    },
                },
            }),
        ).toBe("staleContract");
    });

    it("rejects unexpected gRPC codes and missing structured status", () => {
        const unexpectedCode = grpcError({
            grpcCode: "INVALID_ARGUMENT",
            statusCode: 3,
        });

        const missingStatus = grpcError({ grpcCode: "ALREADY_EXISTS" });

        expect(() =>
            classifyWorkflowFailure({
                error: unexpectedCode,
                kind: "duplicateCommand",
                operation: "commandSubmission",
                compatibility,
            }),
        ).toThrow(unexpectedCode);
        expect(() =>
            classifyWorkflowFailure({
                error: missingStatus,
                kind: "duplicateCommand",
                operation: "commandSubmission",
                compatibility,
            }),
        ).toThrow(missingStatus);
    });

    it("rejects a structured error from a different gRPC service", () => {
        const error = grpcError({
            grpcCode: "INVALID_ARGUMENT",
            statusCode: 3,
            serviceName: "com.daml.ledger.api.v2.StateService",
        });

        expect(() =>
            classifyWorkflowFailure({
                error,
                kind: "invalidChoice",
                operation: "commandSubmission",
                compatibility,
            }),
        ).toThrow(error);
    });

    it("rejects a structured error from a different gRPC method", () => {
        const error = grpcError({
            grpcCode: "INVALID_ARGUMENT",
            statusCode: 3,
            methodName: "SubmitAndWait",
        });

        expect(() =>
            classifyWorkflowFailure({
                error,
                kind: "invalidChoice",
                operation: "commandSubmission",
                compatibility,
            }),
        ).toThrow(error);
    });

    it("rejects a gRPC code whose decoded structured status code disagrees", () => {
        const error = grpcError({
            grpcCode: "INVALID_ARGUMENT",
            statusCode: 6,
        });

        expect(() =>
            classifyWorkflowFailure({
                error,
                kind: "invalidChoice",
                operation: "commandSubmission",
                compatibility,
            }),
        ).toThrow(error);
    });

    it("rethrows the original error for an unknown compatibility entry", () => {
        const error = grpcError({ grpcCode: "INVALID_ARGUMENT", statusCode: 3 });

        expect(() =>
            classifyWorkflowFailure({
                error,
                kind: "unknown" as WorkflowFailureKind,
                operation: "commandSubmission",
                compatibility,
            }),
        ).toThrow(error);
    });
});

function grpcError(init: {
    readonly grpcCode: string;
    readonly statusCode?: number;
    readonly message?: string;
    readonly serviceName?: string;
    readonly methodName?: string;
}): GrpcTransportError {
    const raw = Object.assign(new Error(init.message ?? "transport failure"), {
        name: "RpcError",
        code: init.grpcCode,
        serviceName: init.serviceName ?? "com.daml.ledger.api.v2.CommandService",
        methodName: init.methodName ?? "SubmitAndWaitForTransaction",
        meta: init.statusCode === undefined
            ? {}
            : {
                  "grpc-status-details-bin": Status.toBinary({
                      code: init.statusCode,
                      message: "status prose is not assertion input",
                      details: [],
                  }),
              },
    });

    const parsed = GrpcTransportError.fromUnknown(raw);

    if (parsed === undefined) {
        throw new Error("Expected a normalized GrpcTransportError fixture.");
    }

    return parsed;
}
