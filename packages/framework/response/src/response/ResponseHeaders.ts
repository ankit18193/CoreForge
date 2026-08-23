import { InvalidResponseHeaderError } from '../errors/ResponseErrors';
import { ResponseHeaders as IResponseHeaders } from '../types/responseTypes';

export class ResponseHeaders implements IResponseHeaders {
  private readonly _values: Record<string, string | readonly string[]> = {};

  constructor(initialHeaders?: Readonly<Record<string, string | readonly string[]>>) {
    if (initialHeaders) {
      for (const [key, value] of Object.entries(initialHeaders)) {
        this.set(key, value);
      }
    }
  }

  public get values(): Readonly<Record<string, string | readonly string[]>> {
    return Object.freeze({ ...this._values });
  }

  public get(name: string): string | readonly string[] | undefined {
    ResponseHeaders.validateHeaderName(name);
    return this._values[name.toLowerCase()];
  }

  public has(name: string): boolean {
    ResponseHeaders.validateHeaderName(name);
    return Object.prototype.hasOwnProperty.call(this._values, name.toLowerCase());
  }

  public set(name: string, value: string | readonly string[]): void {
    ResponseHeaders.validateHeaderName(name);
    ResponseHeaders.validateHeaderValue(name, value);

    const normalizedKey = name.toLowerCase();
    if (Array.isArray(value)) {
      this._values[normalizedKey] = Object.freeze([...value]);
    } else {
      this._values[normalizedKey] = value;
    }
  }

  public static from(
    headers?: Readonly<Record<string, string | readonly string[]>> | IResponseHeaders,
  ): ResponseHeaders {
    if (!headers) {
      return new ResponseHeaders();
    }
    if (headers instanceof ResponseHeaders) {
      return headers;
    }
    if (typeof (headers as IResponseHeaders).values === 'object') {
      return new ResponseHeaders((headers as IResponseHeaders).values);
    }
    return new ResponseHeaders(headers as Readonly<Record<string, string | readonly string[]>>);
  }

  public static validateHeaderName(name: unknown): void {
    if (typeof name !== 'string' || name.trim() === '') {
      throw new InvalidResponseHeaderError(name, 'Header name must be a non-empty string.');
    }

    if (/[\r\n\0]/.test(name)) {
      throw new InvalidResponseHeaderError(name, 'Header name cannot contain control characters.');
    }
  }

  public static validateHeaderValue(name: string, value: unknown): void {
    if (typeof value === 'string') {
      if (/[\r\n\0]/.test(value)) {
        throw new InvalidResponseHeaderError(
          name,
          'Header value cannot contain control characters.',
        );
      }
      return;
    }

    if (Array.isArray(value)) {
      for (const item of value) {
        if (typeof item !== 'string' || /[\r\n\0]/.test(item)) {
          throw new InvalidResponseHeaderError(
            name,
            'Header array values must be strings without control characters.',
          );
        }
      }
      return;
    }

    throw new InvalidResponseHeaderError(
      name,
      `Header value must be a string or array of strings, received "${typeof value}".`,
    );
  }
}
