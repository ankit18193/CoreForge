export interface RouteGroup {
  readonly prefix: string;
  readonly version?: string | undefined;
  readonly tags?: readonly string[] | undefined;
  readonly metadata?: Readonly<Record<string, unknown>> | undefined;
}
