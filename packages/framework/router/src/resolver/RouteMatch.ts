import { RouteDefinition, RouteMatch as IRouteMatch } from '@coreforge/contracts';

export class RouteMatch implements IRouteMatch {
  public readonly route: RouteDefinition;
  public readonly parameters: Readonly<Record<string, string>>;

  constructor(route: RouteDefinition, parameters: Record<string, string>) {
    this.route = route;
    this.parameters = Object.freeze({ ...parameters });
    Object.freeze(this);
  }
}
