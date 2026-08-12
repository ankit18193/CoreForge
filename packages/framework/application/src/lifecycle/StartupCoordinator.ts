import { RollbackCoordinator } from './RollbackCoordinator';
import { ShutdownCoordinator } from './ShutdownCoordinator';
import { ApplicationInitializationError } from '../errors/ApplicationErrors';

export interface StartupStep {
  readonly name: string;
  start(): Promise<void>;
  stop(): Promise<void>;
}

export class StartupCoordinator {
  private readonly _steps: StartupStep[] = [];
  private readonly _shutdownCoordinator: ShutdownCoordinator;
  private readonly _rollbackCoordinator: RollbackCoordinator;

  constructor(shutdownCoordinator: ShutdownCoordinator) {
    this._shutdownCoordinator = shutdownCoordinator;
    this._rollbackCoordinator = new RollbackCoordinator(shutdownCoordinator);
  }

  public register(step: StartupStep): void {
    this._steps.push(step);
  }

  public async startup(): Promise<void> {
    this._shutdownCoordinator.clear();

    for (const step of this._steps) {
      try {
        await step.start();
        this._shutdownCoordinator.register(step.name, () => step.stop());
      } catch (err: unknown) {
        try {
          await this._rollbackCoordinator.rollback();
        } catch (rollbackErr: unknown) {
          // Suppress rollback errors
        }
        throw new ApplicationInitializationError(
          `StartupCoordinator: Step "${step.name}" failed to start.`,
          err,
        );
      }
    }
  }
}
