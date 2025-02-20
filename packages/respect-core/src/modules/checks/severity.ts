import { formatCliInputs } from '../flow-runner';

import type { CHECKS } from './checks';
import type { RuleSeverity } from '@redocly/openapi-core/lib/config/types';

export const DEFAULT_SEVERITY_CONFIGURATION: {
  [key in keyof typeof CHECKS]: RuleSeverity;
} = {
  SUCCESS_CRITERIA_CHECK: 'error',
  STATUS_CODE_CHECK: 'error',
  SCHEMA_CHECK: 'error',
  CONTENT_TYPE_CHECK: 'error',
  UNEXPECTED_ERROR: 'error',
  NETWORK_ERROR: 'error',
};

export function resolveSeverityConfiguration(severityArgument: string | string[] | undefined): {
  [key in keyof typeof CHECKS]: RuleSeverity;
} {
  if (!severityArgument) {
    return DEFAULT_SEVERITY_CONFIGURATION;
  }

  const severityConfiguration = formatCliInputs(severityArgument);

  if (Object.keys(severityConfiguration).length === 0) {
    throw new Error(
      `Failed to parse severity configuration, please check the format ${severityArgument}`
    );
  }

  return {
    ...DEFAULT_SEVERITY_CONFIGURATION,
    ...severityConfiguration,
    UNEXPECTED_ERROR: 'error',
    NETWORK_ERROR: 'error',
  };
}
