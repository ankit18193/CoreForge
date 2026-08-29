import { ExecutionContext, TransportContext, TransportMetadata } from '@coreforge/contracts';
import { ExecutionContextManager } from '@coreforge/execution-context';

export interface CreateTransportContextOptions {
  readonly executionContext?: ExecutionContext | undefined;
  readonly contextManager?: ExecutionContextManager | undefined;
  readonly metadata?: TransportMetadata | undefined;
}

export class TransportContextFactory {
  public static create(
    transportType: string,
    options: CreateTransportContextOptions = {},
  ): TransportContext {
    let executionContext = options.executionContext;

    if (!executionContext) {
      const manager = options.contextManager ?? new ExecutionContextManager();
      executionContext = manager.create({ autoStart: true });
    } else if (executionContext.state === 'CREATED') {
      executionContext.start();
    }

    const metadata: TransportMetadata = Object.freeze({
      ...(options.metadata || {}),
      transportType,
    });

    const context: TransportContext = {
      executionContext,
      transportType,
      metadata,
    };

    return Object.freeze(context);
  }
}
