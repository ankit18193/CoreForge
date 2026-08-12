import { ActionMetadata } from './ActionMetadata';

export interface ActionDescriptor {
  readonly id: string;
  readonly metadata: ActionMetadata;
  readonly handler: (...args: unknown[]) => unknown;
  readonly parameterCount: number;
  readonly async: boolean;
  readonly createdAt: number;
}
