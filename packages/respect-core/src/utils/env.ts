export function isBrowser() {
  return (
    typeof window !== 'undefined' ||
    typeof process === 'undefined' ||
    (process?.platform as any) === 'browser'
  ); // main and worker thread
}

export function env() {
  return isBrowser() ? {} : process.env || {};
}
