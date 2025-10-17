export function getMatchingStatusCodeRange(code: number | string): string {
  return `${code}`.replace(/^(\d)\d\d$/, (_, firstDigit) => `${firstDigit}XX`);
}
