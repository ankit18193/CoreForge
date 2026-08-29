import {
  ExecutionContext,
  HttpRequest,
  TransportContext,
  TransportMetadata,
} from '@coreforge/contracts';
import { ExecutionContextManager } from '@coreforge/execution-context';
import { TransportContextFactory } from '@coreforge/transport';

export interface CreateHttpContextOptions {
  readonly executionContext?: ExecutionContext | undefined;
  readonly contextManager?: ExecutionContextManager | undefined;
  readonly extraMetadata?: Record<string, unknown> | undefined;
}

export class HttpContextFactory {
  public static create(
    request: HttpRequest,
    options: CreateHttpContextOptions = {},
  ): TransportContext {
    let executionContext = options.executionContext;

    if (!executionContext) {
      const manager = options.contextManager ?? new ExecutionContextManager();
      executionContext = manager.create({ autoStart: true });
    } else if (executionContext.state === 'CREATED') {
      executionContext.start();
    }

    // Bridge AbortSignal from HttpRequest to ExecutionContext if present
    if (request.signal) {
      if (request.signal.aborted) {
        executionContext.cancel();
      } else {
        request.signal.addEventListener(
          'abort',
          () => {
            executionContext?.cancel();
          },
          { once: true },
        );
      }
    }

    const metadata: TransportMetadata = {
      transportType: 'http',
      method: request.method,
      url: request.url,
      path: request.path,
      ...(options.extraMetadata || {}),
    };

    return TransportContextFactory.create('http', {
      executionContext,
      contextManager: options.contextManager,
      metadata,
    });
  }
}
