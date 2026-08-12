export interface ConnectionDescriptor {
  readonly connectionId: string;
  readonly openedAt: number;
  readonly remoteAddress: string;
  readonly protocol: string;
  readonly activeRequests: number;
  readonly state: 'OPEN' | 'CLOSING' | 'CLOSED';
}
