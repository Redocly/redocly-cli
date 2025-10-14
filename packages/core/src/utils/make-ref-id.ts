export function makeRefId(absoluteRef: string, pointer: string) {
  return absoluteRef + '::' + pointer;
}
