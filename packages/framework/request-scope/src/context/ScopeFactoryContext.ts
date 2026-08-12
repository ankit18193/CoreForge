import { Container, EventBus, Logger } from '@coreforge/contracts';

import { ScopeDiagnostics } from '../diagnostics/ScopeDiagnostics';

export interface ScopeFactoryContext {
  readonly container: Container;
  readonly logger: Logger;
  readonly diagnostics: ScopeDiagnostics;
  readonly eventBus: EventBus;
}
