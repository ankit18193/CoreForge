import { RegistrationConflictError } from '../errors/ScannerErrors';
import { RegistrationRegistry } from '../registry/RegistrationRegistry';

export class DuplicateValidator {
  public validate(registry: RegistrationRegistry): void {
    const ids = new Set<string>();
    for (const reg of registry.registrations) {
      if (ids.has(reg.id)) {
        throw new RegistrationConflictError(
          `DuplicateValidator: Duplicate registration detected for ID "${reg.id}".`,
        );
      }
      ids.add(reg.id);
    }
  }
}
