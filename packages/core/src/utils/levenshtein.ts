/** The number of single-character insertions, deletions and substitutions that turn `left` into `right`. */
export function levenshteinDistance(left: string, right: string): number {
  let previousRow = Array.from({ length: right.length + 1 }, (_, index) => index);

  for (let leftIndex = 1; leftIndex <= left.length; leftIndex++) {
    const row = [leftIndex];

    for (let rightIndex = 1; rightIndex <= right.length; rightIndex++) {
      const substitution = left[leftIndex - 1] === right[rightIndex - 1] ? 0 : 1;
      row[rightIndex] = Math.min(
        previousRow[rightIndex] + 1,
        row[rightIndex - 1] + 1,
        previousRow[rightIndex - 1] + substitution
      );
    }

    previousRow = row;
  }

  return previousRow[right.length];
}

/**
 * How alike two strings are, from 0 (nothing in common) to 1 (equal): the share of the longer
 * string that the edit leaves untouched. Two empty strings are equal.
 */
export function levenshteinSimilarity(left: string, right: string): number {
  const longest = Math.max(left.length, right.length);
  return longest === 0 ? 1 : 1 - levenshteinDistance(left, right) / longest;
}
