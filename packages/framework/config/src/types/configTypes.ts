import { Dictionary } from '@coreforge/types';

export interface ConfigProvider {
  readonly name: string;
  load(): Promise<Dictionary<unknown>>;
}

export interface CustomValidator {
  validate(value: unknown): void;
}

export interface SchemaField {
  type: 'string' | 'number' | 'boolean' | 'enum';
  required?: boolean;
  default?: unknown;
  customValidator?: CustomValidator;
  pattern?: RegExp;
  enumOptions?: string[];
}
