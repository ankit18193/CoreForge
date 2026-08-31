import type { HttpBindingDefinition, HttpBindingSource, HttpValueType } from '@coreforge/contracts';

import { HttpBindingDefinitionError } from '../errors/HttpBindingErrors';

const VALID_SOURCES: ReadonlySet<HttpBindingSource> = new Set<HttpBindingSource>([
  'PATH',
  'QUERY',
  'HEADER',
  'COOKIE',
  'BODY',
]);

const VALID_TYPES: ReadonlySet<HttpValueType> = new Set<HttpValueType>([
  'STRING',
  'NUMBER',
  'BOOLEAN',
  'INTEGER',
  'JSON',
  'ARRAY',
  'OBJECT',
]);

export class HttpBindingValidator {
  public static validate(definition: unknown): HttpBindingDefinition {
    if (!definition || typeof definition !== 'object') {
      throw new HttpBindingDefinitionError('Binding definition must be a non-null object');
    }

    const d = definition as Record<string, unknown>;

    // Source validation
    if (typeof d['source'] !== 'string' || !VALID_SOURCES.has(d['source'] as HttpBindingSource)) {
      throw new HttpBindingDefinitionError(
        `Invalid binding source '${String(d['source'])}'. Must be one of: PATH, QUERY, HEADER, COOKIE, BODY`,
      );
    }
    const source = d['source'] as HttpBindingSource;

    // Target validation
    if (typeof d['target'] !== 'string' || d['target'].trim() === '') {
      throw new HttpBindingDefinitionError(
        'Binding target must be a non-empty string',
        undefined,
        source,
      );
    }
    const target = d['target'].trim();

    // Field validation
    let field: string | undefined;
    if (d['field'] !== undefined) {
      if (typeof d['field'] !== 'string' || d['field'].trim() === '') {
        throw new HttpBindingDefinitionError(
          'Binding field must be a non-empty string when specified',
          undefined,
          source,
        );
      }
      field = d['field'].trim();
    } else if (source !== 'BODY') {
      // For PATH, QUERY, HEADER, COOKIE, field defaults to target if not explicitly specified
      field = target;
    }

    // Type validation
    let type: HttpValueType | undefined;
    if (d['type'] !== undefined) {
      if (typeof d['type'] !== 'string' || !VALID_TYPES.has(d['type'] as HttpValueType)) {
        throw new HttpBindingDefinitionError(
          `Invalid binding value type '${String(d['type'])}'. Must be one of: STRING, NUMBER, BOOLEAN, INTEGER, JSON, ARRAY, OBJECT`,
          field,
          source,
        );
      }
      type = d['type'] as HttpValueType;
    }

    // Required validation
    if (d['required'] !== undefined && typeof d['required'] !== 'boolean') {
      throw new HttpBindingDefinitionError(
        'Binding required flag must be a boolean when specified',
        field,
        source,
      );
    }
    const required = d['required'] ?? false;

    // Metadata validation
    let metadata: Readonly<Record<string, unknown>> | undefined;
    if (d['metadata'] !== undefined) {
      if (
        typeof d['metadata'] !== 'object' ||
        d['metadata'] === null ||
        Array.isArray(d['metadata'])
      ) {
        throw new HttpBindingDefinitionError(
          'Binding metadata must be an object when specified',
          field,
          source,
        );
      }
      metadata = Object.freeze({ ...(d['metadata'] as Record<string, unknown>) });
    }

    const validated: HttpBindingDefinition = {
      source,
      field,
      target,
      required,
      type,
      defaultValue: d['defaultValue'],
      metadata,
    };

    return Object.freeze(validated);
  }

  public static validateMany(definitions: unknown): readonly HttpBindingDefinition[] {
    if (!Array.isArray(definitions)) {
      throw new HttpBindingDefinitionError('Binding definitions must be an array');
    }

    const targets = new Set<string>();
    const validatedList: HttpBindingDefinition[] = [];

    for (const def of definitions) {
      const validated = HttpBindingValidator.validate(def);
      if (targets.has(validated.target)) {
        throw new HttpBindingDefinitionError(
          `Duplicate binding target '${validated.target}' detected in binding definition list`,
          validated.field,
          validated.source,
        );
      }
      targets.add(validated.target);
      validatedList.push(validated);
    }

    return Object.freeze(validatedList);
  }
}
