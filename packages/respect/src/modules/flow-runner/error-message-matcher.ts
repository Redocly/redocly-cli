import { bold } from 'colorette';

export function errorMessageMatcher(
  hint: string, // assertion returned from call to matcherHint
  generic: string, // condition which correct value must fulfill
  specific?: string, // incorrect value returned from call to printWithType
): string {
  return `${hint}\n\n${bold('Matcher error')}: ${generic}${
    typeof specific === 'string' ? `\n\n${specific}` : ''
  }`;
}
