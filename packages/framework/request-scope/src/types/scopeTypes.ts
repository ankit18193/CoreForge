export interface ScopeEvent {
  readonly type: string;
  readonly scopeId: string;
  readonly requestId?: string | undefined;
  readonly error?: string | undefined;
}
