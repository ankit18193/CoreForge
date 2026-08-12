import { ExceptionMapper } from '@coreforge/exceptions';

import { RequestExecutionContext } from '../pipeline/RequestExecutionContext';
import { RequestResult } from '../result/RequestResult';

export class ResponseMapper {
  private readonly _exceptionMapper?: ExceptionMapper | undefined;

  constructor(exceptionMapper?: ExceptionMapper) {
    this._exceptionMapper = exceptionMapper;
  }

  public map(context: RequestExecutionContext): RequestResult {
    const ctrlResult = context.diagnostics.controllerResult as
      | { success: boolean; returnedValue: unknown; exception: unknown }
      | undefined;

    if (!ctrlResult) {
      if (context.diagnostics.middlewareTerminatedEarly) {
        const resObj = context.response as unknown as Record<string, unknown>;
        const status = (resObj.status as number) || 200;
        const body = resObj.body || null;
        const headers = (resObj.headers || {}) as Record<string, string>;
        return new RequestResult(status, body, headers);
      }
      return new RequestResult(404, {
        message: 'Resource Not Found',
        error: 'Not Found',
        statusCode: 404,
      });
    }

    if (!ctrlResult.success) {
      const err = ctrlResult.exception;

      let code = 'CF-500';
      let statusCode = 500;
      let message = 'Internal Server Error';

      if (err instanceof Error) {
        const mapped = this._exceptionMapper ? this._exceptionMapper.map(err) : err;
        message = mapped.message;

        const name = mapped.name || mapped.constructor.name;
        if (name === 'ValidationError') {
          statusCode = 400;
          code = 'VALIDATION_ERROR';
        } else if (name === 'ActionNotFoundError') {
          statusCode = 404;
          code = 'ACTION_NOT_FOUND';
        } else if (name === 'RequestExecutionError' && message.includes('CancellationException')) {
          statusCode = 499;
          code = 'CLIENT_CLOSED_REQUEST';
        }
      }

      return new RequestResult(statusCode, {
        message,
        error: code,
        statusCode,
      });
    }

    const value = ctrlResult.returnedValue;
    if (value instanceof RequestResult) {
      return value;
    }

    if (value === null || value === undefined) {
      return new RequestResult(204, null);
    }

    return new RequestResult(200, value);
  }
}
