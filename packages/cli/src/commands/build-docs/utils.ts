export function isURL(str: string): boolean {
  return /^(https?:)\/\//m.test(str);
}

export function sanitizeJSONString(str: string): string {
  return escapeClosingScriptTag(escapeUnicode(str));
}

// see http://www.thespanner.co.uk/2011/07/25/the-json-specification-is-now-wrong/
export function escapeClosingScriptTag(str: string): string {
  return str.replace(/<\/script>/g, '<\\/script>');
}

// see http://www.thespanner.co.uk/2011/07/25/the-json-specification-is-now-wrong/
export function escapeUnicode(str: string): string {
  return str.replace(/\u2028|\u2029/g, (m) => '\\u202' + (m === '\u2028' ? '8' : '9'));
}

export function handleError(error: Error) {
  console.error(error.stack);
  process.exit(1);
}
