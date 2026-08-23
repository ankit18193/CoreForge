import { ResponseDescriptor } from '../response/ResponseDescriptor';
import { NormalizedResult, ResponseProcessingContext } from '../types/responseTypes';

export class ResultNormalizer {
  public static normalize(result: unknown, context?: ResponseProcessingContext): NormalizedResult {
    let status = context?.statusOverride ?? 200;
    let contentType = context?.contentTypeOverride;
    let headers = context?.headersOverride ?? {};
    let body: unknown = result;

    if (ResponseDescriptor.isResponseDescriptor(result)) {
      status = context?.statusOverride ?? result.status;
      contentType = context?.contentTypeOverride ?? result.contentType;
      headers = { ...result.headers.values, ...(context?.headersOverride ?? {}) };
      body = result.body;
      return { status, headers, contentType, body };
    }

    if (result === undefined) {
      status = context?.statusOverride ?? 204;
      contentType = context?.contentTypeOverride ?? undefined;
      body = undefined;
      return { status, headers, contentType, body };
    }

    if (result === null) {
      status = context?.statusOverride ?? 200;
      contentType = context?.contentTypeOverride ?? 'application/json';
      body = null;
      return { status, headers, contentType, body };
    }

    if (typeof result === 'string') {
      status = context?.statusOverride ?? 200;
      contentType = context?.contentTypeOverride ?? 'text/plain; charset=utf-8';
      body = result;
      return { status, headers, contentType, body };
    }

    if (typeof result === 'number' || typeof result === 'boolean' || typeof result === 'bigint') {
      status = context?.statusOverride ?? 200;
      contentType = context?.contentTypeOverride ?? 'application/json';
      body = result;
      return { status, headers, contentType, body };
    }

    if (typeof result === 'object') {
      status = context?.statusOverride ?? 200;
      contentType = context?.contentTypeOverride ?? 'application/json';
      body = result;
      return { status, headers, contentType, body };
    }

    return {
      status,
      headers,
      contentType: contentType ?? 'application/json',
      body,
    };
  }
}
