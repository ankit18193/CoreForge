export interface HttpCapabilities {
  readonly http1: boolean;
  readonly http2: boolean;
  readonly https: boolean;
  readonly websocket: boolean;
  readonly streaming: boolean;
  readonly multipart: boolean;
}
