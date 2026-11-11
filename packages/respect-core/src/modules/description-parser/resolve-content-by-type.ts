export function contentTypeMatchesPattern(contentType: string, pattern: string): boolean {
  const normalizedPattern = pattern.toLowerCase();
  const normalizedContentType = contentType.toLowerCase();

  if (normalizedPattern === '*/*') return true;
  if (normalizedPattern === normalizedContentType) return true;

  const [patternType, patternSubtype] = normalizedPattern.split('/');
  const [actualType, actualSubtype] = normalizedContentType.split('/');

  if (patternType === '*') {
    return patternSubtype === '*' || patternSubtype === actualSubtype;
  }

  if (patternSubtype === '*') {
    return patternType === actualType;
  }

  return false;
}

export function resolveContentByType(
  content: Record<string, any> | undefined,
  contentType: string
) {
  if (!content) return undefined;
  if (content[contentType]) return content[contentType];

  for (const pattern of Object.keys(content)) {
    if (contentTypeMatchesPattern(contentType, pattern)) {
      return content[pattern];
    }
  }
  return undefined;
}
