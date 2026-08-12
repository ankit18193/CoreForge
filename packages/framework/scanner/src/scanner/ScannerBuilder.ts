import { ScannerConfiguration } from './ScannerConfiguration';

export class ScannerBuilder {
  public build(): ScannerConfiguration {
    return new ScannerConfiguration();
  }
}
