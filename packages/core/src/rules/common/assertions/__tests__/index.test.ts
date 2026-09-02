import { outdent } from 'outdent';

import { parseYamlToDocument, replaceSourceWithRef } from '../../../../../__tests__/utils.js';
import { createConfig } from '../../../../config/index.js';
import { lintDocument } from '../../../../lint.js';
import { colorOptions } from '../../../../logger.js';
import { BaseResolver } from '../../../../resolve.js';
import { Assertions } from '../index.js';

const opts = {
  '0': {
    subject: {
      type: 'Operation',
      property: 'summary',
    },
    description: 'example warn text',
    severity: 'warn',
    assertions: { pattern: '/example/' },
  },
  '1': {
    subject: {
      type: 'PathItem',
    },
    where: [
      {
        subject: { type: 'Operation', filterInParentKeys: ['post'], property: 'responses' },
        assertions: { defined: true },
      },
    ],
    description: 'example warn text',
    severity: 'warn',
    assertions: { mutuallyExclusive: ['summary', 'security'] },
  },
  '2': {
    subject: { type: 'PathItem', property: 'tags' },
    where: [
      { subject: { type: 'Operation', property: 'responses' }, assertions: { defined: true } },
    ],
    description: 'example warn text',
    severity: 'warn',
    assertions: { sortOrder: 'desc' },
  },
  '3': {
    subject: { type: 'Foo', property: 'test' },
    where: [
      { subject: { type: 'Bar' }, assertions: {} },
      { subject: { type: 'Baz' }, assertions: {} },
    ],
    description: 'example warn text',
    severity: 'warn',
    assertions: { sortOrder: 'desc' },
  },
  '4': {
    subject: {
      type: 'any',
      property: 'description',
    },
    description: 'example warn text',
    severity: 'warn',
    assertions: { notPattern: '/example/' },
  },
};

describe('Oas3 assertions', () => {
  beforeAll(() => {
    colorOptions.enabled = false;
  });

  it('should return the right visitor structure', () => {
    const visitors = Assertions(opts as any);
    expect(visitors).toMatchInlineSnapshot(`
      [
        {
          "Operation": {
            "enter": [Function],
          },
        },
        {
          "Operation": {
            "PathItem": {
              "enter": [Function],
            },
            "skip": [Function],
          },
        },
        {
          "Operation": {
            "PathItem": {
              "enter": [Function],
            },
            "skip": [Function],
          },
        },
        {
          "Bar": {
            "Baz": {
              "Foo": {
                "enter": [Function],
              },
            },
          },
        },
        {
          "any": {
            "enter": [Function],
          },
        },
      ]
    `);
  });

  it('should throw a named error when the assertions block is missing', () => {
    const rule = {
      'rule/no-assertions': {
        assertionId: 'rule/no-assertions',
        subject: { type: 'Operation', property: 'summary' },
      },
    };

    expect(() => Assertions(rule as any)).toThrow(
      "rule/no-assertions: 'assertions' (Object) is required"
    );
  });

  it('should throw a named error when the assertions block is missing in a where clause', () => {
    const rule = {
      'rule/no-assertions-in-where': {
        assertionId: 'rule/no-assertions-in-where',
        subject: { type: 'Operation', property: 'summary' },
        assertions: { pattern: '/example/' },
        where: [{ subject: { type: 'PathItem' } }],
      },
    };

    expect(() => Assertions(rule as any)).toThrow(
      "rule/no-assertions-in-where -> where -> [0]: 'assertions' (Object) is required"
    );
  });

  it('should report every violation of the schema assertion', async () => {
    const document = parseYamlToDocument(
      outdent`
        openapi: 3.0.0
        info:
          title: Test
          version: '1.0'
          x-audit:
            status: rejected
            reviewedOn: yesterday
        paths: {}
      `,
      'foobar.yaml'
    );

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await createConfig({
        rules: {
          'rule/audit': {
            subject: { type: 'any', property: 'x-audit' },
            assertions: {
              schema: {
                type: 'object',
                properties: {
                  status: { type: 'string', enum: ['draft', 'approved'] },
                  reviewedBy: { type: 'string' },
                  reviewedOn: { type: 'string', format: 'date' },
                },
                required: ['status', 'reviewedBy'],
              },
            },
          },
        },
      }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`
      [
        {
          "forceSeverity": "error",
          "location": [
            {
              "pointer": "#/info/x-audit",
              "reportOnKey": false,
              "source": "foobar.yaml",
            },
          ],
          "message": "rule/audit failed because the any x-audit didn't meet the assertions: must have required property 'reviewedBy'",
          "ruleId": "rule/audit",
          "severity": "error",
          "suggest": [],
        },
        {
          "forceSeverity": "error",
          "location": [
            {
              "pointer": "#/info/x-audit/status",
              "reportOnKey": false,
              "source": "foobar.yaml",
            },
          ],
          "message": "rule/audit failed because the any x-audit didn't meet the assertions: \`status\` property must be equal to one of the allowed values "draft", "approved"",
          "ruleId": "rule/audit",
          "severity": "error",
          "suggest": [],
        },
        {
          "forceSeverity": "error",
          "location": [
            {
              "pointer": "#/info/x-audit/reviewedOn",
              "reportOnKey": false,
              "source": "foobar.yaml",
            },
          ],
          "message": "rule/audit failed because the any x-audit didn't meet the assertions: \`reviewedOn\` property must match format "date"",
          "ruleId": "rule/audit",
          "severity": "error",
          "suggest": [],
        },
      ]
    `);
  });
});
