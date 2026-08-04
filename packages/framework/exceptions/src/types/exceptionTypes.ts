import { ExceptionClassifier } from '../classifier/ExceptionClassifier';
import { FilterPipeline } from '../filters/FilterPipeline';
import { ExceptionMapper } from '../mapper/ExceptionMapper';
import { ReporterPipeline } from '../reporters/ReporterPipeline';

export interface ExceptionPipelineOptions {
  mapper?: ExceptionMapper;
  classifier?: ExceptionClassifier;
  filterPipeline?: FilterPipeline;
  reporterPipeline?: ReporterPipeline;
}
