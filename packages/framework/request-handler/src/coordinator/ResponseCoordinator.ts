import { HttpResponse } from '@coreforge/contracts';

import { RequestResult } from '../result/RequestResult';

export class ResponseCoordinator {
  public dispatch(result: RequestResult, response: HttpResponse): void {
    const mutableRes = response as unknown as {
      status: number;
      headers: Record<string, unknown>;
      body: unknown;
    };
    mutableRes.status = result.statusCode;
    mutableRes.headers = { ...result.headers };
    mutableRes.body = result.body;
  }
}
