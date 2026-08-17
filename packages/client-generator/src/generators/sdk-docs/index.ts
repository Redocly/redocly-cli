import { join } from 'node:path';

import { renderSdkDocs, type SdkDocsLanguage } from '../../emitters/sdk-docs.js';
import { NotSupportedError } from '../../errors.js';
import { anchor } from '../anchor.js';
import type { Generator, GeneratorOptionsSchema } from '../types.js';

/**
 * The sdk-docs generator: one Markdown page per SDK selected in the same run
 * (`<stem>.python.md`, `<stem>.go.md`, …). Each page renders from the IR the SDK is built
 * from, and takes its call snippets from that SDK generator's own `sample` hook, so a page
 * never spells out call syntax a second time.
 */
export const sdkDocsOptions: GeneratorOptionsSchema = {
  type: 'object',
  properties: {
    title: {
      type: 'string',
      description: 'Page heading. Defaults to "<API title> <Language> SDK reference".',
    },
    frontmatter: {
      type: 'boolean',
      default: false,
      description: 'Emit YAML front matter carrying the title, for docs sites that expect it.',
    },
  },
  additionalProperties: false,
};

/** The SDKs this generator documents, and the one line each needs beyond the IR. */
const LANGUAGES: SdkDocsLanguage[] = [
  {
    name: 'typescript',
    label: 'TypeScript',
    fence: 'typescript',
    requires: 'The client has no dependencies.',
  },
  { name: 'python', label: 'Python', fence: 'python', requires: 'The SDK needs `httpx`.' },
  {
    name: 'go',
    label: 'Go',
    fence: 'go',
    requires: 'The SDK needs the standard library only.',
  },
  { name: 'php', label: 'PHP', fence: 'php', requires: 'The SDK needs the curl extension.' },
];

export const sdkDocsGenerator: Generator = ({
  model,
  outputPath,
  emit,
  options,
  selected,
  samples,
}) => {
  const documented = LANGUAGES.filter((language) => selected?.includes(language.name));
  if (documented.length === 0) {
    throw new NotSupportedError(
      'The "sdk-docs" generator documents an SDK, so also select one of: typescript, python, go, php.'
    );
  }
  const { dir, stem } = anchor(outputPath);
  const title = options?.title as string | undefined;
  return documented.map((language) => {
    const sample = samples?.[language.name];
    return {
      path: join(dir, `${stem}.${language.name}.md`),
      content: renderSdkDocs(model, {
        // Two pages must not share one heading, so a caller's title carries the language.
        title:
          title === undefined
            ? `${model.title} ${language.label} SDK reference`
            : documented.length > 1
              ? `${title} (${language.label})`
              : title,
        frontmatter: options?.frontmatter === true,
        language,
        sample: (operation) => sample?.(operation, { model, emit }),
        pagination: emit.pagination,
      }),
    };
  });
};
