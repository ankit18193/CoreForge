import { TransportState } from '@coreforge/contracts';

export type HttpState = TransportState;

export const HTTP_STATES = {
  CREATED: 'CREATED' as HttpState,
  READY: 'READY' as HttpState,
  STOPPING: 'STOPPING' as HttpState,
  STOPPED: 'STOPPED' as HttpState,
} as const;

export function isHttpState(value: unknown): value is HttpState {
  return (
    typeof value === 'string' &&
    (value === 'CREATED' || value === 'READY' || value === 'STOPPING' || value === 'STOPPED')
  );
}
