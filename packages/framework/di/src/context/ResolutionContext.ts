import { ResolutionStack } from './ResolutionStack';
import { DependencyDiagnostics } from '../diagnostics/DependencyDiagnostics';
import { RequestScope } from '../scope/RequestScope';

export class ResolutionContext {
  public readonly stack: ResolutionStack = new ResolutionStack();
  public readonly requestScope?: RequestScope | undefined;
  public readonly diagnostics?: DependencyDiagnostics | undefined;

  constructor(requestScope?: RequestScope, diagnostics?: DependencyDiagnostics) {
    this.requestScope = requestScope;
    this.diagnostics = diagnostics;
  }
}
