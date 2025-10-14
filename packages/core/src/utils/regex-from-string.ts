export function regexFromString(input: string): RegExp | null {
  const matches = input.match(/^\/(.*)\/(.*)|(.*)/);
  return matches && new RegExp(matches[1] || matches[3], matches[2]);
}
