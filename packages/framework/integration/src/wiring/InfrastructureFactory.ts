import { ApplicationManager } from '@coreforge/application';
import { Dispatcher } from '@coreforge/dispatch';
import { ErrorHandlingEngine } from '@coreforge/error-handling';
import { EventPublisher } from '@coreforge/events';
import { ExecutionEngine } from '@coreforge/execution';
import { ExecutionContextManager } from '@coreforge/execution-context';
import { HookManager } from '@coreforge/hooks';
import { InterceptorEngine } from '@coreforge/interceptors';
import { ApplicationKernel } from '@coreforge/kernel';
import { QueryBus } from '@coreforge/query';

import { ComponentWiring } from './ComponentWiring';
import {
  ApplicationInfrastructureGraph,
  ApplicationIntegrationOptions,
} from '../types/integrationTypes';

export class InfrastructureFactory {
  public static createApplicationInfrastructure(
    options: ApplicationIntegrationOptions = {},
  ): ApplicationInfrastructureGraph {
    const contextManager = options.contextManager ?? new ExecutionContextManager();

    const executionEngine = options.executionEngine ?? new ExecutionEngine({ contextManager });

    const interceptorEngine = options.interceptorEngine ?? new InterceptorEngine();

    const dispatcher =
      options.dispatcher ??
      new Dispatcher({
        contextManager,
        executionEngine,
        interceptorEngine,
      });

    const queryBus =
      options.queryBus ??
      new QueryBus({
        contextManager,
        executionEngine,
        interceptorEngine,
      });

    const eventPublisher =
      options.eventPublisher ??
      new EventPublisher({
        contextManager,
        executionEngine,
      });

    const applicationManager =
      options.applicationManager ??
      new ApplicationManager({
        contextManager,
        executionEngine,
        interceptorEngine,
        dispatcher,
        queryBus,
      });

    const errorEngine = options.errorEngine ?? new ErrorHandlingEngine();

    const hookManager = options.hookManager ?? new HookManager({ contextManager });

    const kernel =
      options.kernel ??
      new ApplicationKernel({
        contextManager,
        executionEngine,
        dispatcher,
        queryBus,
        eventPublisher,
        applicationManager,
        errorEngine,
      });

    const graph: ApplicationInfrastructureGraph = {
      contextManager,
      executionEngine,
      interceptorEngine,
      dispatcher,
      queryBus,
      eventPublisher,
      applicationManager,
      errorEngine,
      hookManager,
      kernel,
    };

    return ComponentWiring.validateAndWire(graph);
  }
}
