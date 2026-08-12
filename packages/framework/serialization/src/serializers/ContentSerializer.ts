import { ResponseModel } from '../mapper/ResponseModel';

export interface ContentSerializer {
  serialize(response: ResponseModel): Promise<unknown>;
}
