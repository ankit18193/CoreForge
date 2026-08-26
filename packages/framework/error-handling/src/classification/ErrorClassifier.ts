import { ErrorCategoryResolver } from './ErrorCategoryResolver';
import { ApplicationErrorCategory } from '../types/errorHandlingTypes';

export class ErrorClassifier {
  public static classify(error: unknown): ApplicationErrorCategory {
    try {
      return ErrorCategoryResolver.resolve(error);
    } catch {
      return 'UNKNOWN';
    }
  }
}
