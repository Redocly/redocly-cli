import { outdent } from "outdent";

import { parseYamlToDocument, replaceSourceWithRef } from "../../../../__tests__/utils";

import { validateDocument } from "../../../../validate";
import { LintConfig } from "../../../..";
import { BaseResolver } from "../../../../resolve";

describe('Referenceable scalars', () => {
  it('should not report $ref description', async () => {
    const document = parseYamlToDocument(
      outdent`
          openapi: 3.0.0
          info:
            title: Test
            version: '1.0'
            description:
              $ref: fixtures/description.md
          paths: {}
        `,
      __dirname+ '/foobar.yaml',
    );

    const results = await validateDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: new LintConfig({
        extends: [],
        rules: {
          'spec': 'error',
        },
      }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`Array []`);
  });
});