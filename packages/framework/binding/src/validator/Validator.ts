import { ValidationErrorCollection } from './ValidationErrorCollection';
import { ValidationPipeline } from './ValidationPipeline';
import { ValidationResult } from './ValidationResult';

export class Validator {
  private readonly _pipeline: ValidationPipeline;

  constructor(pipeline: ValidationPipeline) {
    this._pipeline = pipeline;
  }

  public validate(
    value: unknown,
    path: string,
    metadata: {
      required?: boolean;
      targetType?: string;
      min?: number;
      max?: number;
      pattern?: RegExp;
      customRule?: (value: unknown) => boolean | Promise<boolean>;
    },
  ): ValidationResult {
    const collection = new ValidationErrorCollection();
    this._pipeline.validate(value, path, metadata, collection);
    return collection.toResult();
  }
}
