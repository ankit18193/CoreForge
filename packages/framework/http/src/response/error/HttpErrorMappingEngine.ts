import {
  HttpErrorMapper,
  HttpErrorMappingContext,
  HttpErrorMappingResult,
} from '@coreforge/contracts';

import { DefaultHttpErrorMapper } from './DefaultHttpErrorMapper';
import { HttpErrorMapperRegistry } from './HttpErrorMapperRegistry';
import { HttpErrorMapperResolver } from './HttpErrorMapperResolver';
import { HttpErrorMappingValidator } from './HttpErrorMappingValidator';
import { HttpPublicErrorSnapshot } from './HttpPublicErrorSnapshot';
import { HttpErrorMappingDiagnostics } from '../../diagnostics/HttpErrorMappingDiagnostics';
import { HttpErrorMappingOptions } from '../../types/httpTypes';

export class HttpErrorMappingEngine {
  private readonly _registry: HttpErrorMapperRegistry;
  private readonly _resolver: HttpErrorMapperResolver;
  private readonly _defaultMapper: DefaultHttpErrorMapper;
  private readonly _diagnostics: HttpErrorMappingDiagnostics;

  constructor(
    registry?: HttpErrorMapperRegistry,
    options: HttpErrorMappingOptions = {},
    diagnostics?: HttpErrorMappingDiagnostics,
  ) {
    this._registry = registry ?? new HttpErrorMapperRegistry();
    this._defaultMapper = new DefaultHttpErrorMapper(options);
    this._resolver = new HttpErrorMapperResolver(this._registry, this._defaultMapper);
    this._diagnostics = diagnostics ?? new HttpErrorMappingDiagnostics();
  }

  public get registry(): HttpErrorMapperRegistry {
    return this._registry;
  }

  public get resolver(): HttpErrorMapperResolver {
    return this._resolver;
  }

  public get defaultMapper(): DefaultHttpErrorMapper {
    return this._defaultMapper;
  }

  public get diagnostics(): HttpErrorMappingDiagnostics {
    return this._diagnostics;
  }

  public async mapError(
    error: unknown,
    context?: HttpErrorMappingContext,
  ): Promise<HttpErrorMappingResult> {
    const start = Date.now();
    const ctx = context ?? HttpPublicErrorSnapshot.createContext();

    try {
      const mapper = this._resolver.resolve(error);
      if (!mapper) {
        this._diagnostics.recordResolutionFailure();
        const fallbackResult = this._defaultMapper.map(error, ctx);
        this._diagnostics.recordFallback(fallbackResult.status, Date.now() - start);
        return fallbackResult;
      }

      const rawResult = await Promise.resolve(mapper.map(error, ctx));
      HttpErrorMappingValidator.validateResult(rawResult);

      const isFallback = mapper.id === this._defaultMapper.id;
      if (isFallback) {
        this._diagnostics.recordFallback(rawResult.status, Date.now() - start);
      } else {
        this._diagnostics.recordSuccess(rawResult.status, Date.now() - start);
      }

      return rawResult;
    } catch {
      this._diagnostics.recordFailure(Date.now() - start);
      // Safe fallback: never let an unhandled error escape mapper
      const safeFallback = this._defaultMapper.map(error, ctx);
      return safeFallback;
    }
  }

  public mapErrorSync(error: unknown, context?: HttpErrorMappingContext): HttpErrorMappingResult {
    const start = Date.now();
    const ctx = context ?? HttpPublicErrorSnapshot.createContext();

    try {
      const mapper = this._resolver.resolve(error);
      if (!mapper) {
        this._diagnostics.recordResolutionFailure();
        const fallbackResult = this._defaultMapper.map(error, ctx);
        this._diagnostics.recordFallback(fallbackResult.status, Date.now() - start);
        return fallbackResult;
      }

      const rawResult = mapper.map(error, ctx);
      if (rawResult instanceof Promise) {
        // Fallback synchronously if mapper returned promise in sync context
        const fallbackResult = this._defaultMapper.map(error, ctx);
        this._diagnostics.recordFallback(fallbackResult.status, Date.now() - start);
        return fallbackResult;
      }

      HttpErrorMappingValidator.validateResult(rawResult);

      const isFallback = mapper.id === this._defaultMapper.id;
      if (isFallback) {
        this._diagnostics.recordFallback(rawResult.status, Date.now() - start);
      } else {
        this._diagnostics.recordSuccess(rawResult.status, Date.now() - start);
      }

      return rawResult;
    } catch {
      this._diagnostics.recordFailure(Date.now() - start);
      const safeFallback = this._defaultMapper.map(error, ctx);
      return safeFallback;
    }
  }

  public registerMapper(
    mapper: HttpErrorMapper,
    options?: Parameters<HttpErrorMapperRegistry['register']>[1],
  ): this {
    this._registry.register(mapper, options);
    return this;
  }
}
