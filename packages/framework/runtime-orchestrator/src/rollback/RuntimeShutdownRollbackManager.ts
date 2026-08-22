export interface ShutdownAction {
  readonly id: string;
  readonly type: string;
  readonly stop: () => Promise<void> | void;
}

export class RuntimeShutdownRollbackManager {
  private readonly _actions: ShutdownAction[] = [];

  public track(id: string, type: string, stop: () => Promise<void> | void): void {
    this._actions.push({ id, type, stop });
  }

  public async rollback(): Promise<void> {
    const reversed = [...this._actions].reverse();
    for (const action of reversed) {
      try {
        await action.stop();
      } catch (err) {
        console.error(
          `RuntimeShutdownRollbackManager: Rollback failed for ${action.type} "${action.id}":`,
          err,
        );
      }
    }
    this._actions.length = 0;
  }
}
