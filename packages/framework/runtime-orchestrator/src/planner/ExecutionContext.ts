import { InitializedRuntime } from '@coreforge/contracts';

export class ExecutionContext {
  public readonly runtime: InitializedRuntime;
  public readonly data = new Map<string, unknown>();

  constructor(runtime: InitializedRuntime) {
    this.runtime = runtime;
  }
}
