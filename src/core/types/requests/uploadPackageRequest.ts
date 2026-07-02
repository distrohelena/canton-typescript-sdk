import { PackageFormat } from "../packageFormat.js";

export class UploadPackageRequest {
  public readonly bytes: Uint8Array;
  public readonly format: PackageFormat;

  public constructor(init: { bytes: Uint8Array; format: PackageFormat }) {
    this.bytes = init.bytes;
    this.format = init.format;
  }
}
