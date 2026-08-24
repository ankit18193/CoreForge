import {
  HistogramOptions,
  MetricDefinition,
  MetricLabels,
  MetricSnapshot,
  MetricTimer,
  MetricType,
  Metrics as IMetrics,
  MetricsDiagnosticsSnapshot,
  MetricsManager as IMetricsManager,
  MetricsProvider,
} from '@coreforge/contracts';

export type {
  HistogramOptions,
  MetricDefinition,
  MetricLabels,
  MetricSnapshot,
  MetricTimer,
  MetricType,
  IMetrics,
  MetricsDiagnosticsSnapshot,
  IMetricsManager,
  MetricsProvider,
};

export type MetricsState = 'CREATED' | 'READY' | 'STOPPING' | 'STOPPED';

export interface MetricsOptions {
  readonly maxCardinality?: number | undefined;
  readonly autoStart?: boolean | undefined;
}
