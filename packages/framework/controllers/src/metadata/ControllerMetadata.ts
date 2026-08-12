export interface ControllerMetadata {
  readonly id: string;
  readonly name: string;
  readonly version: string;
  readonly group: string;
  readonly tags: readonly string[];
  readonly createdAt: number;
}
