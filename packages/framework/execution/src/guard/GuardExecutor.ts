import { GuardRejectedError } from '../errors/ExecutionErrors';
import { ExecutionContext, Guard } from '../types/executionTypes';

export class GuardExecutor {
  public static async execute(context: ExecutionContext): Promise<void> {
    const { action } = context;

    if (!action.guards || action.guards.length === 0) {
      return;
    }

    for (const guardToken of action.guards) {
      const guard = (await context.resolve(guardToken)) as Guard;

      if (!guard || typeof guard.canActivate !== 'function') {
        throw new GuardRejectedError(
          `Resolved guard for token "${String(guardToken)}" does not implement canActivate().`,
          { actionId: action.id, guardToken },
        );
      }

      const allowed = await Promise.resolve(guard.canActivate(context));
      if (!allowed) {
        throw new GuardRejectedError(`Guard rejected execution for action "${action.id}".`, {
          actionId: action.id,
          guardToken,
        });
      }
    }
  }
}
