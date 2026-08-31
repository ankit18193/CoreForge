import type {
  ExecutionContext,
  HttpBinder,
  HttpBindingContext,
  HttpBindingDefinition,
  HttpBindingDiagnosticsSnapshot,
  HttpBindingResult,
  HttpBindingSource,
  HttpMiddlewareRouteInfo,
  HttpRequest,
  HttpValidationErrorDetail,
  HttpValidationResult,
  HttpValidationRule,
  HttpValidator,
  HttpValueType,
} from '@coreforge/contracts';

export type {
  ExecutionContext,
  HttpBinder,
  HttpBindingContext,
  HttpBindingDefinition,
  HttpBindingDiagnosticsSnapshot,
  HttpBindingResult,
  HttpBindingSource,
  HttpMiddlewareRouteInfo,
  HttpRequest,
  HttpValidationErrorDetail,
  HttpValidationResult,
  HttpValidationRule,
  HttpValidator,
  HttpValueType,
};

export interface HttpBindingPlanEntry {
  readonly definition: HttpBindingDefinition;
  readonly sequence: number;
}

export interface HttpBindingOptions {
  readonly strict?: boolean | undefined;
  readonly trimStrings?: boolean | undefined;
  readonly allowUnknownFields?: boolean | undefined;
}
