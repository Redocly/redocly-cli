import { formatCliInputs } from '../flow-runner/index.js';

import type { CHECKS } from './checks.js';
import type { RuleSeverity } from '@redocly/openapi-core';

export const DEFAULT_SEVERITY_CONFIGURATION: {
  [key in keyof typeof CHECKS]: RuleSeverity;
} = {
  SUCCESS_CRITERIA_CHECK: 'error',
  STATUS_CODE_CHECK: 'error',
  SCHEMA_CHECK: 'error',
  CONTENT_TYPE_CHECK: 'error',
  RESPONSE_HEADER_CHECK: 'error',
  GLOBAL_TIMEOUT_ERROR: 'error',
  MAX_STEPS_REACHED_ERROR: 'error',
  NETWORK_ERROR: 'error',
  UNEXPECTED_ERROR: 'error',
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
