import * as redoclyConfig from '@redocly/config';

import type { ResolveTypeFn } from '../types/index.js';
import { ConfigTypes, createConfigTypes } from '../types/redocly-yaml.js';

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

describe('Rules NodeType resolving', () => {
  const rulesResolver = ConfigTypes.Rules.additionalProperties as ResolveTypeFn;

  it('resolves built-in rule names', () => {
    expect(rulesResolver({}, 'no-unresolved-refs')).toBe('BuiltinRule');
  });

  it('resolves custom (plugin-prefixed) rule names', () => {
    expect(rulesResolver({}, 'my-plugin/my-custom-rule')).toBe('CustomRule');
  });

  it('resolves configurable rule names (rule/ prefix)', () => {
    expect(rulesResolver({}, 'rule/my-configurable-rule')).toBe('ConfigurableRule');
  });

  it('resolves schema-related keys', () => {
    expect(rulesResolver({}, 'metadata-schema')).toBe('Schema');
    expect(rulesResolver({}, 'custom-fields-schema')).toBe('Schema');
  });

  it('returns undefined for unknown rule names', () => {
    expect(rulesResolver({}, 'not-a-real-rule')).toBeUndefined();
  });
});

describe('Decorators / Preprocessors NodeType resolving', () => {
  const decoratorsResolver = ConfigTypes.Decorators.additionalProperties as ResolveTypeFn;
  const preprocessorsResolver = ConfigTypes.Preprocessors.additionalProperties as ResolveTypeFn;

  it('resolves built-in decorator names', () => {
    expect(decoratorsResolver({}, 'remove-unused-components')).toBe('BuiltinDecorator');
  });

  it('resolves custom (plugin-prefixed) decorator names', () => {
    expect(decoratorsResolver({}, 'my-plugin/my-custom-decorator')).toBe('CustomDecorator');
  });

  it('returns undefined for unknown decorator names', () => {
    expect(decoratorsResolver({}, 'not-a-real-decorator')).toBeUndefined();
  });

  it('resolves built-in and custom preprocessor names', () => {
    expect(preprocessorsResolver({}, 'remove-unused-components')).toBe('BuiltinPreprocessor');
    expect(preprocessorsResolver({}, 'my-plugin/my-preprocessor')).toBe('CustomPreprocessor');
    expect(preprocessorsResolver({}, 'unknown')).toBeUndefined();
  });
});
