// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
export const isBrowser = typeof window !== 'undefined';
export const env = isBrowser ? {} : process.env || {};
