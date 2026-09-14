import { logger } from '@redocly/openapi-core';
import { bold, cyan, yellow } from 'colorette';

import { renderBanner } from '../../utils/banner.js';

export function printDeprecationNotice() {
  logger.info(
    renderBanner([
      bold(yellow('Deprecation warning: build-docs is moving to Redoc 3')),
      '',
      'An upcoming Redocly CLI v2 release will render docs with Redoc 3:',
      'faster on large APIs, built-in dark mode, CSS-based theming, and',
      'OpenAPI 3.2 support. Redoc 2 theme options and custom templates',
      'may need updates.',
      '',
      'To keep the current Redoc 2 output, use Redocly CLI v1:',
      `  ${cyan('npx @redocly/cli@1 build-docs <api>')}`,
      '',
      `Learn more: ${cyan('https://redocly.com/blog/redoc-3-whats-new')}`,
    ])
  );
}
