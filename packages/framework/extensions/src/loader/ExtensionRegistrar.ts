import { ExtensionExecutionContext } from './ExtensionExecutionContext';
import { ExtensionValidationError } from '../errors/ExtensionErrors';
import { ExtensionProfiler } from '../internal/ExtensionProfiler';
import { ExtensionDescriptor } from '../registry/ExtensionDescriptor';

export class ExtensionRegistrar {
  private readonly _context: ExtensionExecutionContext;

  constructor(context: ExtensionExecutionContext) {
    this._context = context;
  }

  public register(desc: ExtensionDescriptor): void {
    const profiler = new ExtensionProfiler();
    profiler.start();

    if (this._context.extensionRegistry.has(desc.id)) {
      throw new ExtensionValidationError(
        `ExtensionRegistrar: Extension with ID "${desc.id}" is already registered.`,
      );
    }

    this._context.extensionRegistry.register(desc);
    this._context.diagnostics.recordRegistration(
      profiler.durationMs,
      this._context.extensionRegistry.getRegistered().length,
    );
  }
}
