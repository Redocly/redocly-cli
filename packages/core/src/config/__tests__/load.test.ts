import { loadConfig } from '../load';
import { Config, Region, resolveRedoclyDomain } from '../config';
import { RedoclyClient } from '../../redocly';
import { loadYaml } from '../../utils';

jest.mock('../../utils');
jest.mock('../config');
jest.mock('../../redocly');

describe('loadConfig', () => {
  // not the Region type values are used to avoid a default values to affect test results
  const regionFromConfig = 'region-from-config';
  const passedRegion = 'passed-region';
  const configPath = 'some-path'

  beforeAll(() => {
    (loadYaml as jest.Mock)
      .mockClear()
      .mockImplementation(() => Promise.resolve(
        {region: regionFromConfig}
      ));
  });

  beforeEach(() => {
    (resolveRedoclyDomain as jest.Mock).mockClear();
    (RedoclyClient as jest.Mock).mockClear();
    (Config as jest.Mock).mockClear();
  });

  it('should use the passed region to resolve a Redocly domain', async () => {
    await loadConfig({ region: (passedRegion as Region)});

    expect(resolveRedoclyDomain).toBeCalledWith(passedRegion);
  });

  it('should use the resolved domain to init redocly client', async () => {
    const resolvedDomain = 'resolved-domain';

    (resolveRedoclyDomain as jest.Mock).mockReturnValue(resolvedDomain);

    await loadConfig();

    expect(resolveRedoclyDomain).toHaveBeenCalled();
    expect(RedoclyClient).toBeCalledWith(resolvedDomain);
  });

  it('should use the passed region to create a config instance', async () => {
    await loadConfig({ region: (passedRegion as Region)});

    expect(Config).toBeCalledWith(
      expect.objectContaining({ region: passedRegion }),
      undefined
    );
  });

  it('should use the region from raw config to resolve a Redocly domain (if no region passed)', async () => {
    await loadConfig({configPath});

    expect(resolveRedoclyDomain).toBeCalledWith(regionFromConfig);
  });

  it('should use the region from raw config to create a config instance (if no region passed)', async () => {
    await loadConfig({configPath});

    expect(Config).toBeCalledWith(
      expect.objectContaining({ region: regionFromConfig }),
      configPath
    );
  });
});
