export class InjectionToken<T> {
  public readonly description: string;
  declare readonly _brand: T;

  constructor(description: string) {
    this.description = description;
  }
}

export type ServiceToken<T> = string | symbol | InjectionToken<T>;
