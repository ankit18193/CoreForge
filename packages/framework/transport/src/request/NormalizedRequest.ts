export type { NormalizedRequest } from '../types/transportTypes';

export function isNormalizedRequest(
  value: unknown,
): value is import('../types/transportTypes').NormalizedRequest {
  return typeof value === 'object' && value !== null;
}
