import { parseYamlToDocument } from '../../../../../__tests__/utils.js';
import { createConfig, type RuleConfig } from '../../../../config/index.js';
import { lintDocument } from '../../../../lint.js';
import { BaseResolver, type Document } from '../../../../resolve.js';

export async function lintDocumentForTest(
  rules: Record<string, RuleConfig>,
  document: Document,
  additionalDocuments: { absoluteRef: string; body: string }[]
) {
  const baseResolver = new BaseResolver();
  additionalDocuments.forEach((item) =>
    baseResolver.cache.set(
      item.absoluteRef,
      Promise.resolve(parseYamlToDocument(item.body, item.absoluteRef))
    )
  );
  return await lintDocument({
    externalRefResolver: baseResolver,
    document,
    config: await createConfig({ rules }),
  });
}
