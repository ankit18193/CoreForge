export interface ActionMetadata {
  readonly actionName: string;
  readonly displayName: string;
  readonly returnType: string;
  readonly parameterCount: number;
  readonly tags: readonly string[];
  readonly createdAt: number;
}
