export interface ModuleMetadata {
  readonly name: string;
  readonly version: string;
  readonly dependencies: string[];
  readonly description?: string | undefined;
  readonly author?: string | undefined;
  readonly tags?: string[] | undefined;
  readonly configSchema?: unknown | undefined;
}
