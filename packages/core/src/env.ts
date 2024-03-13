export const isBrowser =
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  typeof window !== 'undefined' || typeof process === 'undefined' || process?.platform === 'browser'; // main and worker thread
export const env = isBrowser ? {} : process.env || {};
