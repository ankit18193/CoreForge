import type {
  HttpCircularReferencePolicy,
  HttpResponse,
  HttpResponseDiagnosticsSnapshot,
  HttpResponseTransformationOptions,
  HttpResponseTransformer,
  HttpSerializationContext,
  HttpSerializationResult,
  HttpSerializer,
  HttpSerializerOptions,
} from '@coreforge/contracts';

export type {
  HttpCircularReferencePolicy,
  HttpResponse,
  HttpResponseDiagnosticsSnapshot,
  HttpResponseTransformationOptions,
  HttpResponseTransformer,
  HttpSerializationContext,
  HttpSerializationResult,
  HttpSerializer,
  HttpSerializerOptions,
};

export interface RegisteredSerializerEntry<TInput = unknown, TOutput = unknown> {
  readonly serializer: HttpSerializer<TInput, TOutput>;
  readonly priority: number;
  readonly sequence: number;
  readonly enabled: boolean;
  readonly mediaTypes: readonly string[];
}

export interface HttpResponseEngineOptions {
  readonly defaultMediaType?: string | undefined;
  readonly defaultCharset?: string | undefined;
  readonly circularPolicy?: HttpCircularReferencePolicy | undefined;
  readonly defaultTimeoutMs?: number | undefined;
}
