import { SignCommandRequest } from "./sign-command-request.js";
import { SignCommandResult } from "./sign-command-result.js";

export interface ICommandSigner {
    signAsync(request: SignCommandRequest): Promise<SignCommandResult>;
}

/** One signer for each party that acts in an interactively signed command. */
export type CommandSigners = Readonly<Record<string, ICommandSigner>>;
