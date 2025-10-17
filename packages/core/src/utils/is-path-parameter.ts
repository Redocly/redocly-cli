export function isPathParameter(pathSegment: string) {
  return pathSegment.startsWith('{') && pathSegment.endsWith('}');
}
