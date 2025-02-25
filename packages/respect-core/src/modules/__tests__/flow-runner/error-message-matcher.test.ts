import { bold } from 'colorette';

import { errorMessageMatcher } from '../../../modules/flow-runner';

describe('errorMessageMatcher', () => {
  it('should return correct error message', () => {
    const hint = 'hint';
    const generic = 'generic';
    const specific = 'specific';
    const result = errorMessageMatcher(hint, generic, specific);
    expect(result).toEqual(`${hint}\n\n${bold('Matcher error')}: ${generic}\n\n${specific}`);
  });

  it('should return correct error message without specific', () => {
    const hint = 'hint';
    const generic = 'generic';
    const result = errorMessageMatcher(hint, generic);
    expect(result).toEqual(`${hint}\n\n${bold('Matcher error')}: ${generic}`);
  });
});
