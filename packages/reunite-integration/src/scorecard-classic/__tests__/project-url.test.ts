import { isAllowedScorecardProjectUrl } from '../validation/project-url.js';

describe('isAllowedScorecardProjectUrl', () => {
  it('should return true for valid project URLs', () => {
    expect(
      isAllowedScorecardProjectUrl('https://app.some.redocly.com/org/my-org/project/my-project')
    ).toBe(true);
  });

  it('should return false for invalid project URLs', () => {
    expect(isAllowedScorecardProjectUrl('https://example.com/org/my-org/project/my-project')).toBe(
      false
    );
    expect(isAllowedScorecardProjectUrl('file://example/org/my-org/project/my-project')).toBe(
      false
    );
    expect(
      isAllowedScorecardProjectUrl('https://app.some.remocly.com/org/my-org/project/my-project')
    ).toBe(false);
    expect(isAllowedScorecardProjectUrl('project/my-project')).toBe(false);
  });
});
