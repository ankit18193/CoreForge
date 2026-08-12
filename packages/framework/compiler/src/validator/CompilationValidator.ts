import { DiscoveryResult } from '@coreforge/contracts';

import { DependencyValidator } from './DependencyValidator';
import { DuplicateValidator } from './DuplicateValidator';
import { HierarchyValidator } from './HierarchyValidator';

export class CompilationValidator {
  private readonly _duplicate = new DuplicateValidator();
  private readonly _dependency = new DependencyValidator();
  private readonly _hierarchy = new HierarchyValidator();

  public validate(discovery: DiscoveryResult): void {
    this._duplicate.validate(discovery);
    this._dependency.validate(discovery);
    this._hierarchy.validate(discovery);
  }
}
