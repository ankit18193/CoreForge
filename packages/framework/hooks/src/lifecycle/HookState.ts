import { HookState } from '../types/hookTypes';

export const HOOK_STATES: Record<HookState, HookState> = Object.freeze({
  CREATED: 'CREATED',
  READY: 'READY',
  STOPPING: 'STOPPING',
  STOPPED: 'STOPPED',
});
