import { Container } from '@coreforge/contracts';

import { RequestScopeOptions } from './RequestScopeOptions';
import { ScopeRegistry } from '../container/ScopeRegistry';
import { ScopeDiagnostics } from '../diagnostics/ScopeDiagnostics';

export class RequestScopeConfiguration {
  public readonly rootContainer: Container;
  public readonly diagnostics: ScopeDiagnostics;
  public readonly registry: ScopeRegistry;
  public readonly disposalTimeoutMs: number;

  constructor(options: RequestScopeOptions) {
    this.rootContainer = options.rootContainer;
    this.diagnostics = options.diagnostics;
    this.registry = options.registry;
    this.disposalTimeoutMs = options.disposalTimeoutMs ?? 5000;
    Object.freeze(this);
  }
}
