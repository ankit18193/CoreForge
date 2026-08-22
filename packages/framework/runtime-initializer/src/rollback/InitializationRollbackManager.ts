export interface RollbackAction {
  readonly id: string;
  readonly type: string;
  readonly undo: () => Promise<void> | void;
}

export class InitializationRollbackManager {
  private readonly _actions: RollbackAction[] = [];

  public track(id: string, type: string, undo: () => Promise<void> | void): void {
    this._actions.push({ id, type, undo });
  }

  public async rollback(): Promise<void> {
    const reversed = [...this._actions].reverse();
    for (const action of reversed) {
      try {
        await action.undo();
      } catch (err) {
        console.error(
          `InitializationRollbackManager: Rollback failed for ${action.type} "${action.id}":`,
          err,
        );
      }
    }
    this._actions.length = 0;
  }
}
