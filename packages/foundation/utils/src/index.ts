export const VERSION = '0.1.0';

export const getTimestamp = (): number => Date.now();

export const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));
