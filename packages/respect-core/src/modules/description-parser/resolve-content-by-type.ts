import type { Oas3MediaType } from '@redocly/openapi-core';

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
  content: Record<string, Oas3MediaType> | undefined,
  contentType: string
): Oas3MediaType | undefined {
  if (!content) return undefined;
  if (content[contentType]) return content[contentType];

  // The most specific media type applies: `application/*` wins over `*/*`.
  const [mostSpecificPattern] = Object.keys(content)
    .filter((pattern) => contentTypeMatchesPattern(contentType, pattern))
    .sort((left, right) => left.split('*').length - right.split('*').length);

  return content[mostSpecificPattern];
}
