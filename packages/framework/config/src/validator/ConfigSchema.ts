import { Dictionary } from '@coreforge/types';

import { SchemaField } from '../types/configTypes';

export class ConfigSchema {
  private _fields: Dictionary<SchemaField> = {};

  public addField(key: string, field: SchemaField): void {
    this._fields[key] = field;
  }

  public get fields(): Dictionary<SchemaField> {
    return this._fields;
  }
}
