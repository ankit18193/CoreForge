import { RuntimeState } from '../state/RuntimeState';

export interface RuntimeOptions {
  environment: string;
  enableSignalHandlers?: boolean;
  shutdownTimeoutMs?: number;
}

export interface RuntimeStatus {
  state: RuntimeState;
  startedAt: number;
  uptime: number;
  processId: number;
  nodeVersion: string;
  frameworkVersion: string;
}
