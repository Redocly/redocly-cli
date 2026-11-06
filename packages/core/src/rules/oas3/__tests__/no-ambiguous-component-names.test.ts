import { outdent } from 'outdent';

import { parseYamlToDocument, replaceSourceWithRef } from '../../../../__tests__/utils.js';
import { createConfig } from '../../../config/index.js';
import { lintDocument } from '../../../lint.js';
import { BaseResolver } from '../../../resolve.js';

describe('Oas3 no-ambiguous-component-names', () => {
  it('should report component names that differ only in case or separators', async () => {
    const document = parseYamlToDocument(
      outdent`
        openapi: 3.1.0
        info:
          title: Redocly Cafe
          version: 1.0.0
        paths: {}
        components:
          schemas:
            MenuItem:
              type: object
            menu-item:
              type: object
            menu_item:
              type: object
            MENU.ITEM:
              type: object
            Order:
              type: object
          parameters:
            OrderId:
              name: orderId
              in: path
              required: true
              schema:
                type: string
            order_id:
              name: order_id
              in: query
              schema:
                type: string
      `,
      'foobar.yaml'
    );

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await createConfig({ rules: { 'no-ambiguous-component-names': 'error' } }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`
      [
        {
          "location": [
            {
              "pointer": "#/components/schemas/menu-item",
              "reportOnKey": true,
              "source": "foobar.yaml",
            },
          ],
          "message": "Component name "menu-item" in "schemas" is ambiguous with "MenuItem". The names differ only in letter case or in the "-", "_", and "." characters.",
          "reference": "https://redocly.com/docs/cli/rules/oas/no-ambiguous-component-names",
          "ruleId": "no-ambiguous-component-names",
          "severity": "error",
          "suggest": [],
        },
        {
          "location": [
            {
              "pointer": "#/components/schemas/menu_item",
              "reportOnKey": true,
              "source": "foobar.yaml",
            },
          ],
          "message": "Component name "menu_item" in "schemas" is ambiguous with "MenuItem". The names differ only in letter case or in the "-", "_", and "." characters.",
          "reference": "https://redocly.com/docs/cli/rules/oas/no-ambiguous-component-names",
          "ruleId": "no-ambiguous-component-names",
          "severity": "error",
          "suggest": [],
        },
        {
          "location": [
            {
              "pointer": "#/components/schemas/MENU.ITEM",
              "reportOnKey": true,
              "source": "foobar.yaml",
            },
          ],
          "message": "Component name "MENU.ITEM" in "schemas" is ambiguous with "MenuItem". The names differ only in letter case or in the "-", "_", and "." characters.",
          "reference": "https://redocly.com/docs/cli/rules/oas/no-ambiguous-component-names",
          "ruleId": "no-ambiguous-component-names",
          "severity": "error",
          "suggest": [],
        },
        {
          "location": [
            {
              "pointer": "#/components/parameters/order_id",
              "reportOnKey": true,
              "source": "foobar.yaml",
            },
          ],
          "message": "Component name "order_id" in "parameters" is ambiguous with "OrderId". The names differ only in letter case or in the "-", "_", and "." characters.",
          "reference": "https://redocly.com/docs/cli/rules/oas/no-ambiguous-component-names",
          "ruleId": "no-ambiguous-component-names",
          "severity": "error",
          "suggest": [],
        },
      ]
    `);
  });

  it('should not report the same name in different component sections', async () => {
    const document = parseYamlToDocument(
      outdent`
        openapi: 3.1.0
        info:
          title: Redocly Cafe
          version: 1.0.0
        paths: {}
        components:
          schemas:
            OrderId:
              type: string
          parameters:
            order-id:
              name: orderId
              in: path
              required: true
              schema:
                $ref: '#/components/schemas/OrderId'
      `,
      'foobar.yaml'
    );

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await createConfig({ rules: { 'no-ambiguous-component-names': 'error' } }),
    });

    expect(results).toEqual([]);
  });
});
