export function stripAnsiCodes(text: string): string {
  // Match CSI color sequences like \u001b[31m and \u001b[1;31m.
  // eslint-disable-next-line no-control-regex
  return text.replace(/\u001b\[[0-9;]*m/g, '');
}
