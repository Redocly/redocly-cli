export function getInputUrl(input: any): URL {
  const url = typeof input === 'string' ? input : input.url;
  return new URL(url);
}
