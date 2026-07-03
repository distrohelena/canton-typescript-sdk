export class HealthCheckRequest {
    public readonly service?: string;

    public constructor(init: { service?: string } = {}) {
        this.service = init.service;
    }
}
