import { ShutdownCoordinator } from './ShutdownCoordinator';

export class RollbackCoordinator {
  private readonly _shutdownCoordinator: ShutdownCoordinator;

  constructor(shutdownCoordinator: ShutdownCoordinator) {
    this._shutdownCoordinator = shutdownCoordinator;
  }

  public async rollback(): Promise<void> {
    await this._shutdownCoordinator.shutdown();
  }
}
