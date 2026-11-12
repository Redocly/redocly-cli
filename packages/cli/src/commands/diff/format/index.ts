import type { DiffResult } from '@redocly/openapi-core';

import { htmlDiff } from './html.js';
import { jsonDiff } from './json.js';
import { markdownDiff } from './markdown.js';
import { nextVersionDiff } from './next-version.js';
import { stylishDiff } from './stylish.js';

export const diffReportFormats = {
  stylish: stylishDiff,
  json: jsonDiff,
  markdown: markdownDiff,
  html: htmlDiff,
  'next-version': nextVersionDiff,
} satisfies Record<string, (result: DiffResult) => string>;

export type DiffReportFormat = keyof typeof diffReportFormats;
