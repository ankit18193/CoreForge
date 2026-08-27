import { IntegrationWiringError } from '../errors/IntegrationErrors';
import { ApplicationInfrastructureGraph } from '../types/integrationTypes';

export class ComponentWiring {
  public static validateAndWire(
    graph: ApplicationInfrastructureGraph,
  ): ApplicationInfrastructureGraph {
    if (!graph.contextManager) {
      throw new IntegrationWiringError('ComponentWiring: ExecutionContextManager is required');
    }
    if (!graph.executionEngine) {
      throw new IntegrationWiringError('ComponentWiring: ExecutionEngine is required');
    }
    if (!graph.interceptorEngine) {
      throw new IntegrationWiringError('ComponentWiring: InterceptorEngine is required');
    }
    if (!graph.dispatcher) {
      throw new IntegrationWiringError('ComponentWiring: Dispatcher is required');
    }
    if (!graph.queryBus) {
      throw new IntegrationWiringError('ComponentWiring: QueryBus is required');
    }
    if (!graph.eventPublisher) {
      throw new IntegrationWiringError('ComponentWiring: EventPublisher is required');
    }
    if (!graph.applicationManager) {
      throw new IntegrationWiringError('ComponentWiring: ApplicationManager is required');
    }
    if (!graph.errorEngine) {
      throw new IntegrationWiringError('ComponentWiring: ErrorHandlingEngine is required');
    }
    if (!graph.hookManager) {
      throw new IntegrationWiringError('ComponentWiring: HookManager is required');
    }
    if (!graph.kernel) {
      throw new IntegrationWiringError('ComponentWiring: ApplicationKernel is required');
    }

    return Object.freeze({
      contextManager: graph.contextManager,
      executionEngine: graph.executionEngine,
      interceptorEngine: graph.interceptorEngine,
      dispatcher: graph.dispatcher,
      queryBus: graph.queryBus,
      eventPublisher: graph.eventPublisher,
      applicationManager: graph.applicationManager,
      errorEngine: graph.errorEngine,
      hookManager: graph.hookManager,
      kernel: graph.kernel,
    });
  }
}
