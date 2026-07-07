import { LedgerUser } from "../ledger-user.js";

export class GetUserResponse {
    public readonly user?: LedgerUser;

    public constructor(init: { user?: LedgerUser }) {
        this.user = init.user;
    }
}
