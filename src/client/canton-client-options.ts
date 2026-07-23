import { TransportKind } from "../core/types/transport-kind.js";
import { GrpcChannelSecurity } from "../core/types/grpc-channel-security.js";
import { IAuthProvider } from "../core/auth/auth-provider.interface.js";
import { ICommandSigner } from "../core/signing/command-signer.interface.js";
import type { GrpcTransportError } from "../core/errors/grpc-transport-error.js";

export class CantonClientOptions {
    public readonly transportKind: TransportKind;
    public readonly ledgerEndpoint?: string;
    public readonly ledgerAdminEndpoint?: string;
    public readonly participantAdminEndpoint?: string;
    public readonly grpcChannelSecurity: GrpcChannelSecurity;
    public readonly ledgerGrpcChannelSecurity?: GrpcChannelSecurity;
    public readonly ledgerAdminGrpcChannelSecurity?: GrpcChannelSecurity;
    public readonly participantAdminGrpcChannelSecurity?: GrpcChannelSecurity;
    public readonly defaultRequestTimeoutMs?: number;
    public readonly grpcConnectTimeoutMs?: number;
    public readonly ledgerAuthProvider?: IAuthProvider;
    public readonly ledgerAdminAuthProvider?: IAuthProvider;
    public readonly participantAdminAuthProvider?: IAuthProvider;
    public readonly commandSigner?: ICommandSigner;
    public readonly onGrpcError?: (error: GrpcTransportError) => void;

    public constructor(init: {
        transportKind: TransportKind;
        ledgerEndpoint?: string;
        ledgerAdminEndpoint?: string;
        participantAdminEndpoint?: string;
        grpcChannelSecurity?: GrpcChannelSecurity;
        ledgerGrpcChannelSecurity?: GrpcChannelSecurity;
        ledgerAdminGrpcChannelSecurity?: GrpcChannelSecurity;
        participantAdminGrpcChannelSecurity?: GrpcChannelSecurity;
        defaultRequestTimeoutMs?: number;
        grpcConnectTimeoutMs?: number;
        ledgerAuthProvider?: IAuthProvider;
        ledgerAdminAuthProvider?: IAuthProvider;
        participantAdminAuthProvider?: IAuthProvider;
        commandSigner?: ICommandSigner;
        onGrpcError?: (error: GrpcTransportError) => void;
    }) {
        this.transportKind = init.transportKind;
        this.ledgerEndpoint = init.ledgerEndpoint;
        this.ledgerAdminEndpoint = init.ledgerAdminEndpoint;
        this.participantAdminEndpoint = init.participantAdminEndpoint;
        this.grpcChannelSecurity =
            init.grpcChannelSecurity ?? GrpcChannelSecurity.tls;
        this.ledgerGrpcChannelSecurity = init.ledgerGrpcChannelSecurity;
        this.ledgerAdminGrpcChannelSecurity =
            init.ledgerAdminGrpcChannelSecurity;
        this.participantAdminGrpcChannelSecurity =
            init.participantAdminGrpcChannelSecurity;
        this.defaultRequestTimeoutMs = init.defaultRequestTimeoutMs;
        this.grpcConnectTimeoutMs = init.grpcConnectTimeoutMs;
        this.ledgerAuthProvider = init.ledgerAuthProvider;
        this.ledgerAdminAuthProvider = init.ledgerAdminAuthProvider;
        this.participantAdminAuthProvider =
            init.participantAdminAuthProvider;
        this.commandSigner = init.commandSigner;
        this.onGrpcError = init.onGrpcError;
    }
}
