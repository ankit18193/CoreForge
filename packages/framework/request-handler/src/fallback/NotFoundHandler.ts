import { RequestExecutionContext } from '../pipeline/RequestExecutionContext';
import { RequestResult } from '../result/RequestResult';

export class NotFoundHandler {
  public handle(_context: RequestExecutionContext): RequestResult {
    return new RequestResult(404, {
      message: 'Resource Not Found',
      error: 'Not Found',
      statusCode: 404,
    });
  }
}
