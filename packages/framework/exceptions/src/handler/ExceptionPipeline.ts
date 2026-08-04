import { ExceptionCategory } from '../classifier/ExceptionCategory';
import { ExceptionClassifier } from '../classifier/ExceptionClassifier';
import { ExceptionContext } from '../context/ExceptionContext';
import { ExceptionExecutionContext } from '../execution/ExceptionExecutionContext';
import { FilterPipeline } from '../filters/FilterPipeline';
import { ExceptionMapper } from '../mapper/ExceptionMapper';
import { ReporterPipeline } from '../reporters/ReporterPipeline';
import { ExceptionResult } from '../result/ExceptionResult';
import { ExceptionPipelineOptions } from '../types/exceptionTypes';

export class ExceptionPipeline {
  private readonly _mapper: ExceptionMapper;
  private readonly _classifier: ExceptionClassifier;
  private readonly _filterPipeline: FilterPipeline;
  private readonly _reporterPipeline: ReporterPipeline;

  constructor(options?: ExceptionPipelineOptions) {
    this._mapper = options?.mapper || new ExceptionMapper();
    this._classifier = options?.classifier || new ExceptionClassifier();
    this._filterPipeline = options?.filterPipeline || new FilterPipeline();
    this._reporterPipeline = options?.reporterPipeline || new ReporterPipeline();
  }

  public get mapper(): ExceptionMapper {
    return this._mapper;
  }

  public get classifier(): ExceptionClassifier {
    return this._classifier;
  }

  public get filterPipeline(): FilterPipeline {
    return this._filterPipeline;
  }

  public get reporterPipeline(): ReporterPipeline {
    return this._reporterPipeline;
  }

  public async run(
    error: Error,
    contextPayload?: Partial<ExceptionContext>,
  ): Promise<ExceptionResult> {
    const execution = new ExceptionExecutionContext();

    const normalized = this._mapper.map(error);

    const category = this._classifier.classify(normalized);

    execution.complete(category, normalized);

    const contextMetadata = {
      ...(contextPayload?.metadata || {}),
      categoryName: ExceptionCategory[category],
    };

    const context = new ExceptionContext({
      requestId: contextPayload?.requestId,
      traceId: contextPayload?.traceId,
      spanId: contextPayload?.spanId,
      module: contextPayload?.module,
      service: contextPayload?.service,
      operation: contextPayload?.operation,
      environment: contextPayload?.environment,
      runtimeState: contextPayload?.runtimeState,
      moduleState: contextPayload?.moduleState,
      timestamp: contextPayload?.timestamp,
      metadata: contextMetadata,
    });

    const filtersRun: string[] = [];
    const shouldHandle = this._filterPipeline.shouldHandle(normalized, filtersRun);
    filtersRun.forEach((fName) => execution.filtersExecuted.push(fName));

    if (!shouldHandle) {
      return new ExceptionResult({
        normalizedError: normalized,
        category,
        filtered: true,
        reportersExecuted: [],
        processingTime: execution.duration || 0,
        logged: false,
      });
    }

    const reportersRun = await this._reporterPipeline.execute(normalized, context);
    reportersRun.forEach((rName) => execution.reportersExecuted.push(rName));

    const logged = reportersRun.includes('LoggerReporter');

    return new ExceptionResult({
      normalizedError: normalized,
      category,
      filtered: false,
      reportersExecuted: reportersRun,
      processingTime: execution.duration || 0,
      logged,
    });
  }
}
