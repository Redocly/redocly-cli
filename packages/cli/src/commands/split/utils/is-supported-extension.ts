export function isSupportedExtension(filename: string) {
  return filename.endsWith('.yaml') || filename.endsWith('.yml') || filename.endsWith('.json');
}
