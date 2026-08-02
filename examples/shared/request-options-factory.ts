import { RequestOptions } from "@distrohelena/canton-typescript-sdk";

export interface RequestOptionsFactory {
    createRequestOptions(): RequestOptions;
}
