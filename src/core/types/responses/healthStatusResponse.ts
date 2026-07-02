export class HealthStatusResponse {
  public readonly status: string;
  public readonly version?: string;

  public constructor(init: { status: string; version?: string }) {
    this.status = init.status;
    this.version = init.version;
  }
}
