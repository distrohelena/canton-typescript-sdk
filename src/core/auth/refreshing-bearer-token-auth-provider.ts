import { ValidationError } from "../errors/validation-error.js";
import { IAuthProvider } from "./auth-provider.interface.js";

/**
 * Bearer auth for tokens that rotate: the supplier runs on EVERY request, so long-lived processes — TTL
 * cache re-warms, incremental history reads, timers — always present a current token instead of the one the
 * process booted with. The supplier owns caching/refresh policy (e.g. reuse the token until shortly before
 * its exp claim, then refetch); returning an empty value fails the request with a clear error rather than
 * sending "Bearer " to the participant.
 */
export class RefreshingBearerTokenAuthProvider implements IAuthProvider {
    public constructor(private readonly tokenSupplier: () => string | Promise<string>) {
        if (typeof tokenSupplier !== "function") {
            throw new ValidationError("RefreshingBearerTokenAuthProvider requires a token supplier function.");
        }
    }

    public async getHeadersAsync(): Promise<Record<string, string>> {
        const token = await this.tokenSupplier();

        if (typeof token !== "string" || token.trim().length === 0) {
            throw new ValidationError("RefreshingBearerTokenAuthProvider token supplier returned an empty token.");
        }

        return { authorization: `Bearer ${token}` };
    }
}
