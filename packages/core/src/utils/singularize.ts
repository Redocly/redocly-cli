import pluralize from 'pluralize';

export function singularize(word: string): string {
  return pluralize.singular(word);
}
