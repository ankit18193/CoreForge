import { CoreForgeError } from '@coreforge/errors';

import { ExceptionReporter } from './ExceptionReporter';
import { ExceptionContext } from '../context/ExceptionContext';

export class ConsoleReporter implements ExceptionReporter {
  public readonly name = 'ConsoleReporter';

  public report(error: CoreForgeError, context: ExceptionContext): void {
    console.error(
      `[ConsoleReporter] [Code: ${error.code}] ${error.message} (Timestamp: ${context.timestamp})`,
      {
        requestId: context.requestId,
        traceId: context.traceId,
        spanId: context.spanId,
        module: context.module,
        service: context.service,
        operation: context.operation,
        environment: context.environment,
        runtimeState: context.runtimeState,
        moduleState: context.moduleState,
        stack: error.stack,
      },
    );
  }
}
