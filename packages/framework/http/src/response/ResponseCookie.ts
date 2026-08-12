export interface ResponseCookie {
  readonly name: string;
  readonly value: string;
  readonly secure?: boolean | undefined;
  readonly httpOnly?: boolean | undefined;
  readonly sameSite?: 'Lax' | 'Strict' | 'None' | undefined;
  readonly expires?: Date | undefined;
  readonly path?: string | undefined;
  readonly domain?: string | undefined;
  readonly maxAge?: number | undefined;
}
