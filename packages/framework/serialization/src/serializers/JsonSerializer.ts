import { ContentSerializer } from './ContentSerializer';
import { SerializationExecutionError } from '../errors/SerializationErrors';
import { ResponseModel } from '../mapper/ResponseModel';

export class JsonSerializer implements ContentSerializer {
  public async serialize(response: ResponseModel): Promise<unknown> {
    try {
      const val = response.body;
      if (val === undefined) {
        return '';
      }
      return JSON.stringify(val);
    } catch (err: unknown) {
      throw new SerializationExecutionError(
        'JsonSerializer: failed to serialize body to JSON string.',
        err instanceof Error ? err : new Error(String(err)),
      );
    }
  }
}
