import { TransportResponseError } from '../errors/TransportErrors';

const INVALID_NAME_CHARS = new Set(' ()<>@,;:="/[]?={}'.split(''));

function isInvalidHeaderName(name: string): boolean {
  if (!name || name.trim() === '') {
    return true;
  }
  for (let i = 0; i < name.length; i++) {
    const code = name.charCodeAt(i);
    if (code <= 32 || code === 127 || INVALID_NAME_CHARS.has(name[i])) {
      return true;
    }
  }
  return false;
}

function isInvalidHeaderValue(value: string): boolean {
  for (let i = 0; i < value.length; i++) {
    const code = value.charCodeAt(i);
    if ((code <= 31 && code !== 9) || code === 127) {
      return true;
    }
  }
  return false;
}

export class TransportResponseHeaders {
  public static normalize(
    headers: Readonly<Record<string, string | readonly string[]>> = {},
  ): Readonly<Record<string, string | readonly string[]>> {
    const result: Record<string, string | readonly string[]> = {};

    for (const [key, value] of Object.entries(headers)) {
      if (isInvalidHeaderName(key)) {
        throw new TransportResponseError(`Invalid HTTP header name: '${key}'`);
      }

      const lowerKey = key.toLowerCase();

      if (Array.isArray(value)) {
        for (const item of value) {
          if (typeof item !== 'string' || isInvalidHeaderValue(item)) {
            throw new TransportResponseError(`Invalid HTTP header value for header '${key}'`);
          }
        }
        result[lowerKey] = Object.freeze([...value]);
      } else if (typeof value === 'string') {
        if (isInvalidHeaderValue(value)) {
          throw new TransportResponseError(`Invalid HTTP header value for header '${key}'`);
        }
        result[lowerKey] = value;
      } else {
        throw new TransportResponseError(
          `Header value for '${key}' must be a string or string array.`,
        );
      }
    }

    return Object.freeze(result);
  }
}
