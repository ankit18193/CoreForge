import { KernelSnapshot as IKernelSnapshot } from '@coreforge/contracts';

export interface KernelSnapshot extends IKernelSnapshot {
  readonly startupTimestamp: number;
  readonly subsystemCount: number;
  readonly diagnostics: unknown;
}
