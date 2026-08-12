import { RouterOptions } from './RouterOptions';

export class RouterConfiguration {
  public readonly prefix: string;
  public readonly caseSensitive: boolean;

  constructor(options: RouterOptions) {
    this.prefix = options.prefix !== undefined ? options.prefix : '';
    this.caseSensitive = options.caseSensitive !== undefined ? options.caseSensitive : false;
    Object.freeze(this);
  }
}
