import { SignCommandRequest } from "./signCommandRequest.js";
import { SignCommandResult } from "./signCommandResult.js";

export interface ICommandSigner {
  signAsync(request: SignCommandRequest): Promise<SignCommandResult>;
}
