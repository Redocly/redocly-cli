import pluralizeOne from 'pluralize';

export function pluralize(sentence: string, count?: number, inclusive?: boolean) {
  return sentence
    .split(' ')
    .map((word) => pluralizeOne(word, count, inclusive))
    .join(' ');
}
