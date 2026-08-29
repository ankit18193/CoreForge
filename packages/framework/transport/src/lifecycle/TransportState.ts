import { TransportState } from '@coreforge/contracts';

export const TRANSPORT_STATES = {
  CREATED: 'CREATED' as TransportState,
  READY: 'READY' as TransportState,
  STOPPING: 'STOPPING' as TransportState,
  STOPPED: 'STOPPED' as TransportState,
} as const;

export function isTransportState(value: unknown): value is TransportState {
  return (
    typeof value === 'string' &&
    (value === 'CREATED' || value === 'READY' || value === 'STOPPING' || value === 'STOPPED')
  );
}
