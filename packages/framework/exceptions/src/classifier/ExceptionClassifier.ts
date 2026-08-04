import { ClassifierRule } from './ClassifierRule';
import { ExceptionCategory } from './ExceptionCategory';

export class ExceptionClassifier {
  private readonly _rules: ClassifierRule[] = [];

  constructor() {
    this.registerDefaultRules();
  }

  public registerRule(rule: ClassifierRule): void {
    this._rules.unshift(rule);
  }

  public classify(error: Error): ExceptionCategory {
    for (const rule of this._rules) {
      if (rule.match(error)) {
        return rule.category;
      }
    }
    return ExceptionCategory.UNKNOWN;
  }

  private registerDefaultRules(): void {
    this.registerRule({
      category: ExceptionCategory.CONFIGURATION,
      match: (err) =>
        err.name === 'ConfigurationError' || err.constructor.name === 'ConfigurationError',
    });
    this.registerRule({
      category: ExceptionCategory.VALIDATION,
      match: (err) => err.name === 'ValidationError' || err.constructor.name === 'ValidationError',
    });
    this.registerRule({
      category: ExceptionCategory.MODULE,
      match: (err) => err.constructor.name.includes('Module') || err.name.includes('Module'),
    });
    this.registerRule({
      category: ExceptionCategory.DI,
      match: (err) =>
        err.constructor.name.includes('Dependency') ||
        err.name.includes('Dependency') ||
        err.name === 'ServiceNotFoundError' ||
        err.name === 'DuplicateRegistrationError' ||
        err.name === 'CircularDependencyError' ||
        err.name === 'InvalidRegistrationError',
    });
    this.registerRule({
      category: ExceptionCategory.EVENT,
      match: (err) => err.constructor.name.includes('Event') || err.name.includes('Event'),
    });
    this.registerRule({
      category: ExceptionCategory.LOGGING,
      match: (err) =>
        err.constructor.name.includes('Logging') ||
        err.name.includes('Logging') ||
        err.name === 'InvalidLogLevelError' ||
        err.name === 'FormatterError' ||
        err.name === 'WriterError',
    });
  }
}
