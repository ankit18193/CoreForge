import { Container } from '@coreforge/contracts';

export class ApplicationContext {
  public readonly applicationName: string;
  public readonly frameworkVersion = '0.1.0';
  public readonly environment: string;
  public readonly startTime: number;
  public readonly container: Container;
  public readonly globalServices: Record<string, unknown> = {};

  constructor(params: { applicationName: string; environment: string; container: Container }) {
    this.applicationName = params.applicationName;
    this.environment = params.environment;
    this.container = params.container;
    this.startTime = Date.now();
    Object.freeze(this);
  }
}
