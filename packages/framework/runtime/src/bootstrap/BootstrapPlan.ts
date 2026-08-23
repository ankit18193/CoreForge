import { BootstrapStage } from '../types/runtimeTypes';

export class BootstrapPlan {
  public static readonly STAGES: readonly BootstrapStage[] = Object.freeze([
    'VALIDATION',
    'METADATA',
    'DISCOVERY',
    'DI',
    'REQUEST_CONTEXT',
    'PARAMETER_BINDING',
    'ROUTING',
    'EXECUTION',
    'RESPONSE',
    'EXCEPTIONS',
    'TRANSPORT',
  ]);
}
