import { ContentSerializer } from './ContentSerializer';
import { ResponseModel } from '../mapper/ResponseModel';

export class TextSerializer implements ContentSerializer {
  public async serialize(response: ResponseModel): Promise<unknown> {
    const val = response.body;
    if (val === null || val === undefined) {
      return '';
    }
    return String(val);
  }
}
