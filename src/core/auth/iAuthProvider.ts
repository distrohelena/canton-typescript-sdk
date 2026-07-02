export interface IAuthProvider {
  getHeadersAsync(): Promise<Record<string, string>>;
}
