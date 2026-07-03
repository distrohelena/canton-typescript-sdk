import { TransportKind } from "../core/types/transport-kind.js";
import { IAuthProvider } from "../core/auth/auth-provider.interface.js";
import { ICommandSigner } from "../core/signing/command-signer.interface.js";

export class CantonClientOptions {
    public readonly transportKind: TransportKind;
    public readonly endpoint: string;
    public readonly authProvider?: IAuthProvider;
    public readonly commandSigner?: ICommandSigner;

    public constructor(init: {
        transportKind: TransportKind;
        endpoint: string;
        authProvider?: IAuthProvider;
        commandSigner?: ICommandSigner;
    }) {
        this.transportKind = init.transportKind;
        this.endpoint = init.endpoint;
        this.authProvider = init.authProvider;
        this.commandSigner = init.commandSigner;
    }
}
