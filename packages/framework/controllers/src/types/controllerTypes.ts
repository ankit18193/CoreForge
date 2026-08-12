export interface ControllerMetadataOptions {
  readonly id?: string | undefined;
  readonly name?: string | undefined;
  readonly version?: string | undefined;
  readonly group?: string | undefined;
  readonly tags?: readonly string[] | undefined;
}
