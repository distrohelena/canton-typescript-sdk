export class GetUpdateByHashResponse<TUpdate = unknown> {
    public readonly update?: TUpdate;

    public constructor(init: { update?: TUpdate }) {
        this.update = init.update;
    }
}
