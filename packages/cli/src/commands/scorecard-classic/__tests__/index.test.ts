import { BaseResolver, HandledError } from '@redocly/openapi-core';
import { fetchRemoteScorecardAndPlugins, validateScorecard } from '@redocly/reunite-integration';

import { getAliasOrPath, getFallbackApisOrExit } from '../../../utils/miscellaneous.js';
import { handleScorecardClassic } from '../index.js';

vi.mock('@redocly/reunite-integration', async () => {
  const actual = await vi.importActual('@redocly/reunite-integration');
  return { ...actual, fetchRemoteScorecardAndPlugins: vi.fn(), validateScorecard: vi.fn() };
});
vi.mock('../../../utils/miscellaneous.js', async () => {
  const actual = await vi.importActual('../../../utils/miscellaneous.js');
  return { ...actual, getFallbackApisOrExit: vi.fn(), getAliasOrPath: vi.fn() };
});

const version = '1.2.3';
const config = { resolvedConfig: {}, resolve: {} } as any;
const argv = {
  api: 'openapi.yaml',
  'project-url': 'https://app.redocly.com/org/test-org/project/test-project',
  format: 'stylish' as const,
};

describe('handleScorecardClassic()', () => {
  beforeEach(() => {
    process.env.REDOCLY_AUTHORIZATION = 'test-api-key';
    vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    vi.mocked(getFallbackApisOrExit).mockResolvedValue([{ path: 'openapi.yaml' }]);
    vi.mocked(getAliasOrPath).mockReturnValue({ path: 'openapi.yaml' });
    vi.spyOn(BaseResolver.prototype, 'resolveDocument').mockResolvedValue({
      parsed: { openapi: '3.0.0', info: { title: 'Test API', version: '1.0.0' } },
      source: { absoluteRef: 'openapi.yaml' },
    } as any);
    vi.mocked(fetchRemoteScorecardAndPlugins).mockResolvedValue({
      scorecard: { levels: [{ name: 'Baseline', rules: {} }] },
      plugins: undefined,
      pluginsUrl: undefined,
    });
  });

  afterEach(() => {
    delete process.env.REDOCLY_AUTHORIZATION;
  });

  it('reports a scorecard fetch failure as a handled error', async () => {
    vi.mocked(fetchRemoteScorecardAndPlugins).mockRejectedValue(
      new Error('Unauthorized access to project: test-project. Please check your credentials.')
    );

    await expect(handleScorecardClassic({ argv, config, version })).rejects.toThrow(
      new HandledError(
        'Unauthorized access to project: test-project. Please check your credentials.'
      )
    );
    expect(validateScorecard).not.toHaveBeenCalled();
  });

  it('fails when the target level is not one of the scorecard levels', async () => {
    await expect(
      handleScorecardClassic({ argv: { ...argv, 'target-level': 'Gold' }, config, version })
    ).rejects.toThrow('Target level "Gold" not found in the scorecard configuration levels.');
    expect(validateScorecard).not.toHaveBeenCalled();
  });

  it('passes the resolved document and scorecard to the validation and reports a clean result', async () => {
    vi.mocked(validateScorecard).mockResolvedValue({
      problems: [],
      achievedLevel: 'Baseline',
      targetLevelAchieved: true,
    });

    await handleScorecardClassic({ argv, config, version });

    expect(validateScorecard).toHaveBeenCalledWith(
      expect.objectContaining({
        apiPath: 'openapi.yaml',
        scorecardConfig: { levels: [{ name: 'Baseline', rules: {} }] },
        metadata: { title: 'Test API', version: '1.0.0' },
      })
    );
    expect(process.stdout.write).toHaveBeenCalledWith(
      expect.stringContaining('Your API meets all scorecard requirements.')
    );
  });
});
