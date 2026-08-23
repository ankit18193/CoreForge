import { ErrorDescriptor } from '../types/exceptionTypes';

export class ErrorDescriptorFactory {
  public static create(descriptor: ErrorDescriptor): ErrorDescriptor {
    return Object.freeze({
      code: descriptor.code,
      category: descriptor.category,
      message: descriptor.message,
      status: descriptor.status,
      details:
        descriptor.details !== undefined ? Object.freeze({ ...descriptor.details }) : undefined,
      cause: descriptor.cause !== undefined ? Object.freeze({ ...descriptor.cause }) : undefined,
      stack: descriptor.stack,
      timestamp: descriptor.timestamp || Date.now(),
    });
  }
}
