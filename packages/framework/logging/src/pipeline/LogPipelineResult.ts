import { LogRecord } from '../types/loggingTypes';

export interface LogPipelineResult {
  readonly emitted: boolean;
  readonly record?: LogRecord | undefined;
  readonly durationMs: number;
}
