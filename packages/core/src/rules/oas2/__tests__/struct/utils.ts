import { parseYamlToDocument } from '../../../../../__tests__/utils.js';
import { type RuleConfig, createConfig } from '../../../../config/index.js';
import { lintDocument } from '../../../../lint.js';
import { BaseResolver } from '../../../../resolve.js';

export async function lintDoc(
  source: string,
  rules: Record<string, RuleConfig> = { struct: 'error' }
) {
  const document = parseYamlToDocument(source, 'foobar.yaml');

  const results = await lintDocument({
    externalRefResolver: new BaseResolver(),
    document,
    config: await createConfig({ rules }),
  });

  return results.map((res) => {
    return {
      message: res.message,
      location: res.location[0].pointer || '',
    };
  });
}
