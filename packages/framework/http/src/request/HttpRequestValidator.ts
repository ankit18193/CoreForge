import { HttpMethod, HttpRequest } from '@coreforge/contracts';

import { HttpValidationError } from '../errors/HttpErrors';

const VALID_HTTP_METHODS = new Set<string>([
  'GET',
  'POST',
  'PUT',
  'PATCH',
  'DELETE',
  'HEAD',
  'OPTIONS',
]);

export class HttpRequestValidator {
  public static validate<TBody = unknown>(rawRequest: unknown): HttpRequest<TBody> {
    if (rawRequest === null || rawRequest === undefined || typeof rawRequest !== 'object') {
      throw new HttpValidationError(
        `HttpRequest must be a non-null object, received ${typeof rawRequest}`,
      );
    }

    const req = rawRequest as Record<string, unknown>;

    if (typeof req.method !== 'string' || req.method.trim().length === 0) {
      throw new HttpValidationError('HttpRequest must contain a non-empty string "method"');
    }

    const normalizedMethod = req.method.trim().toUpperCase();
    if (!VALID_HTTP_METHODS.has(normalizedMethod)) {
      throw new HttpValidationError(
        `Invalid HTTP method "${req.method}". Must be one of: ${Array.from(VALID_HTTP_METHODS).join(', ')}`,
      );
    }

    if (typeof req.url !== 'string' || req.url.trim().length === 0) {
      throw new HttpValidationError('HttpRequest must contain a non-empty string "url"');
    }

    if (req.headers !== undefined && req.headers !== null) {
      if (typeof req.headers !== 'object' || Array.isArray(req.headers)) {
        throw new HttpValidationError(
          'HttpRequest "headers" must be a non-array object if provided',
        );
      }
    }

    if (req.query !== undefined && req.query !== null) {
      if (typeof req.query !== 'object' || Array.isArray(req.query)) {
        throw new HttpValidationError('HttpRequest "query" must be a non-array object if provided');
      }
    }

    if (req.pathParameters !== undefined && req.pathParameters !== null) {
      if (typeof req.pathParameters !== 'object' || Array.isArray(req.pathParameters)) {
        throw new HttpValidationError(
          'HttpRequest "pathParameters" must be a non-array object if provided',
        );
      }
    }

    if (req.cookies !== undefined && req.cookies !== null) {
      if (typeof req.cookies !== 'object' || Array.isArray(req.cookies)) {
        throw new HttpValidationError(
          'HttpRequest "cookies" must be a non-array object if provided',
        );
      }
    }

    if (req.metadata !== undefined && req.metadata !== null) {
      if (typeof req.metadata !== 'object' || Array.isArray(req.metadata)) {
        throw new HttpValidationError(
          'HttpRequest "metadata" must be a non-array object if provided',
        );
      }
    }

    if (req.signal !== undefined && req.signal !== null) {
      if (typeof (req.signal as { aborted?: unknown }).aborted !== 'boolean') {
        throw new HttpValidationError('HttpRequest "signal" must be an AbortSignal if provided');
      }
    }

    return {
      ...req,
      method: normalizedMethod as HttpMethod,
      url: req.url.trim(),
      path:
        typeof req.path === 'string' && req.path.trim().length > 0
          ? req.path.trim()
          : HttpRequestValidator.extractPath(req.url.trim()),
    } as unknown as HttpRequest<TBody>;
  }

  public static extractPath(url: string): string {
    if (url.startsWith('/')) {
      return url.split('?')[0];
    }
    try {
      const parsed = new URL(url, 'http://localhost');
      return parsed.pathname;
    } catch {
      return url.split('?')[0];
    }
  }
}
