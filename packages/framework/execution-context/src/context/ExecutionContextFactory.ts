import {
  ExecutionContext as IExecutionContext,
  ExecutionContextOptions,
} from '@coreforge/contracts';

import { ChildContextFactory } from './ChildContextFactory';
import { ExecutionContext } from './ExecutionContext';
import { ExecutionCancellation } from '../cancellation/ExecutionCancellation';
import { ExecutionDiagnostics } from '../diagnostics/ExecutionDiagnostics';
import { ExecutionIdGenerator } from '../identity/ExecutionIdGenerator';
import { ExecutionMetadata } from '../metadata/ExecutionMetadata';

export class ExecutionContextFactory {
  public static create(
    options: ExecutionContextOptions | undefined,
    defaultMetadata: Readonly<Record<string, unknown>> | undefined,
    metadataHelper: ExecutionMetadata,
    diagnostics: ExecutionDiagnostics,
    autoStartDefault: boolean,
  ): IExecutionContext {
    if (options?.parent) {
      return ChildContextFactory.create(
        options.parent,
        options.metadata,
        metadataHelper,
        diagnostics,
      );
    }

    const executionId = ExecutionIdGenerator.generate();
    const baseMetadata = metadataHelper.createSnapshot(defaultMetadata);
    const sanitizedMetadata = metadataHelper.merge(baseMetadata, options?.metadata);
    const cancellation = new ExecutionCancellation(options?.signal);

    const autoStart = options?.autoStart ?? autoStartDefault;

    const context = new ExecutionContext({
      executionId,
      metadata: sanitizedMetadata,
      cancellation,
      diagnostics,
      metadataHelper,
      autoStart,
    });

    diagnostics.recordContextCreated(false);
    return context;
  }
}
