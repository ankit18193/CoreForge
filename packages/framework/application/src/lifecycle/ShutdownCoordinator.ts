import { ApplicationInitializationError } from '../errors/ApplicationErrors';

export class ShutdownCoordinator {
  private readonly _stages: (() => Promise<void>)[] = [];

  public register(_name: string, shutdownFn: () => Promise<void>): void {
    this._stages.push(shutdownFn);
  }

  public async shutdown(): Promise<void> {
    const errors: unknown[] = [];

    for (let i = this._stages.length - 1; i >= 0; i--) {
      try {
        await this._stages[i]();
      } catch (err: unknown) {
        errors.push(err);
      }
    }

    if (errors.length > 0) {
      throw new ApplicationInitializationError(
        'ShutdownCoordinator: One or more components failed to stop gracefully.',
        errors[0],
      );
    }
  }

  public clear(): void {
    this._stages.length = 0;
  }
}
