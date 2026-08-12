export interface HttpServerOptions {
  host?: string | undefined;
  port?: number | undefined;
  httpsOptions?: Record<string, unknown> | undefined;
  requestLimit?: string | undefined;
  adapterToken?: unknown | undefined;
}
