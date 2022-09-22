import { makeConfig, parseYamlToDocument } from '../../../__tests__/utils';
import { outdent } from 'outdent';
import { bundleDocument } from '../../bundle';
import { BaseResolver } from '../../resolve';

describe('oas3 media-type-examples-override', () => {
  it('should works', async () => {
    const testDocument = parseYamlToDocument(
      outdent`
            openapi: 3.0.0
            paths:
            /pet:
              get:
                responses:
                  200:
                    description: json
                    content:
                      application/json:
                        example:
                          def:
                            value:
                              a: t
                              b: 3
                      
    `
    );
    const { bundle: res } = await bundleDocument({
      document: testDocument,
      externalRefResolver: new BaseResolver(),
      config: await makeConfig(
        {},
        {
          'media-type-examples-override': {
            operationIds: { getUserById: { responses: { '200': 'request.yaml' } } },
          },
        }
      ),
    });
  });
});
