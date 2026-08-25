import { ExecutionContext as IExecutionContext } from '@coreforge/contracts';

import { ExecutionContext } from './ExecutionContext';
import { ExecutionCancellation } from '../cancellation/ExecutionCancellation';
import { ExecutionDiagnostics } from '../diagnostics/ExecutionDiagnostics';
import { ExecutionIdGenerator } from '../identity/ExecutionIdGenerator';
import { ExecutionMetadata } from '../metadata/ExecutionMetadata';

export class ChildContextFactory {
  public static create(
    parent: IExecutionContext,
    childMetadata: Readonly<Record<string, unknown>> | undefined,
    metadataHelper: ExecutionMetadata,
    diagnostics: ExecutionDiagnostics,
  ): ExecutionContext {
    const childExecutionId = ExecutionIdGenerator.generate();
    const mergedMetadata = metadataHelper.merge(parent.metadata, childMetadata);
    const childCancellation = new ExecutionCancellation(parent.signal);

    const childContext = new ExecutionContext({
      executionId: childExecutionId,
      parentExecutionId: parent.executionId,
      metadata: mergedMetadata,
      cancellation: childCancellation,
      diagnostics,
      metadataHelper,
      autoStart: parent.state === 'ACTIVE',
    });

    diagnostics.recordContextCreated(true);
    return childContext;
  }
}
