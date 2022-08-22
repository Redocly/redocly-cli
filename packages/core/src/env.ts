export const isBrowser =
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  typeof window !== 'undefined' || typeof self !== 'undefined' || typeof process === 'undefined'; // main and worker thread
export const env = isBrowser ? {} : process.env || {};
