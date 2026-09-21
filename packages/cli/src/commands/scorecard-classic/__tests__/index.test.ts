import { BaseResolver, HandledError, logger } from '@redocly/openapi-core';
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

  it('surfaces a scorecard fetch failure without running the validation', async () => {
    vi.mocked(fetchRemoteScorecardAndPlugins).mockRejectedValue(
      new HandledError(
        'Unauthorized access to project: test-project. Please check your credentials.'
      )
    );

    await expect(handleScorecardClassic({ argv, config, version })).rejects.toThrow(
      'Unauthorized access to project: test-project. Please check your credentials.'
    );
    expect(validateScorecard).not.toHaveBeenCalled();
  });

  it('passes the target level to the validation and surfaces its error', async () => {
    vi.mocked(validateScorecard).mockRejectedValue(
      new HandledError('Target level "Gold" not found in the scorecard configuration levels.\n')
    );

    await expect(
      handleScorecardClassic({ argv: { ...argv, 'target-level': 'Gold' }, config, version })
    ).rejects.toThrow('Target level "Gold" not found in the scorecard configuration levels.');
    expect(validateScorecard).toHaveBeenCalledWith(
      expect.objectContaining({ targetLevel: 'Gold' })
    );
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

  it('prints the fetch, plugin, and level details when verbose is on', async () => {
    vi.spyOn(logger, 'info').mockImplementation(() => {});
    const pluginsCode = 'export default [() => ({ id: "test-plugin" })]';
    vi.mocked(fetchRemoteScorecardAndPlugins).mockResolvedValue({
      scorecard: { levels: [{ name: 'Baseline', rules: {} }] },
      plugins: pluginsCode,
      pluginsUrl: 'https://example.com/plugins.js',
    });
    vi.mocked(validateScorecard).mockResolvedValue({
      problems: [],
      achievedLevel: 'Baseline',
      targetLevelAchieved: true,
    });

    await handleScorecardClassic({ argv: { ...argv, verbose: true }, config, version });

    expect(validateScorecard).toHaveBeenCalledWith(
      expect.objectContaining({ plugins: [expect.objectContaining({ id: 'test-plugin' })] })
    );
    expect(logger.info).toHaveBeenCalledWith(
      'Starting fetch for remote scorecard configuration...\n'
    );
    expect(logger.info).toHaveBeenCalledWith('Successfully fetched scorecard configuration.\n');
    expect(logger.info).toHaveBeenCalledWith('Scorecard levels found: 1\n');
    expect(logger.info).toHaveBeenCalledWith(
      'Successfully fetched plugins from https://example.com/plugins.js\n'
    );
    expect(logger.info).toHaveBeenCalledWith('Found 0 problems for level "Baseline".\n');
  });
});
