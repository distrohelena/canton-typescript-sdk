import { IAuthProvider } from "../../core/auth/iAuthProvider.js";

export interface IJsonHttpClient {
  getAsync(path: string): Promise<unknown>;
  postAsync(path: string, body: unknown): Promise<unknown>;
}

export class JsonHttpClient implements IJsonHttpClient {
  public constructor(
    private readonly endpoint: string,
    private readonly authProvider?: IAuthProvider
  ) {}

  public async getAsync(path: string): Promise<unknown> {
    return this.sendAsync("GET", path);
  }

  public async postAsync(path: string, body: unknown): Promise<unknown> {
    return this.sendAsync("POST", path, body);
  }

  private async sendAsync(method: string, path: string, body?: unknown): Promise<unknown> {
    const headers = this.authProvider ? await this.authProvider.getHeadersAsync() : {};
    const response = await fetch(new URL(path, this.endpoint), {
      method,
      headers: {
        "content-type": "application/json",
        ...headers
      },
      body: body === undefined ? undefined : JSON.stringify(body)
    });

    return response.json();
  }
}
