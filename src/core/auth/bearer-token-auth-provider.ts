import { IAuthProvider } from "./auth-provider.interface.js";

export class BearerTokenAuthProvider implements IAuthProvider {
    public constructor(private readonly token: string) {}

    public async getHeadersAsync(): Promise<Record<string, string>> {
        return { authorization: `Bearer ${this.token}` };
    }
}
