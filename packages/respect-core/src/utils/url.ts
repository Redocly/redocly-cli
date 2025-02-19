export function combineUrl(host: string, path: string): string {
  const normalizedHost = host.endsWith('/') ? host.slice(0, -1) : host;
  const normalizedPath = path.startsWith('/') ? path.slice(1) : path;
  return `${normalizedHost}/${normalizedPath}`;
}
