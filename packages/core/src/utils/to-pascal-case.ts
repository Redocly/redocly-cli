export function toPascalCase(value: string): string {
  return value
    .trim()
    .split(/\s+/)
    .map((word) => word.replace(/^[a-z]/, (char) => char.toUpperCase()))
    .join('');
}
