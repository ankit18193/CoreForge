import { ContentSerializer } from './ContentSerializer';
import { SerializationExecutionError } from '../errors/SerializationErrors';
import { ResponseModel } from '../mapper/ResponseModel';

export class BinarySerializer implements ContentSerializer {
  public async serialize(response: ResponseModel): Promise<unknown> {
    const val = response.body;
    if (val === null || val === undefined) {
      return Buffer.alloc(0);
    }

    if (val instanceof Buffer || val instanceof Uint8Array) {
      return val;
    }

    throw new SerializationExecutionError(
      'BinarySerializer: expected body to be Buffer or Uint8Array.',
    );
  }
}
