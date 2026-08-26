import { CommandHandlerRegistry } from './CommandHandlerRegistry';
import { HandlerNotFoundError } from '../errors/DispatchErrors';
import { CommandHandler } from '../types/dispatchTypes';

export class HandlerResolver {
  public static resolve<TPayload = unknown, TResult = unknown>(
    registry: CommandHandlerRegistry,
    commandType: string,
  ): CommandHandler<TPayload, TResult> {
    const handler = registry.get(commandType);

    if (!handler) {
      throw new HandlerNotFoundError(`No handler registered for command type "${commandType}"`, {
        commandType,
      });
    }

    return handler as CommandHandler<TPayload, TResult>;
  }
}
