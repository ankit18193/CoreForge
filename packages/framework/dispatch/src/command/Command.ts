import { CommandValidationError } from '../errors/DispatchErrors';
import { Command } from '../types/dispatchTypes';

// Control characters check regex (ASCII 0x00-0x1F and 0x7F)
// eslint-disable-next-line no-control-regex
const CONTROL_CHARS_REGEX = /[\x00-\x1F\x7F]/;

export class CommandValidator {
  public static validate<TPayload>(command: unknown): asserts command is Command<TPayload> {
    if (!command || typeof command !== 'object') {
      throw new CommandValidationError('Command must be a non-null object', { command });
    }

    const cmd = command as Record<string, unknown>;

    if (typeof cmd.type !== 'string') {
      throw new CommandValidationError('Command type must be a string', { command });
    }

    const trimmed = cmd.type.trim();
    if (trimmed.length === 0) {
      throw new CommandValidationError('Command type cannot be empty or whitespace-only', {
        command,
      });
    }

    if (CONTROL_CHARS_REGEX.test(cmd.type)) {
      throw new CommandValidationError('Command type contains invalid control characters', {
        commandType: cmd.type,
      });
    }
  }
}
