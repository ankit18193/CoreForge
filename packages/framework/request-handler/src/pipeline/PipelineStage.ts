import { RequestExecutionContext } from './RequestExecutionContext';
import { RequestStage } from './RequestStage';

export interface PipelineStage {
  readonly stage: RequestStage;
  execute(context: RequestExecutionContext): Promise<void>;
}
