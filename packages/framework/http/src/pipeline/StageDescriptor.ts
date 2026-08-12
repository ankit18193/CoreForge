import { HttpExecutionContext } from '../execution/HttpExecutionContext';

export interface HttpStageHook {
  execute(context: HttpExecutionContext): Promise<void> | void;
}

export interface StageDescriptor {
  readonly name: string;
  readonly hook: HttpStageHook;
  readonly order: number;
  readonly before?: string | undefined;
  readonly after?: string | undefined;
  readonly enabled: boolean;
}
