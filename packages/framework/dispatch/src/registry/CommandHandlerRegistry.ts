import { DispatchError, HandlerRegistrationError } from '../errors/DispatchErrors';
import { CommandHandler } from '../types/dispatchTypes';

// Control characters check regex (ASCII 0x00-0x1F and 0x7F)
// eslint-disable-next-line no-control-regex
const CONTROL_CHARS_REGEX = /[\x00-\x1F\x7F]/;

export class CommandHandlerRegistry {
  private readonly _handlers = new Map<string, CommandHandler<unknown, unknown>>();
  private _locked = false;

  public register<TPayload, TResult>(
    type: string,
    handler: CommandHandler<TPayload, TResult>,
  ): void {
    if (this._locked) {
      throw new HandlerRegistrationError('Cannot register handler after dispatcher is READY', {
        commandType: type,
      });
    }

    if (typeof type !== 'string' || type.trim().length === 0) {
      throw new HandlerRegistrationError('Command type must be a non-empty string', {
        commandType: type,
      });
    }

    if (CONTROL_CHARS_REGEX.test(type)) {
      throw new HandlerRegistrationError('Command type contains invalid control characters', {
        commandType: type,
      });
    }

    if (!handler || typeof handler !== 'object') {
      throw new DispatchError(
        'Handler must be an object implementing CommandHandler interface',
        'CF-DISPATCH-HANDLER-REGISTRATION',
        { commandType: type, handler },
      );
    }

    if (typeof handler.execute !== 'function') {
      throw new DispatchError(
        'Handler must have an execute(payload, context) function',
        'CF-DISPATCH-HANDLER-REGISTRATION',
        { commandType: type, handler },
      );
    }

    if (this._handlers.has(type)) {
      throw new HandlerRegistrationError(
        `Handler for command type "${type}" is already registered`,
        { commandType: type },
      );
    }

    this._handlers.set(type, handler as CommandHandler<unknown, unknown>);
  }

  public lock(): void {
    this._locked = true;
  }

  public get(type: string): CommandHandler<unknown, unknown> | undefined {
    return this._handlers.get(type);
  }

  public has(type: string): boolean {
    return this._handlers.has(type);
  }

  public get size(): number {
    return this._handlers.size;
  }
}
