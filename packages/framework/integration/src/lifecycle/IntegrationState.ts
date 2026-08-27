import { IntegrationState } from '../types/integrationTypes';

export const INTEGRATION_STATES: Record<IntegrationState, IntegrationState> = Object.freeze({
  CREATED: 'CREATED',
  INITIALIZING: 'INITIALIZING',
  READY: 'READY',
  STOPPING: 'STOPPING',
  STOPPED: 'STOPPED',
});
