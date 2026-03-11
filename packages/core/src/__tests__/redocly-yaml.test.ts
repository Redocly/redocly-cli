import * as redoclyConfig from '@redocly/config';

import { createConfigTypes } from '../types/redocly-yaml.js';

describe('createConfigTypes', () => {
  it('matches snapshot for the default config schema', () => {
    const { theme: _theme, ...propertiesWithoutTheme } =
      redoclyConfig.rootRedoclyConfigSchema.properties;

    expect(
      createConfigTypes({
        ...redoclyConfig.rootRedoclyConfigSchema,
        properties: propertiesWithoutTheme,
      })
    ).toMatchSnapshot();
  });
});
