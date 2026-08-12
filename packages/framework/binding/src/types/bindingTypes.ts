import { BindingSource } from '../registry/BindingSource';

export interface ParameterBindingOptions {
  readonly name: string;
  readonly type: string;
  readonly source: BindingSource;
  readonly required?: boolean | undefined;
  readonly defaultValue?: unknown | undefined;
}
