import { IntegrationContext } from './IntegrationContext';

export interface IntegrationPlan {
  readonly context: IntegrationContext;
  readonly executionSequence: string[];
}

export class IntegrationPlanner {
  public plan(context: IntegrationContext): IntegrationPlan {
    return {
      context,
      executionSequence: [
        'Bootstrap',
        'Runtime',
        'HttpServer',
        'Router',
        'Middleware',
        'Controllers',
        'RequestHandler',
        'Binding',
        'RequestScope',
        'ActionInvoker',
        'Serialization',
        'Security',
        'Interceptors',
        'Metadata',
        'Discovery',
        'Compiler',
        'Scanner',
        'Assembly',
        'Initialization',
        'Orchestrator',
        'Extensions',
        'Plugins',
      ],
    };
  }
}
