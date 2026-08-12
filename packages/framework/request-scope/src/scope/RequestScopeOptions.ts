import { Container } from '@coreforge/contracts';

import { ScopeRegistry } from '../container/ScopeRegistry';
import { ScopeDiagnostics } from '../diagnostics/ScopeDiagnostics';

export interface RequestScopeOptions {
  readonly rootContainer: Container;
  readonly diagnostics: ScopeDiagnostics;
  readonly registry: ScopeRegistry;
  readonly disposalTimeoutMs?: number | undefined;
}
