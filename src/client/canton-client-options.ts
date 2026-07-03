import { TransportKind } from "../core/types/transport-kind.js";
import { GrpcChannelSecurity } from "../core/types/grpc-channel-security.js";
import { IAuthProvider } from "../core/auth/auth-provider.interface.js";
import { ICommandSigner } from "../core/signing/command-signer.interface.js";

export class CantonClientOptions {
    public readonly transportKind: TransportKind;
    public readonly endpoint: string;
    public readonly grpcChannelSecurity: GrpcChannelSecurity;
    public readonly authProvider?: IAuthProvider;
    public readonly commandSigner?: ICommandSigner;

    public constructor(init: {
        transportKind: TransportKind;
        endpoint: string;
        grpcChannelSecurity?: GrpcChannelSecurity;
        authProvider?: IAuthProvider;
        commandSigner?: ICommandSigner;
    }) {
        this.transportKind = init.transportKind;
        this.endpoint = init.endpoint;
        this.grpcChannelSecurity =
            init.grpcChannelSecurity ?? GrpcChannelSecurity.tls;
        this.authProvider = init.authProvider;
        this.commandSigner = init.commandSigner;
    }
}
