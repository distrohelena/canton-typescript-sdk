import { HealthCheckStatus } from "../health-check-status.js";

export class HealthCheckResponse {
    public readonly status: HealthCheckStatus;

    public constructor(init: { status: HealthCheckStatus }) {
        this.status = init.status;
    }
}
