import { HttpStage } from './HttpStage';
import { StageDescriptor } from './StageDescriptor';
import { HttpExecutionContext } from '../execution/HttpExecutionContext';

export class HttpPipeline {
  private readonly _stages = new Map<string, StageDescriptor>();
  private readonly _stageOrder: string[] = [];

  constructor() {
    const builtIn = [
      HttpStage.INCOMING_CONNECTION,
      HttpStage.CREATE_REQUEST,
      HttpStage.CREATE_RESPONSE,
      HttpStage.BUILD_CONTEXT,
      HttpStage.DELEGATE_FRAMEWORK,
      HttpStage.SEND_RESPONSE,
      HttpStage.CLOSE_REQUEST,
    ];

    for (let i = 0; i < builtIn.length; i++) {
      const name = builtIn[i];
      const descriptor: StageDescriptor = {
        name,
        hook: { execute: () => {} },
        order: (i + 1) * 10,
        enabled: true,
      };
      this._stages.set(name, descriptor);
      this._stageOrder.push(name);
    }
  }

  public registerStage(descriptor: StageDescriptor): void {
    this._stages.set(descriptor.name, descriptor);
    if (this._stageOrder.includes(descriptor.name)) {
      return;
    }

    if (descriptor.before) {
      const idx = this._stageOrder.indexOf(descriptor.before);
      if (idx !== -1) {
        this._stageOrder.splice(idx, 0, descriptor.name);
        return;
      }
    } else if (descriptor.after) {
      const idx = this._stageOrder.indexOf(descriptor.after);
      if (idx !== -1) {
        this._stageOrder.splice(idx + 1, 0, descriptor.name);
        return;
      }
    }

    this._stageOrder.push(descriptor.name);
    this._stageOrder.sort((a, b) => {
      const da = this._stages.get(a);
      const db = this._stages.get(b);
      return (da?.order || 0) - (db?.order || 0);
    });
  }

  public getStages(): readonly string[] {
    return Object.freeze([...this._stageOrder]);
  }

  public getDescriptor(name: string): StageDescriptor | undefined {
    return this._stages.get(name);
  }

  public async execute(context: HttpExecutionContext): Promise<void> {
    for (const name of this._stageOrder) {
      const stage = this._stages.get(name);
      if (stage && stage.enabled) {
        await stage.hook.execute(context);
      }
    }
  }
}
