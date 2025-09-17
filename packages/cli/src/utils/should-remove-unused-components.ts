import type { Config } from '@redocly/openapi-core';

export function shouldRemoveUnusedComponents(
  aliasConfig: Config,
  globalSetting: boolean | undefined
): boolean {
  const apiLevelDecorators = aliasConfig.resolvedConfig.decorators;
  const hasApiLevelSetting = apiLevelDecorators?.hasOwnProperty('remove-unused-components');
  const apiLevelValue = apiLevelDecorators?.['remove-unused-components'];

  if (hasApiLevelSetting) {
    if (typeof apiLevelValue === 'string') {
      return apiLevelValue !== 'off';
    } else if (typeof apiLevelValue === 'boolean') {
      return apiLevelValue;
    } else {
      return true;
    }
  } else {
    return globalSetting ?? false;
  }
}
