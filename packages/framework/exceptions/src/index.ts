export { ExceptionPipeline } from './pipeline/ExceptionPipeline';
export { ExceptionContext } from './pipeline/ExceptionContext';

export { ErrorClassifier } from './classifier/ErrorClassifier';
export { ErrorCategories } from './classifier/ErrorCategory';

export { ExceptionHandlerRegistry } from './handler/ExceptionHandlerRegistry';
export { ExceptionHandlerResolver } from './handler/ExceptionHandlerResolver';
export { FallbackExceptionHandler } from './handler/FallbackExceptionHandler';

export { ErrorNormalizer } from './normalization/ErrorNormalizer';
export { ErrorDescriptorFactory } from './normalization/ErrorDescriptorFactory';
export { ErrorCauseNormalizer } from './normalization/ErrorCauseNormalizer';

export { ErrorResponseMapper } from './response/ErrorResponseMapper';
export { ExceptionMapper } from './legacy/ExceptionMapper';

export { ExceptionLifecycleManager } from './lifecycle/ExceptionLifecycleManager';
export { ExceptionState } from './lifecycle/ExceptionState';

export { ExceptionDiagnostics } from './diagnostics/ExceptionDiagnostics';

export {
  ExceptionError,
  ExceptionStateError,
  ExceptionPipelineError,
  HandlerExecutionError,
  InvalidErrorDescriptorError,
} from './errors/ExceptionErrors';

export type {
  ErrorCategory,
  ErrorCauseDescriptor,
  ErrorClassification,
  ErrorDescriptor,
  ExceptionContext as IExceptionContext,
  ExceptionDiagnosticsSnapshot,
  ExceptionHandler,
  ExceptionPipeline as IExceptionPipeline,
  ExceptionPipelineOptions,
} from './types/exceptionTypes';

export type { TransportNeutralErrorResponse } from './response/ErrorResponseMapper';
