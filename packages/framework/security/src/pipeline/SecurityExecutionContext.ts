import { SecurityStage } from './SecurityStage';
import { SecurityContext } from '../context/SecurityContext';

export class SecurityExecutionContext {
  public readonly context: SecurityContext;
  private _stage = SecurityStage.AUTHENTICATION;

  constructor(context: SecurityContext) {
    this.context = context;
  }

  public get stage(): SecurityStage {
    return this._stage;
  }

  public setStage(stage: SecurityStage): void {
    this._stage = stage;
  }
}
