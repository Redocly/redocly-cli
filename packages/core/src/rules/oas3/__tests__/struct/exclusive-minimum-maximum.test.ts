import { outdent } from 'outdent';
import { lintDocument } from '../../../../lint.js';
import { parseYamlToDocument } from '../../../../../__tests__/utils.js';
import { BaseResolver } from '../../../../resolve.js';
import { createConfig } from '../../../../config/index.js';

describe('OAS3.1 exclusiveMinimum/exclusiveMaximum migration', () => {
  it('reports boolean exclusiveMinimum in OAS 3.1', async () => {
    const document = parseYamlToDocument(
      outdent`
      openapi: 3.1.0
      components:
        schemas:
          Foo:
            type: number
            minimum: 12
            exclusiveMinimum: true
      `
    );

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await createConfig({ rules: { 'exclusive-minimum-maximum': 'error' } }),
    });

    expect(results.map((r: any) => ({ message: r.message, ruleId: r.ruleId }))).toEqual([
      {
        message:
          'In OpenAPI 3.1 the `exclusiveMinimum` field must be a number. Replace boolean usage with a numeric bound, for example `exclusiveMinimum: <minimum>`.',
        ruleId: 'exclusive-minimum-maximum',
      },
    ]);
  });

  it('does not report boolean exclusiveMinimum in OAS 3.0', async () => {
    const document = parseYamlToDocument(
      outdent`
      openapi: 3.0.0
      components:
        schemas:
          Foo:
            type: number
            minimum: 12
            exclusiveMinimum: true
      `
    );

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await createConfig({ rules: { 'exclusive-minimum-maximum': 'error' } }),
    });

    expect(results).toHaveLength(0);
  });

  it('accepts numeric exclusiveMinimum in OAS 3.1', async () => {
    const document = parseYamlToDocument(
      outdent`
      openapi: 3.1.0
      components:
        schemas:
          Foo:
            type: number
            exclusiveMinimum: 12
      `
    );

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await createConfig({ rules: { 'exclusive-minimum-maximum': 'error' } }),
    });

    expect(results).toHaveLength(0);
  });

  it('reports boolean exclusiveMaximum in OAS 3.1', async () => {
    const document = parseYamlToDocument(
      outdent`
      openapi: 3.1.0
      components:
        schemas:
          Foo:
            type: number
            maximum: 100
            exclusiveMaximum: false
      `
    );

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await createConfig({ rules: { 'exclusive-minimum-maximum': 'error' } }),
    });

    expect(results.map((r: any) => ({ message: r.message, ruleId: r.ruleId }))).toEqual([
      {
        message:
          'In OpenAPI 3.1 the `exclusiveMaximum` field must be a number. Replace boolean usage with a numeric bound, for example `exclusiveMaximum: <maximum>`.',
        ruleId: 'exclusive-minimum-maximum',
      },
    ]);
  });
});
