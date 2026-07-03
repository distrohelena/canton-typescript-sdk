import { SignCommandRequest } from "./sign-command-request.js";
import { SignCommandResult } from "./sign-command-result.js";

export interface ICommandSigner {
    signAsync(request: SignCommandRequest): Promise<SignCommandResult>;
}
