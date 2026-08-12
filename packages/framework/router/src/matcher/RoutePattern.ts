export type RouteSegment =
  | { readonly type: 'STATIC'; readonly value: string }
  | { readonly type: 'PARAMETER'; readonly name: string }
  | { readonly type: 'WILDCARD' };

export class RoutePattern {
  public readonly segments: readonly RouteSegment[];

  constructor(segments: RouteSegment[]) {
    this.segments = Object.freeze([...segments]);
    Object.freeze(this);
  }
}
