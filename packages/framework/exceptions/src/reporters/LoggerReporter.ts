import { Logger } from '@coreforge/contracts';
import { CoreForgeError } from '@coreforge/errors';

import { ExceptionReporter } from './ExceptionReporter';
import { ExceptionContext } from '../context/ExceptionContext';
import { StackTraceFormatter } from '../internal/StackTraceFormatter';

export class LoggerReporter implements ExceptionReporter {
  public readonly name = 'LoggerReporter';
  private readonly _logger: Logger;

  constructor(logger: Logger) {
    this._logger = logger;
  }

  public report(error: CoreForgeError, context: ExceptionContext): void {
    const formattedStack = StackTraceFormatter.format(error.stack);
    this._logger.error(
      `[Exception] [Code: ${error.code}] ${error.message}\nStack: ${formattedStack}`,
      undefined,
      context,
    );
  }
}
