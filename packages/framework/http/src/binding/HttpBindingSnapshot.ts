import type {
  HttpBindingContext,
  HttpBindingDefinition,
  HttpBindingResult,
  HttpValidationErrorDetail,
} from '@coreforge/contracts';

export class HttpBindingSnapshot {
  /**
   * Deep-clone and recursively freeze any plain object or array, protecting against circular references.
   */
  public static deepFreeze<T>(value: T, seen = new WeakSet<object>()): T {
    if (value === null || typeof value !== 'object') {
      return value;
    }

    if (seen.has(value)) {
      return value;
    }
    seen.add(value);

    if (Array.isArray(value)) {
      for (let i = 0; i < value.length; i++) {
        HttpBindingSnapshot.deepFreeze(value[i], seen);
      }
      return Object.freeze(value) as unknown as T;
    }

    const obj = value as Record<string, unknown>;
    for (const key of Object.keys(obj)) {
      const prop = obj[key];
      if (prop !== null && typeof prop === 'object') {
        HttpBindingSnapshot.deepFreeze(prop, seen);
      }
    }

    return Object.freeze(value);
  }

  /**
   * Create an immutable snapshot of an HttpBindingDefinition.
   */
  public static createDefinition(definition: HttpBindingDefinition): HttpBindingDefinition {
    return Object.freeze({
      source: definition.source,
      field: definition.field,
      target: definition.target,
      required: definition.required ?? false,
      type: definition.type,
      defaultValue:
        definition.defaultValue !== undefined
          ? HttpBindingSnapshot.deepFreeze(
              typeof definition.defaultValue === 'object' && definition.defaultValue !== null
                ? JSON.parse(JSON.stringify(definition.defaultValue))
                : definition.defaultValue,
            )
          : undefined,
      metadata: definition.metadata
        ? HttpBindingSnapshot.deepFreeze({ ...definition.metadata })
        : undefined,
    });
  }

  /**
   * Create a deep-frozen immutable snapshot of a binding context.
   */
  public static createContext<TReq = unknown>(
    ctx: HttpBindingContext<TReq>,
  ): HttpBindingContext<TReq> {
    const frozen: HttpBindingContext<TReq> = {
      request: Object.freeze({ ...ctx.request }),
      route: ctx.route ? Object.freeze({ ...ctx.route }) : undefined,
      parameters: HttpBindingSnapshot.deepFreeze({ ...ctx.parameters }),
      metadata: HttpBindingSnapshot.deepFreeze({ ...ctx.metadata }),
      executionContext: ctx.executionContext,
    };
    return Object.freeze(frozen);
  }

  /**
   * Create an immutable binding result snapshot.
   */
  public static createResult<T = unknown>(
    success: boolean,
    durationMs: number,
    value?: T,
    errors: readonly HttpValidationErrorDetail[] = [],
  ): HttpBindingResult<T> {
    const frozenErrors = HttpBindingSnapshot.deepFreeze(
      errors.map((e) => ({
        field: e.field,
        source: e.source,
        code: e.code,
        message: e.message,
      })),
    );

    const frozenValue =
      value !== undefined && typeof value === 'object' && value !== null
        ? HttpBindingSnapshot.deepFreeze(value)
        : value;

    return Object.freeze({
      success,
      value: frozenValue,
      errors: frozenErrors,
      durationMs,
    }) as HttpBindingResult<T>;
  }
}
