import { TransportKind } from "../core/types/transportKind.js";
import { IAuthProvider } from "../core/auth/iAuthProvider.js";
import { ICommandSigner } from "../core/signing/iCommandSigner.js";

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
