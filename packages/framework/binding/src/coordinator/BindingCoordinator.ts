import { HttpRequest } from '@coreforge/contracts';

import { ActionArguments } from '../arguments/ActionArguments';
import { ArgumentResolver } from '../arguments/ArgumentResolver';
import { TypeConverter } from '../converter/TypeConverter';
import { BindingDiagnostics } from '../diagnostics/BindingDiagnostics';
import { ConversionError, ValidationException, BindingExecutionError } from '../errors/BindingErrors';
import { BodyExtractor } from '../extractor/BodyExtractor';
import { CookieExtractor } from '../extractor/CookieExtractor';
import { HeaderExtractor } from '../extractor/HeaderExtractor';
import { QueryParameterExtractor } from '../extractor/QueryParameterExtractor';
import { RouteParameterExtractor } from '../extractor/RouteParameterExtractor';
import { BindingMetadata } from '../metadata/BindingMetadata';
import { BindingSource } from '../registry/BindingSource';
import { ValidationErrorCollection } from '../validator/ValidationErrorCollection';
import { Validator } from '../validator/Validator';

export class BindingCoordinator {
  private readonly _routeExtractor = new RouteParameterExtractor();
  private readonly _queryExtractor = new QueryParameterExtractor();
  private readonly _headerExtractor = new HeaderExtractor();
  private readonly _cookieExtractor = new CookieExtractor();
  private readonly _bodyExtractor = new BodyExtractor();

  private readonly _customExtractors = new Map<
    BindingSource,
    { extract(request: HttpRequest, name: string): unknown }
  >();

  private readonly _typeConverter: TypeConverter;
  private readonly _validator: Validator;
  private readonly _resolver = new ArgumentResolver();
  private readonly _diagnostics: BindingDiagnostics;

  constructor(
    typeConverter: TypeConverter,
    validator: Validator,
    diagnostics: BindingDiagnostics,
  ) {
    this._typeConverter = typeConverter;
    this._validator = validator;
    this._diagnostics = diagnostics;
  }

  public registerExtractor(
    source: BindingSource,
    extractor: { extract(request: HttpRequest, name: string): unknown },
  ): void {
    this._customExtractors.set(source, extractor);
  }

  public async execute(
    request: HttpRequest,
    parameters: readonly BindingMetadata[],
  ): Promise<ActionArguments> {
    const start = Date.now();
    let conversionStart = Date.now();
    let conversionTotal = 0;
    let validationStart = Date.now();
    let validationTotal = 0;

    const extractedValues: Record<string, unknown> = {};
    const rawValues: Record<string, unknown> = {};
    const validationCollection = new ValidationErrorCollection();

    try {
      for (const param of parameters) {
        let rawVal: unknown;

        const custom = this._customExtractors.get(param.source);
        if (custom) {
          rawVal = custom.extract(request, param.parameterName);
        } else {
          switch (param.source) {
            case BindingSource.ROUTE:
              rawVal = this._routeExtractor.extract(request, param.parameterName);
              break;
            case BindingSource.QUERY:
              rawVal = this._queryExtractor.extract(request, param.parameterName);
              break;
            case BindingSource.HEADER:
              rawVal = this._headerExtractor.extract(request, param.parameterName);
              break;
            case BindingSource.COOKIE:
              rawVal = this._cookieExtractor.extract(request, param.parameterName);
              break;
            case BindingSource.BODY:
              rawVal = this._bodyExtractor.extract(request, param.parameterName);
              break;
            default:
              throw new BindingExecutionError(`Unsupported binding source "${param.source}"`);
          }
        }

        if (rawVal !== undefined) {
          rawValues[param.parameterName] = rawVal;
        }

        let valToConvert = rawVal;
        if (valToConvert === undefined || valToConvert === null) {
          valToConvert = param.defaultValue;
        }

        conversionStart = Date.now();
        const convResult = this._typeConverter.convert(
          valToConvert,
          param.targetType,
          // enumObj lookup can be resolved or checked dynamically
        );
        conversionTotal += Date.now() - conversionStart;

        if (!convResult.success) {
          this._diagnostics.recordConversionFailure();
          throw new ConversionError(
            `Parameter conversion failed for "${param.parameterName}": ${
              convResult.error instanceof Error
                ? convResult.error.message
                : String(convResult.error)
            }`,
          );
        }

        validationStart = Date.now();
        const valRes = this._validator.validate(convResult.value, param.parameterName, {
          required: param.required,
          targetType: param.targetType,
        });
        validationTotal += Date.now() - validationStart;

        if (!valRes.valid) {
          for (const err of valRes.errors) {
            validationCollection.addError(err.path, err.message, err.ruleName);
          }
          for (const warn of valRes.warnings) {
            validationCollection.addWarning(warn.path, warn.message);
          }
        }

        extractedValues[param.parameterName] = convResult.value;
      }

      if (validationCollection.hasErrors) {
        this._diagnostics.recordValidationFailure();
        const res = validationCollection.toResult();
        throw new ValidationException(
          `Request validation failed: ${res.errors.map((e) => e.message).join(', ')}`,
          res.errors,
        );
      }

      const args = this._resolver.resolve(parameters, extractedValues, rawValues);
      this._diagnostics.recordBinding(true, Date.now() - start, conversionTotal, validationTotal);
      return args;
    } catch (err: unknown) {
      this._diagnostics.recordBinding(false, Date.now() - start, conversionTotal, validationTotal);
      throw err;
    }
  }
}
