import { HttpAdapter } from '@coreforge/contracts';

import { HttpCapabilities } from '../types/HttpCapabilities';

export interface AdapterDescriptor {
  readonly name: string;
  readonly version: string;
  readonly adapter: HttpAdapter;
  readonly capabilities: HttpCapabilities;
}
