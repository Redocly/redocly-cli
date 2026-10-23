import { buildProjectGitUrl, parseProjectGitUrl } from '../hosted-project.js';

describe('project git URL', () => {
  it('builds the project git URL and encodes the segments', () => {
    expect(buildProjectGitUrl('http://localhost', 'acme', 'my docs')).toBe(
      'http://localhost/api/orgs/acme/projects/my%20docs/git'
    );
  });

  it('reads back the parts of a project git URL', () => {
    const url = buildProjectGitUrl('https://app.cloud.redocly.com', 'acme', 'my docs');

    expect(parseProjectGitUrl(url)).toEqual({
      reuniteUrl: 'https://app.cloud.redocly.com',
      organization: 'acme',
      project: 'my docs',
    });
    expect(parseProjectGitUrl(`${url}/`)).toEqual(parseProjectGitUrl(url));
  });

  it.each([
    'https://github.com/acme/docs.git',
    'git@github.com:acme/docs.git',
    'https://app.cloud.redocly.com/api/orgs/acme/projects/docs',
    'http://example.com/api/orgs/acme/projects/docs/git',
  ])('rejects %s', (url) => {
    expect(parseProjectGitUrl(url)).toBeUndefined();
  });
});
