import { InvocationResult } from '@coreforge/contracts';

import { HeaderResolver } from './HeaderResolver';
import { ResponseModel } from './ResponseModel';
import { StatusCodeResolver } from './StatusCodeResolver';

export class ResponseMapper {
  private readonly _statusCodeResolver = new StatusCodeResolver();
  private readonly _headerResolver = new HeaderResolver();

  public map(result: InvocationResult, mediaType: string): ResponseModel {
    const statusCode = this._statusCodeResolver.resolve(result);
    const headers = this._headerResolver.resolve(mediaType);

    return new ResponseModel({
      body: result.value,
      statusCode,
      headers,
      mediaType,
    });
  }
}
