import { MiddlewareExecutionContext } from '../pipeline/MiddlewareExecutionContext';

export interface PipelineTarget {
  execute(context: MiddlewareExecutionContext): Promise<void>;
}
