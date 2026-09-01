import {
  HttpHeaders,
  HttpPublicError,
  HttpErrorMappingContext,
  HttpErrorMappingResult,
} from '@coreforge/contracts';

import { HttpErrorMappingValidator } from './HttpErrorMappingValidator';
import { SanitizedErrorContextParams } from '../../types/httpErrorTypes';

function deepFreeze<T>(obj: T, seen = new WeakSet<object>()): T {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  if (seen.has(obj as object)) {
    return obj;
  }
  seen.add(obj as object);

  Object.freeze(obj);

  if (Array.isArray(obj)) {
    for (const item of obj) {
      if (item && typeof item === 'object') {
        deepFreeze(item, seen);
      }
    }
  } else {
    for (const val of Object.values(obj)) {
      if (val && typeof val === 'object') {
        deepFreeze(val, seen);
      }
    }
  }

  return obj;
}

function deepCloneAndSanitize<T>(value: T, seen = new WeakSet<object>()): T {
  if (value === null || typeof value !== 'object') {
    return value;
  }

  if (value instanceof Date) {
    return new Date(value.getTime()) as unknown as T;
  }

  if (value instanceof RegExp) {
    return new RegExp(value.source, value.flags) as unknown as T;
  }

  if (seen.has(value as object)) {
    return '[Circular]' as unknown as T;
  }
  seen.add(value as object);

  if (Array.isArray(value)) {
    return value.map((item) => deepCloneAndSanitize(item, seen)) as unknown as T;
  }

  const copy: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value)) {
    copy[k] = deepCloneAndSanitize(v, seen);
  }

  return copy as unknown as T;
}

export class HttpPublicErrorSnapshot {
  public static createPublicError(
    code: string,
    message: string,
    details?: unknown,
    timestamp = Date.now(),
  ): HttpPublicError {
    const error: HttpPublicError = {
      code,
      message,
      ...(details !== undefined ? { details: deepCloneAndSanitize(details) } : {}),
      timestamp,
    };

    HttpErrorMappingValidator.validatePublicError(error);
    return deepFreeze(error);
  }

  public static createResult(
    status: number,
    publicError: HttpPublicError,
    headers: HttpHeaders = {},
    metadata?: Record<string, unknown>,
  ): HttpErrorMappingResult {
    HttpErrorMappingValidator.validateStatus(status);
    HttpErrorMappingValidator.validatePublicError(publicError);

    const normalizedHeaders: HttpHeaders = {};
    for (const [k, v] of Object.entries(headers)) {
      normalizedHeaders[k.toLowerCase()] = v;
    }

    const result: HttpErrorMappingResult = {
      status,
      publicError: deepFreeze(publicError),
      headers: deepFreeze(normalizedHeaders),
      metadata: metadata ? deepFreeze(deepCloneAndSanitize(metadata)) : undefined,
    };

    HttpErrorMappingValidator.validateResult(result);
    return Object.freeze(result);
  }

  public static createContext(params: SanitizedErrorContextParams = {}): HttpErrorMappingContext {
    const context: HttpErrorMappingContext = {
      requestId: params.requestId,
      method: params.method ? params.method.toUpperCase() : undefined,
      url: params.url,
      path: params.path,
      metadata: params.metadata ? deepFreeze(deepCloneAndSanitize(params.metadata)) : undefined,
      executionContext: params.executionContext,
    };

    return Object.freeze(context);
  }
}
