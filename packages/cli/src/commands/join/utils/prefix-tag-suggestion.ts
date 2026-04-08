import { logger } from '@redocly/openapi-core';
import { green, blue } from 'colorette';

export function prefixTagSuggestion(conflictsLength: number) {
  logger.info(
    green(
      `\n${conflictsLength} conflict(s) on tags.\nSuggestion: please use ${blue(
        'prefix-tags-with-filename'
      )}, ${blue('prefix-tags-with-info-prop')} or ${blue(
        'without-x-tag-groups'
      )} to prevent naming conflicts.\n\n`
    )
  );
}
