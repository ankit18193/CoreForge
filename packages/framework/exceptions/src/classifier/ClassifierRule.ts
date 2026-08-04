import { ExceptionCategory } from './ExceptionCategory';

export interface ClassifierRule {
  readonly category: ExceptionCategory;
  match(error: Error): boolean;
}
