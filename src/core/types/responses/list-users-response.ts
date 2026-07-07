import { LedgerUser } from "../ledger-user.js";

export class ListUsersResponse {
    public readonly users: readonly LedgerUser[];
    public readonly nextPageToken?: string;

    public constructor(init: {
        users: readonly LedgerUser[];
        nextPageToken?: string;
    }) {
        this.users = init.users;
        this.nextPageToken = init.nextPageToken;
    }
}
