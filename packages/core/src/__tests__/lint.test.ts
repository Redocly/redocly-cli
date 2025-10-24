import * as path from 'node:path';
import { outdent } from 'outdent';
import { lintFromString, lintConfig, lintDocument, lint } from '../lint.js';
import { BaseResolver } from '../resolve.js';
import { createConfig, loadConfig } from '../config/load.js';
import { parseYamlToDocument, replaceSourceWithRef } from '../../__tests__/utils.js';
import { detectSpec } from '../detect-spec.js';
import {
  rootRedoclyConfigSchema,
  entityFileDefaultSchema,
  entityFileSchema,
} from '@redocly/config';
import { createConfigTypes } from '../types/redocly-yaml.js';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';
import { lintEntityFile } from '../lint.js';
import { makeDocumentFromString } from '../resolve.js';
import { type Config } from '../config/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const testPortalConfigContent = outdent`
    licenseKey: 123 # Must be a string

    apis:
      without-root:
        foo: Not expected!
        output: file.json
      with-wrong-root:
        root: 456 # Must be a string
      with-wrong-props:
        root: ./openapi.yaml
        openapi: wrong, must be an object
        not-expected: Must fail

    seo:
      keywords: 789 # Must be an array

    redirects:
      some-redirect:
        t1o: Wrong name, should be 'two'
        type: wrong type, must be a number

    rbac:
      'team-b.md':
        TeamB: read
      team-c.md:
        TeamC: read
      /blog/*:
        anonymous: none
        authenticated: read
      /blogpost/:
        TeamD: none
      '**/*.md':
        TeamA: none
        authenticated: none
        '*': read
      'blog/april-2022.md':
        TeamA: none
        TeamC: read
      test.md:
        TeamC: none
        TeamB: none
        authenticated: none
        '*': read
      test/**:
        TeamB: read
        TeamC: read
        authenticated: read
        anonymous: read
      additional-property:
        something: 123 # Must be a string
      content:
        '**':
          additionalProp: 456 # Must be a stirng
        foo:
          additionalProp2: 789 # Must be a stirng

    responseHeaders:
      some-header: wrong, must be an array
      some-header2:
        - wrong, must be an object
        - unexpected-property: Should fail
          # name: Must be reported as a missing required prop
          value: 123 # Must be a string

    ssoDirect:
      oidc:
        title: 456 # Must be a string
        type: OIDC
        configurationUrl: http://localhost/oidc/.well-known/openid-configuration
        clientId: '{{ process.env.public }}'
        clientSecret: '{{ process.env.secret }}'
        teamsClaimName: https://test.com
        scopes:
          - openid
        audience:
          - default
        authorizationRequestCustomParams:
          login_hint: 789 # Must be a string
          prompt: login
        configuration:
          token_endpoint: 123 # Must be a string
          # authorization_endpoint: Must be reported as a missing required prop
          additional-propery: Must be allowed
        defaultTeams:
          - 456 # Must be a string

      sso-config-schema-without-configurationUrl:
        type: OIDC
        # clientId: Must be reported as a missing required prop
        # configurationUrl: Must be reported as a missing required prop
        clientSecret: '{{ process.env.secret }}'

    sso:
      - WRONG # Does not match allowed options

    developerOnboarding:
      wrong: A not allowed field
      adapters:
        - should be object
        - type: 123 # Must be a string
        - type: APIGEE_X
          # organizationName: Must be reported as a missing required prop
          auth:
            type: OAUTH2
            # tokenEndpoint: Must be reported as a missing required prop
            clientId: 456 # Must be a string
            clientSecret: '{{ process.env.secret }}'
            not-expected: Must fail
        - type: APIGEE_X
          organizationName: Test
          auth:
            type: SERVICE_ACCOUNT
            # serviceAccountPrivateKey: Must be reported as a missing required prop
            serviceAccountEmail: 789 # Must be a string

    l10n:
      defaultLocale: en-US
      locales:
        - code: 123 # Must be a string
          name: English
        - code: es-ES
          name: Spanish

    metadata:
      test: anything

    not-listed-filed: Must be reported as not expected

    env:
      some-env:
        mockServer:
          off: must be boolean
          not-expected: Must fail
        apis:
          no-root:
            # root: Must be defined
            rules: {}
          wrong-root:
            root: 789 # Must be a string


    breadcrumbs:
      hide: false
      prefixItems:
        - label: Home
          page: '/'
    imports:
      - '@redocly/theme-experimental'

    logo:
      srcSet: './images/redocly-black-logo.svg light, ./images/redocly-brand-logo.svg dark'
      altText: Test
      link: /

    navbar:
      items:
        - label: Markdown
          page: /markdown/

    search:
      shortcuts:
        - ctrl+f
        - cmd+k
        - /
      suggestedPages:
        - label: TSX page
          page: tsx.page.tsx
        - page: /my-catalog/

    footer:
      copyrightText: Copyright © Test 2019-2020.
      items:
        - group: Legal
          items:
            - label: Terms of Use
              href: 'https://test.com/' # Not expected

    markdown:
      lastUpdatedBlock:
        format: 'long'
      editPage:
        baseUrl: https://test.com
    graphql:
      menu:
        requireExactGroups: false
        groups:
          - name: 'GraphQL custom group'
            directives:
              includeByName:
                - cacheControl
                - typeDirective
        otherItemsGroupName: 'Other'
    sidebar:
      separatorLine: true
      linePosition: top
    catalogClassic:
      main:
        title: API Catalog
        description: 'This is a description of the API Catalog'
        slug: /my-catalog/
        filters:
          - title: Domain
            property: domain
            missingCategoryName: Other
          - title: API Category
            property: category
            missingCategoryName: Other
        groupByFirstFilter: false
        items:
          - directory: ./
            flatten: true
            includeByMetadata:
              type: [openapi]
    scorecard:
      ignoreNonCompliant: true
      levels:
        - name: Baseline
          extends:
            - minimal
        - name: Silver
          extends:
            - recommended
          rules:
            info-contact: off

        - name: Gold
          rules:
            rule/path-item-get-required:
              severity: warn
              subject:
                type: PathItem
              message: Every path item must have a GET operation.
              assertions:
                required:
                  - get

            operation-4xx-response: warn
      targets:
        - where:
            metadata:
              l0: Distribution
              publishDateRange: 2021-01-01T00:00:00Z/2022-01-01
          minimumLevel: Silver

  `;

describe('lint', () => {
  it('lintFromString should work', async () => {
    const results = await lintFromString({
      absoluteRef: '/test/spec.yaml',
      source: outdent`
        openapi: 3.0.0
        info:
          title: Test API
          version: "1.0"
          description: Test
          license: Fail

        servers:
          - url: http://redocly-example.com
        paths: {}
      `,
      config: await loadConfig({ configPath: path.join(__dirname, 'fixtures/redocly.yaml') }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`
      [
        {
          "from": undefined,
          "location": [
            {
              "pointer": "#/info/license",
              "reportOnKey": false,
              "source": "/test/spec.yaml",
            },
          ],
          "message": "Expected type \`License\` (object) but got \`string\`",
          "ruleId": "struct",
          "severity": "error",
          "suggest": [],
        },
      ]
    `);
  });

  it('lintFromString should work with plugins', async () => {
    const source = outdent`
      openapi: 3.0.2
      info:
        title: Example Schema
        version: '1.0'
      paths:
        /user:
          get:
            # operationId: test
            # x-operation-extra: on
            responses:
              '200':
                description: OK
    `;
    const results = await lintFromString({
      absoluteRef: '/test/spec.yaml',
      source,
      config: await loadConfig({
        configPath: path.join(
          __dirname,
          'fixtures/lint-with-refs-and-plugins/config-with-plugin.yaml'
        ),
      }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`
      [
        {
          "location": [
            {
              "pointer": "#/paths/~1user/get/operationId",
              "reportOnKey": true,
              "source": "/test/spec.yaml",
            },
          ],
          "message": "Operation object should contain \`operationId\` field.",
          "ruleId": "operation-operationId",
          "severity": "warn",
          "suggest": [],
        },
        {
          "location": [
            {
              "pointer": "#/paths/~1user/get",
              "reportOnKey": false,
              "source": "/test/spec.yaml",
            },
          ],
          "message": "Operation must have \`x-operation-extra\` property",
          "ruleId": "custom/operation-extra",
          "severity": "error",
          "suggest": [],
        },
      ]
    `);

    const results_with_ref = await lintFromString({
      absoluteRef: '/test/spec.yaml',
      source,
      config: await loadConfig({
        configPath: path.join(
          __dirname,
          'fixtures/lint-with-refs-and-plugins/config-with-ref-to-plugin.yaml'
        ),
      }),
    });
    expect(replaceSourceWithRef(results_with_ref)).toEqual(replaceSourceWithRef(results));

    const results_with_createConfig = await lintFromString({
      absoluteRef: '/test/spec.yaml',
      source,
      config: await createConfig(
        outdent`
          plugins:
            - custom-plugin.js
          rules:
            operation-operationId: warn
            custom/operation-extra: error
        `,
        {
          configPath: path.join(
            __dirname,
            'fixtures/lint-with-refs-and-plugins/config-with-plugin.yaml'
          ),
        }
      ),
    });
    expect(replaceSourceWithRef(results_with_createConfig)).toEqual(replaceSourceWithRef(results));
  });

  it('lint should work', async () => {
    const results = await lint({
      ref: path.join(__dirname, 'fixtures/lint/openapi.yaml'),
      config: await loadConfig({
        configPath: path.join(__dirname, 'fixtures/redocly.yaml'),
      }),
    });

    expect(replaceSourceWithRef(results, path.join(__dirname, 'fixtures/lint/')))
      .toMatchInlineSnapshot(`
      [
        {
          "from": undefined,
          "location": [
            {
              "pointer": "#/info/license",
              "reportOnKey": false,
              "source": "openapi.yaml",
            },
          ],
          "message": "Expected type \`License\` (object) but got \`string\`",
          "ruleId": "struct",
          "severity": "error",
          "suggest": [],
        },
      ]
    `);
  });

  it('lintConfig should work', async () => {
    const testConfigContent = outdent`
        apis: error string
        plugins:
          - './local-plugin.js'
        extends:
          - recommended
          - local/all
        rules:
          operation-2xx-response: warn
          no-invalid-media-type-examples: error
          path-http-verbs-order: error
          boolean-parameter-prefixes: off
          rule/operation-summary-length:
            subject:
              type: Operation
              property: summary
            message: Operation summary should start with an active verb
            assertions:
              local/checkWordsCount:
                min: 3
        openapi:
          showConsole: true # Not expected anymore
          layout: wrong-option
      `;
    const cwd = path.join(__dirname, 'fixtures');
    const config = await createConfig(testConfigContent, {
      configPath: path.join(cwd, 'redocly.yaml'),
    });
    const results = await lintConfig({ config });

    expect(replaceSourceWithRef(results, cwd)).toMatchInlineSnapshot(`
      [
        {
          "from": undefined,
          "location": [
            {
              "pointer": "#/apis",
              "reportOnKey": false,
              "source": "redocly.yaml",
            },
          ],
          "message": "Expected type \`ConfigApis\` (object) but got \`string\`",
          "ruleId": "configuration struct",
          "severity": "error",
          "suggest": [],
        },
        {
          "from": undefined,
          "location": [
            {
              "pointer": "#/openapi/layout",
              "reportOnKey": false,
              "source": "redocly.yaml",
            },
          ],
          "message": "\`layout\` can be one of the following only: "stacked", "three-panel".",
          "ruleId": "configuration struct",
          "severity": "error",
          "suggest": [],
        },
      ]
    `);
  });

  it('lintConfig should detect wrong fields and suggest correct ones', async () => {
    const testConfigContent = outdent`
        api:
          name@version:
            root: ./file.yaml
        rules:
          operation-2xx-response: warn
      `;
    const config = await createConfig(testConfigContent);
    const results = await lintConfig({ config });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`
      [
        {
          "from": undefined,
          "location": [
            {
              "pointer": "#/api",
              "reportOnKey": true,
              "source": "",
            },
          ],
          "message": "Property \`api\` is not expected here.",
          "ruleId": "configuration struct",
          "severity": "error",
          "suggest": [
            "apis",
            "seo",
            "sso",
            "mcp",
            "env",
          ],
        },
      ]
    `);
  });

  it("'plugins' shouldn't be allowed in 'apis'", async () => {
    const testConfigContent = outdent`
        apis:
          main:
            root: ./main.yaml
            plugins:
            - './local-plugin.js'
        plugins:
        - './local-plugin.js'
      `;
    const cwd = path.join(__dirname, 'fixtures');
    const config = await createConfig(testConfigContent, {
      configPath: path.join(cwd, 'redocly.yaml'),
    });
    const results = await lintConfig({ config });

    expect(replaceSourceWithRef(results, cwd)).toMatchInlineSnapshot(`
      [
        {
          "from": undefined,
          "location": [
            {
              "pointer": "#/apis/main/plugins",
              "reportOnKey": true,
              "source": "redocly.yaml",
            },
          ],
          "message": "Property \`plugins\` is not expected here.",
          "ruleId": "configuration struct",
          "severity": "error",
          "suggest": [],
        },
      ]
    `);
  });

  it('lintConfig should detect wrong fields in the default configuration after merging with the portal config schema', async () => {
    const config = await createConfig(testPortalConfigContent);
    const results = await lintConfig({ config });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`
      [
        {
          "from": undefined,
          "location": [
            {
              "pointer": "#/licenseKey",
              "reportOnKey": false,
              "source": "",
            },
          ],
          "message": "Expected type \`string\` but got \`integer\`.",
          "ruleId": "configuration struct",
          "severity": "error",
          "suggest": [],
        },
        {
          "from": undefined,
          "location": [
            {
              "pointer": "#/sso/0",
              "reportOnKey": false,
              "source": "",
            },
          ],
          "message": "\`sso\` can be one of the following only: "REDOCLY", "CORPORATE", "GUEST".",
          "ruleId": "configuration struct",
          "severity": "error",
          "suggest": [],
        },
        {
          "from": undefined,
          "location": [
            {
              "pointer": "#/not-listed-filed",
              "reportOnKey": true,
              "source": "",
            },
          ],
          "message": "Property \`not-listed-filed\` is not expected here.",
          "ruleId": "configuration struct",
          "severity": "error",
          "suggest": [],
        },
        {
          "from": undefined,
          "location": [
            {
              "pointer": "#/redirects/some-redirect/t1o",
              "reportOnKey": true,
              "source": "",
            },
          ],
          "message": "Property \`t1o\` is not expected here.",
          "ruleId": "configuration struct",
          "severity": "error",
          "suggest": [
            "to",
            "type",
          ],
        },
        {
          "from": undefined,
          "location": [
            {
              "pointer": "#/redirects/some-redirect/type",
              "reportOnKey": false,
              "source": "",
            },
          ],
          "message": "Expected type \`number\` but got \`string\`.",
          "ruleId": "configuration struct",
          "severity": "error",
          "suggest": [],
        },
        {
          "from": undefined,
          "location": [
            {
              "pointer": "#/seo/keywords",
              "reportOnKey": false,
              "source": "",
            },
          ],
          "message": "Expected type \`array\` but got \`integer\`.",
          "ruleId": "configuration struct",
          "severity": "error",
          "suggest": [],
        },
        {
          "from": undefined,
          "location": [
            {
              "pointer": "#/rbac/content/**/additionalProp",
              "reportOnKey": false,
              "source": "",
            },
          ],
          "message": "Expected type \`string\` but got \`integer\`.",
          "ruleId": "configuration struct",
          "severity": "error",
          "suggest": [],
        },
        {
          "from": undefined,
          "location": [
            {
              "pointer": "#/rbac/content/foo/additionalProp2",
              "reportOnKey": false,
              "source": "",
            },
          ],
          "message": "Expected type \`string\` but got \`integer\`.",
          "ruleId": "configuration struct",
          "severity": "error",
          "suggest": [],
        },
        {
          "from": undefined,
          "location": [
            {
              "pointer": "#/rbac/additional-property/something",
              "reportOnKey": false,
              "source": "",
            },
          ],
          "message": "Expected type \`string\` but got \`integer\`.",
          "ruleId": "configuration struct",
          "severity": "error",
          "suggest": [],
        },
        {
          "from": undefined,
          "location": [
            {
              "pointer": "#/responseHeaders/some-header",
              "reportOnKey": false,
              "source": "",
            },
          ],
          "message": "Expected type \`rootRedoclyConfigSchema.responseHeaders_additionalProperties\` (array) but got \`string\`",
          "ruleId": "configuration struct",
          "severity": "error",
          "suggest": [],
        },
        {
          "from": undefined,
          "location": [
            {
              "pointer": "#/responseHeaders/some-header2/0",
              "reportOnKey": false,
              "source": "",
            },
          ],
          "message": "Expected type \`rootRedoclyConfigSchema.responseHeaders_additionalProperties_items\` (object) but got \`string\`",
          "ruleId": "configuration struct",
          "severity": "error",
          "suggest": [],
        },
        {
          "from": undefined,
          "location": [
            {
              "pointer": "#/responseHeaders/some-header2/1",
              "reportOnKey": true,
              "source": "",
            },
          ],
          "message": "The field \`name\` must be present on this level.",
          "ruleId": "configuration struct",
          "severity": "error",
          "suggest": [],
        },
        {
          "from": undefined,
          "location": [
            {
              "pointer": "#/responseHeaders/some-header2/1/unexpected-property",
              "reportOnKey": true,
              "source": "",
            },
          ],
          "message": "Property \`unexpected-property\` is not expected here.",
          "ruleId": "configuration struct",
          "severity": "error",
          "suggest": [],
        },
        {
          "from": undefined,
          "location": [
            {
              "pointer": "#/responseHeaders/some-header2/1/value",
              "reportOnKey": false,
              "source": "",
            },
          ],
          "message": "Expected type \`string\` but got \`integer\`.",
          "ruleId": "configuration struct",
          "severity": "error",
          "suggest": [],
        },
        {
          "from": undefined,
          "location": [
            {
              "pointer": "#/apis/without-root",
              "reportOnKey": true,
              "source": "",
            },
          ],
          "message": "The field \`root\` must be present on this level.",
          "ruleId": "configuration struct",
          "severity": "error",
          "suggest": [],
        },
        {
          "from": undefined,
          "location": [
            {
              "pointer": "#/apis/without-root/foo",
              "reportOnKey": true,
              "source": "",
            },
          ],
          "message": "Property \`foo\` is not expected here.",
          "ruleId": "configuration struct",
          "severity": "error",
          "suggest": [
            "root",
          ],
        },
        {
          "from": undefined,
          "location": [
            {
              "pointer": "#/apis/with-wrong-root/root",
              "reportOnKey": false,
              "source": "",
            },
          ],
          "message": "Expected type \`string\` but got \`integer\`.",
          "ruleId": "configuration struct",
          "severity": "error",
          "suggest": [],
        },
        {
          "from": undefined,
          "location": [
            {
              "pointer": "#/apis/with-wrong-props/not-expected",
              "reportOnKey": true,
              "source": "",
            },
          ],
          "message": "Property \`not-expected\` is not expected here.",
          "ruleId": "configuration struct",
          "severity": "error",
          "suggest": [],
        },
        {
          "from": undefined,
          "location": [
            {
              "pointer": "#/apis/with-wrong-props/openapi",
              "reportOnKey": false,
              "source": "",
            },
          ],
          "message": "Expected type \`rootRedoclyConfigSchema.apis_additionalProperties.openapi\` (object) but got \`string\`",
          "ruleId": "configuration struct",
          "severity": "error",
          "suggest": [],
        },
        {
          "from": undefined,
          "location": [
            {
              "pointer": "#/ssoDirect/oidc/title",
              "reportOnKey": false,
              "source": "",
            },
          ],
          "message": "Expected type \`string\` but got \`integer\`.",
          "ruleId": "configuration struct",
          "severity": "error",
          "suggest": [],
        },
        {
          "from": undefined,
          "location": [
            {
              "pointer": "#/ssoDirect/oidc/defaultTeams/0",
              "reportOnKey": false,
              "source": "",
            },
          ],
          "message": "Expected type \`string\` but got \`integer\`.",
          "ruleId": "configuration struct",
          "severity": "error",
          "suggest": [],
        },
        {
          "from": undefined,
          "location": [
            {
              "pointer": "#/ssoDirect/oidc/configuration",
              "reportOnKey": true,
              "source": "",
            },
          ],
          "message": "The field \`authorization_endpoint\` must be present on this level.",
          "ruleId": "configuration struct",
          "severity": "error",
          "suggest": [],
        },
        {
          "from": undefined,
          "location": [
            {
              "pointer": "#/ssoDirect/oidc/configuration/token_endpoint",
              "reportOnKey": false,
              "source": "",
            },
          ],
          "message": "Expected type \`string\` but got \`integer\`.",
          "ruleId": "configuration struct",
          "severity": "error",
          "suggest": [],
        },
        {
          "from": undefined,
          "location": [
            {
              "pointer": "#/ssoDirect/oidc/authorizationRequestCustomParams/login_hint",
              "reportOnKey": false,
              "source": "",
            },
          ],
          "message": "Expected type \`string\` but got \`integer\`.",
          "ruleId": "configuration struct",
          "severity": "error",
          "suggest": [],
        },
        {
          "from": undefined,
          "location": [
            {
              "pointer": "#/ssoDirect/sso-config-schema-without-configurationUrl",
              "reportOnKey": true,
              "source": "",
            },
          ],
          "message": "The field \`clientId\` must be present on this level.",
          "ruleId": "configuration struct",
          "severity": "error",
          "suggest": [],
        },
        {
          "from": undefined,
          "location": [
            {
              "pointer": "#/ssoDirect/sso-config-schema-without-configurationUrl",
              "reportOnKey": true,
              "source": "",
            },
          ],
          "message": "The field \`configurationUrl\` must be present on this level.",
          "ruleId": "configuration struct",
          "severity": "error",
          "suggest": [],
        },
        {
          "from": undefined,
          "location": [
            {
              "pointer": "#/developerOnboarding/wrong",
              "reportOnKey": true,
              "source": "",
            },
          ],
          "message": "Property \`wrong\` is not expected here.",
          "ruleId": "configuration struct",
          "severity": "error",
          "suggest": [],
        },
        {
          "from": undefined,
          "location": [
            {
              "pointer": "#/developerOnboarding/adapters/0",
              "reportOnKey": false,
              "source": "",
            },
          ],
          "message": "Expected type \`APIGEE_X\` (object) but got \`string\`",
          "ruleId": "configuration struct",
          "severity": "error",
          "suggest": [],
        },
        {
          "from": undefined,
          "location": [
            {
              "pointer": "#/developerOnboarding/adapters/1",
              "reportOnKey": true,
              "source": "",
            },
          ],
          "message": "The field \`organizationName\` must be present on this level.",
          "ruleId": "configuration struct",
          "severity": "error",
          "suggest": [],
        },
        {
          "from": undefined,
          "location": [
            {
              "pointer": "#/developerOnboarding/adapters/1",
              "reportOnKey": true,
              "source": "",
            },
          ],
          "message": "The field \`auth\` must be present on this level.",
          "ruleId": "configuration struct",
          "severity": "error",
          "suggest": [],
        },
        {
          "from": undefined,
          "location": [
            {
              "pointer": "#/developerOnboarding/adapters/1/type",
              "reportOnKey": false,
              "source": "",
            },
          ],
          "message": "Expected type \`string\` but got \`integer\`.",
          "ruleId": "configuration struct",
          "severity": "error",
          "suggest": [],
        },
        {
          "from": undefined,
          "location": [
            {
              "pointer": "#/developerOnboarding/adapters/2",
              "reportOnKey": true,
              "source": "",
            },
          ],
          "message": "The field \`organizationName\` must be present on this level.",
          "ruleId": "configuration struct",
          "severity": "error",
          "suggest": [],
        },
        {
          "from": undefined,
          "location": [
            {
              "pointer": "#/developerOnboarding/adapters/2/auth",
              "reportOnKey": true,
              "source": "",
            },
          ],
          "message": "The field \`tokenEndpoint\` must be present on this level.",
          "ruleId": "configuration struct",
          "severity": "error",
          "suggest": [],
        },
        {
          "from": undefined,
          "location": [
            {
              "pointer": "#/developerOnboarding/adapters/2/auth/clientId",
              "reportOnKey": false,
              "source": "",
            },
          ],
          "message": "Expected type \`string\` but got \`integer\`.",
          "ruleId": "configuration struct",
          "severity": "error",
          "suggest": [],
        },
        {
          "from": undefined,
          "location": [
            {
              "pointer": "#/developerOnboarding/adapters/2/auth/not-expected",
              "reportOnKey": true,
              "source": "",
            },
          ],
          "message": "Property \`not-expected\` is not expected here.",
          "ruleId": "configuration struct",
          "severity": "error",
          "suggest": [],
        },
        {
          "from": undefined,
          "location": [
            {
              "pointer": "#/developerOnboarding/adapters/3/auth",
              "reportOnKey": true,
              "source": "",
            },
          ],
          "message": "The field \`serviceAccountPrivateKey\` must be present on this level.",
          "ruleId": "configuration struct",
          "severity": "error",
          "suggest": [],
        },
        {
          "from": undefined,
          "location": [
            {
              "pointer": "#/developerOnboarding/adapters/3/auth/serviceAccountEmail",
              "reportOnKey": false,
              "source": "",
            },
          ],
          "message": "Expected type \`string\` but got \`integer\`.",
          "ruleId": "configuration struct",
          "severity": "error",
          "suggest": [],
        },
        {
          "from": undefined,
          "location": [
            {
              "pointer": "#/l10n/locales/0/code",
              "reportOnKey": false,
              "source": "",
            },
          ],
          "message": "Expected type \`string\` but got \`integer\`.",
          "ruleId": "configuration struct",
          "severity": "error",
          "suggest": [],
        },
        {
          "from": undefined,
          "location": [
            {
              "pointer": "#/env/some-env/mockServer/off",
              "reportOnKey": false,
              "source": "",
            },
          ],
          "message": "Expected type \`boolean\` but got \`string\`.",
          "ruleId": "configuration struct",
          "severity": "error",
          "suggest": [],
        },
        {
          "from": undefined,
          "location": [
            {
              "pointer": "#/env/some-env/mockServer/not-expected",
              "reportOnKey": true,
              "source": "",
            },
          ],
          "message": "Property \`not-expected\` is not expected here.",
          "ruleId": "configuration struct",
          "severity": "error",
          "suggest": [],
        },
        {
          "from": undefined,
          "location": [
            {
              "pointer": "#/env/some-env/apis/no-root",
              "reportOnKey": true,
              "source": "",
            },
          ],
          "message": "The field \`root\` must be present on this level.",
          "ruleId": "configuration struct",
          "severity": "error",
          "suggest": [],
        },
        {
          "from": undefined,
          "location": [
            {
              "pointer": "#/env/some-env/apis/wrong-root/root",
              "reportOnKey": false,
              "source": "",
            },
          ],
          "message": "Expected type \`string\` but got \`integer\`.",
          "ruleId": "configuration struct",
          "severity": "error",
          "suggest": [],
        },
      ]
    `);
  });

  it('lintConfig should alternate its behavior when supplied externalConfigTypes', async () => {
    const config = await createConfig(testPortalConfigContent);
    const results = await lintConfig({
      externalConfigTypes: createConfigTypes(
        {
          type: 'object',
          properties: {
            catalogClassic: rootRedoclyConfigSchema.properties.catalogClassic,
            scorecard: rootRedoclyConfigSchema.properties.scorecard,
          },
          additionalProperties: false,
        },
        config
      ),
      config,
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`
      [
        {
          "from": undefined,
          "location": [
            {
              "pointer": "#/licenseKey",
              "reportOnKey": true,
              "source": "",
            },
          ],
          "message": "Property \`licenseKey\` is not expected here.",
          "ruleId": "configuration struct",
          "severity": "error",
          "suggest": [],
        },
        {
          "from": undefined,
          "location": [
            {
              "pointer": "#/seo",
              "reportOnKey": true,
              "source": "",
            },
          ],
          "message": "Property \`seo\` is not expected here.",
          "ruleId": "configuration struct",
          "severity": "error",
          "suggest": [],
        },
        {
          "from": undefined,
          "location": [
            {
              "pointer": "#/redirects",
              "reportOnKey": true,
              "source": "",
            },
          ],
          "message": "Property \`redirects\` is not expected here.",
          "ruleId": "configuration struct",
          "severity": "error",
          "suggest": [],
        },
        {
          "from": undefined,
          "location": [
            {
              "pointer": "#/rbac",
              "reportOnKey": true,
              "source": "",
            },
          ],
          "message": "Property \`rbac\` is not expected here.",
          "ruleId": "configuration struct",
          "severity": "error",
          "suggest": [],
        },
        {
          "from": undefined,
          "location": [
            {
              "pointer": "#/responseHeaders",
              "reportOnKey": true,
              "source": "",
            },
          ],
          "message": "Property \`responseHeaders\` is not expected here.",
          "ruleId": "configuration struct",
          "severity": "error",
          "suggest": [],
        },
        {
          "from": undefined,
          "location": [
            {
              "pointer": "#/ssoDirect",
              "reportOnKey": true,
              "source": "",
            },
          ],
          "message": "Property \`ssoDirect\` is not expected here.",
          "ruleId": "configuration struct",
          "severity": "error",
          "suggest": [],
        },
        {
          "from": undefined,
          "location": [
            {
              "pointer": "#/sso",
              "reportOnKey": true,
              "source": "",
            },
          ],
          "message": "Property \`sso\` is not expected here.",
          "ruleId": "configuration struct",
          "severity": "error",
          "suggest": [],
        },
        {
          "from": undefined,
          "location": [
            {
              "pointer": "#/developerOnboarding",
              "reportOnKey": true,
              "source": "",
            },
          ],
          "message": "Property \`developerOnboarding\` is not expected here.",
          "ruleId": "configuration struct",
          "severity": "error",
          "suggest": [],
        },
        {
          "from": undefined,
          "location": [
            {
              "pointer": "#/l10n",
              "reportOnKey": true,
              "source": "",
            },
          ],
          "message": "Property \`l10n\` is not expected here.",
          "ruleId": "configuration struct",
          "severity": "error",
          "suggest": [],
        },
        {
          "from": undefined,
          "location": [
            {
              "pointer": "#/metadata",
              "reportOnKey": true,
              "source": "",
            },
          ],
          "message": "Property \`metadata\` is not expected here.",
          "ruleId": "configuration struct",
          "severity": "error",
          "suggest": [],
        },
        {
          "from": undefined,
          "location": [
            {
              "pointer": "#/not-listed-filed",
              "reportOnKey": true,
              "source": "",
            },
          ],
          "message": "Property \`not-listed-filed\` is not expected here.",
          "ruleId": "configuration struct",
          "severity": "error",
          "suggest": [],
        },
        {
          "from": undefined,
          "location": [
            {
              "pointer": "#/env",
              "reportOnKey": true,
              "source": "",
            },
          ],
          "message": "Property \`env\` is not expected here.",
          "ruleId": "configuration struct",
          "severity": "error",
          "suggest": [],
        },
        {
          "from": undefined,
          "location": [
            {
              "pointer": "#/breadcrumbs",
              "reportOnKey": true,
              "source": "",
            },
          ],
          "message": "Property \`breadcrumbs\` is not expected here.",
          "ruleId": "configuration struct",
          "severity": "error",
          "suggest": [],
        },
        {
          "from": undefined,
          "location": [
            {
              "pointer": "#/imports",
              "reportOnKey": true,
              "source": "",
            },
          ],
          "message": "Property \`imports\` is not expected here.",
          "ruleId": "configuration struct",
          "severity": "error",
          "suggest": [],
        },
        {
          "from": undefined,
          "location": [
            {
              "pointer": "#/logo",
              "reportOnKey": true,
              "source": "",
            },
          ],
          "message": "Property \`logo\` is not expected here.",
          "ruleId": "configuration struct",
          "severity": "error",
          "suggest": [],
        },
        {
          "from": undefined,
          "location": [
            {
              "pointer": "#/navbar",
              "reportOnKey": true,
              "source": "",
            },
          ],
          "message": "Property \`navbar\` is not expected here.",
          "ruleId": "configuration struct",
          "severity": "error",
          "suggest": [],
        },
        {
          "from": undefined,
          "location": [
            {
              "pointer": "#/search",
              "reportOnKey": true,
              "source": "",
            },
          ],
          "message": "Property \`search\` is not expected here.",
          "ruleId": "configuration struct",
          "severity": "error",
          "suggest": [],
        },
        {
          "from": undefined,
          "location": [
            {
              "pointer": "#/footer",
              "reportOnKey": true,
              "source": "",
            },
          ],
          "message": "Property \`footer\` is not expected here.",
          "ruleId": "configuration struct",
          "severity": "error",
          "suggest": [],
        },
        {
          "from": undefined,
          "location": [
            {
              "pointer": "#/markdown",
              "reportOnKey": true,
              "source": "",
            },
          ],
          "message": "Property \`markdown\` is not expected here.",
          "ruleId": "configuration struct",
          "severity": "error",
          "suggest": [],
        },
        {
          "from": undefined,
          "location": [
            {
              "pointer": "#/graphql",
              "reportOnKey": true,
              "source": "",
            },
          ],
          "message": "Property \`graphql\` is not expected here.",
          "ruleId": "configuration struct",
          "severity": "error",
          "suggest": [],
        },
        {
          "from": undefined,
          "location": [
            {
              "pointer": "#/sidebar",
              "reportOnKey": true,
              "source": "",
            },
          ],
          "message": "Property \`sidebar\` is not expected here.",
          "ruleId": "configuration struct",
          "severity": "error",
          "suggest": [],
        },
        {
          "from": undefined,
          "location": [
            {
              "pointer": "#/apis/without-root/foo",
              "reportOnKey": true,
              "source": "",
            },
          ],
          "message": "Property \`foo\` is not expected here.",
          "ruleId": "configuration struct",
          "severity": "error",
          "suggest": [],
        },
        {
          "from": undefined,
          "location": [
            {
              "pointer": "#/apis/without-root/output",
              "reportOnKey": true,
              "source": "",
            },
          ],
          "message": "Property \`output\` is not expected here.",
          "ruleId": "configuration struct",
          "severity": "error",
          "suggest": [],
        },
        {
          "from": undefined,
          "location": [
            {
              "pointer": "#/apis/with-wrong-root/root",
              "reportOnKey": true,
              "source": "",
            },
          ],
          "message": "Property \`root\` is not expected here.",
          "ruleId": "configuration struct",
          "severity": "error",
          "suggest": [],
        },
        {
          "from": undefined,
          "location": [
            {
              "pointer": "#/apis/with-wrong-props/root",
              "reportOnKey": true,
              "source": "",
            },
          ],
          "message": "Property \`root\` is not expected here.",
          "ruleId": "configuration struct",
          "severity": "error",
          "suggest": [],
        },
        {
          "from": undefined,
          "location": [
            {
              "pointer": "#/apis/with-wrong-props/openapi",
              "reportOnKey": true,
              "source": "",
            },
          ],
          "message": "Property \`openapi\` is not expected here.",
          "ruleId": "configuration struct",
          "severity": "error",
          "suggest": [],
        },
        {
          "from": undefined,
          "location": [
            {
              "pointer": "#/apis/with-wrong-props/not-expected",
              "reportOnKey": true,
              "source": "",
            },
          ],
          "message": "Property \`not-expected\` is not expected here.",
          "ruleId": "configuration struct",
          "severity": "error",
          "suggest": [],
        },
      ]
    `);
  });

  it("'const' can have any type", async () => {
    const document = parseYamlToDocument(
      outdent`
        openapi: "3.1.0"
        info:
          version: 1.0.0
          title: Swagger Petstore
          description: Information about Petstore
          license:
            name: MIT
            url: https://opensource.org/licenses/MIT
        servers:
          - url: http://petstore.swagger.io/v1
        paths:
          /pets:
            get:
              summary: List all pets
              operationId: listPets
              tags:
                - pets
              responses:
                200:
                  description: An paged array of pets
                  content:
                    application/json:
                      schema:
                        type: string
                        const: ABC
        `,
      'foobar.yaml'
    );

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await createConfig({ rules: { struct: 'error' } }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`[]`);
  });

  it('detect OpenAPI should throw an error when version is not string', () => {
    const testDocument = parseYamlToDocument(
      outdent`
        openapi: 3.0
      `,
      ''
    );
    expect(() => detectSpec(testDocument.parsed)).toThrow(
      `Invalid OpenAPI version: should be a string but got "number"`
    );
  });

  it('detect unsupported OpenAPI version', () => {
    const testDocument = parseYamlToDocument(
      outdent`
        openapi: 1.0.4
      `,
      ''
    );
    expect(() => detectSpec(testDocument.parsed)).toThrow(`Unsupported OpenAPI version: 1.0.4`);
  });

  it('detect unsupported AsyncAPI version', () => {
    const testDocument = parseYamlToDocument(
      outdent`
        asyncapi: 1.0.4
      `,
      ''
    );
    expect(() => detectSpec(testDocument.parsed)).toThrow(`Unsupported AsyncAPI version: 1.0.4`);
  });

  it('detect unsupported spec format', () => {
    const testDocument = parseYamlToDocument(
      outdent`
        notapi: 3.1.0
      `,
      ''
    );
    expect(() => detectSpec(testDocument.parsed)).toThrow(`Unsupported specification`);
  });

  it("struct rule shouldn't throw an error for named callback", async () => {
    const document = parseYamlToDocument(
      outdent`
        openapi: 3.1.0
        info:
          title: Callback test
          version: 'alpha'
        components:
          callbacks:
            resultCallback:
              '{$url}':
                post:
                  requestBody:
                    description: Callback payload
                    content:
                      'application/json':
                        schema:
                          type: object
                          properties:
                            test:
                              type: string
                  responses:
                    '200':
                      description: callback successfully processed
      `,
      'foobar.yaml'
    );

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await createConfig({ rules: { struct: 'error' } }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`[]`);
  });

  it('should ignore error because ignore file passed', async () => {
    const absoluteRef = path.join(__dirname, 'fixtures/openapi.yaml');
    const document = parseYamlToDocument(
      outdent`
        openapi: 3.0.0
        info:
          version: 1.0.0
          title: Example OpenAPI 3 definition.
          description: Information about API
          license:
            name: MIT
            url: 'https://opensource.org/licenses/MIT'
        servers:
          - url: 'https://redocly.com/v1'
        paths:
          '/pets/{petId}':
            post:
              responses:
                '201':
                  summary: Exist
                  description: example description
      `,
      absoluteRef
    );

    const configFilePath = path.join(__dirname, 'fixtures');

    const result = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await createConfig(
        {
          rules: { 'operation-operationId': 'error' },
        },
        { configPath: configFilePath }
      ),
    });
    expect(result).toHaveLength(1);
    expect(result).toMatchObject([
      {
        ignored: true,
        location: [{ pointer: '#/paths/~1pets~1{petId}/post/operationId' }],
        message: 'Operation object should contain `operationId` field.',
        ruleId: 'operation-operationId',
        severity: 'error',
      },
    ]);
    expect(result[0]).toHaveProperty('ignored', true);
    expect(result[0]).toHaveProperty('ruleId', 'operation-operationId');
  });

  it('should throw an error for dependentRequired not expected here - OAS 3.0.x', async () => {
    const document = parseYamlToDocument(
      outdent`
        openapi: 3.0.3
        info:
          title: test json schema validation keyword - dependentRequired
          version: 1.0.0
        paths:
          '/thing':
            get:
              summary: a sample api
              responses:
                '200':
                  description: OK
                  content:
                    'application/json':
                      schema:
                        $ref: '#/components/schemas/test_schema'
                      examples:
                        dependentRequired_passing:
                          summary: an example schema
                          value: { "name": "bobby", "age": 25}
                        dependentRequired_failing:
                          summary: an example schema
                          value: { "name": "jennie"}
        components:
          schemas:
            test_schema:
              type: object
              properties:
                name:
                  type: string
                age:
                  type: number
              dependentRequired:
                name:
                - age
      `,
      ''
    );

    const configFilePath = path.join(__dirname, '..', '..', '..', 'redocly.yaml');

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await createConfig(
        {
          rules: { struct: 'error' },
        },
        { configPath: configFilePath }
      ),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`
      [
        {
          "from": {
            "pointer": "#/paths/~1thing/get/responses/200/content/application~1json/schema",
            "source": "",
          },
          "location": [
            {
              "pointer": "#/components/schemas/test_schema/dependentRequired",
              "reportOnKey": true,
              "source": "",
            },
          ],
          "message": "Property \`dependentRequired\` is not expected here.",
          "ruleId": "struct",
          "severity": "error",
          "suggest": [],
        },
      ]
    `);
  });

  it('should not throw an error for dependentRequired not expected here - OAS 3.1.x', async () => {
    const document = parseYamlToDocument(
      outdent`
        openapi: 3.1.0
        info:
          title: test json schema validation keyword - dependentRequired
          version: 1.0.0
        paths:
          '/thing':
            get:
              summary: a sample api
              responses:
                '200':
                  description: OK
                  content:
                    'application/json':
                      schema:
                        $ref: '#/components/schemas/test_schema'
                      examples:
                        dependentRequired_passing:
                          summary: an example schema
                          value: { "name": "bobby", "age": 25}
                        dependentRequired_failing:
                          summary: an example schema
                          value: { "name": "jennie"}
        components:
          schemas:
            test_schema:
              type: object
              properties:
                name:
                  type: string
                age:
                  type: number
              dependentRequired:
                name:
                - age
      `,
      ''
    );

    const configFilePath = path.join(__dirname, '..', '..', '..', 'redocly.yaml');

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await createConfig(
        {
          rules: { struct: 'error' },
        },
        { configPath: configFilePath }
      ),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`[]`);
  });

  it('should throw an error for $schema not expected here - OAS 3.0.x', async () => {
    const document = parseYamlToDocument(
      outdent`
        openapi: 3.0.4
        info:
          title: test json schema validation keyword $schema - should use an OAS Schema, not JSON Schema
          version: 1.0.0
        paths:
          '/thing':
            get:
              summary: a sample api
              responses:
                '200':
                  description: OK
                  content:
                    'application/json':
                      schema:
                        $schema: http://json-schema.org/draft-04/schema#
                        type: object
                        properties: {}
      `,
      ''
    );

    const configFilePath = path.join(__dirname, '..', '..', '..', 'redocly.yaml');

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await createConfig(
        {
          rules: { struct: 'error' },
        },
        { configPath: configFilePath }
      ),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`
      [
        {
          "from": undefined,
          "location": [
            {
              "pointer": "#/paths/~1thing/get/responses/200/content/application~1json/schema/$schema",
              "reportOnKey": true,
              "source": "",
            },
          ],
          "message": "Property \`$schema\` is not expected here.",
          "ruleId": "struct",
          "severity": "error",
          "suggest": [],
        },
      ]
    `);
  });

  it('should allow for $schema to be defined - OAS 3.1.x', async () => {
    const document = parseYamlToDocument(
      outdent`
        openapi: 3.1.1
        info:
          title: test json schema validation keyword $schema - should allow a JSON Schema
          version: 1.0.0
        paths:
          '/thing':
            get:
              summary: a sample api
              responses:
                '200':
                  description: OK
                  content:
                    'application/json':
                      schema:
                        $schema: http://json-schema.org/draft-04/schema#
                        type: object
                        properties: {}
      `,
      ''
    );

    const configFilePath = path.join(__dirname, '..', '..', '..', 'redocly.yaml');

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await createConfig(
        {
          rules: { struct: 'error' },
        },
        { configPath: configFilePath }
      ),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`[]`);
  });

  describe('lintEntityFile', () => {
    it('should lint a valid user entity file', async () => {
      const entityYaml = `
  type: user
  key: john-doe
  title: John Doe
  summary: Senior Software Engineer
  metadata:
    email: john@example.com
  tags:
    - engineering
  `;

      const document = makeDocumentFromString(entityYaml, '/entity.yaml');

      const problems = await lintEntityFile({
        config: { document } as Config,
        entitySchema: entityFileSchema,
        entityDefaultSchema: entityFileDefaultSchema,
      });

      expect(problems.length).toBe(0);
    });

    it('should detect missing required fields in entity', async () => {
      const entityYaml = `
  type: user
  key: john-doe
  # Missing required 'title' field
  metadata:
    email: john@example.com
  `;

      const document = makeDocumentFromString(entityYaml, '/entity.yaml');

      const problems = await lintEntityFile({
        config: { document } as Config,
        entitySchema: entityFileSchema,
        entityDefaultSchema: entityFileDefaultSchema,
      });

      expect(problems.length).toBeGreaterThan(0);
      expect(problems.some((p) => p.message.includes('title'))).toBe(true);
    });

    it('should lint array of entities', async () => {
      const entitiesYaml = `
  - type: user
    key: john-doe
    title: John Doe
    metadata:
      email: john@example.com
  
  - type: service
    key: api-service
    title: API Service
    summary: Core API service
  
  - type: api-description
    key: users-api
    title: Users API
    metadata:
      specType: openapi
      descriptionFile: users-api.yaml
  `;

      const document = makeDocumentFromString(entitiesYaml, '/entities.yaml');

      const problems = await lintEntityFile({
        config: { document } as Config,
        entitySchema: entityFileSchema,
        entityDefaultSchema: entityFileDefaultSchema,
      });

      expect(problems.length).toBe(0);
    });

    it('should use default schema when type is missing', async () => {
      const entityYaml = `
  key: unknown-entity
  title: Unknown Entity
  summary: An entity without a type field
  `;

      const document = makeDocumentFromString(entityYaml, '/entity.yaml');

      const problems = await lintEntityFile({
        config: { document } as Config,
        entitySchema: entityFileSchema,
        entityDefaultSchema: entityFileDefaultSchema,
      });

      expect(problems.length).toBeGreaterThan(0);
      expect(problems.some((p) => p.message.includes('type'))).toBe(true);
    });

    it('should detect missing metadata.email for user entity', async () => {
      const entityYaml = `
  type: user
  key: john-doe
  title: John Doe
  metadata:
    name: John
  `;

      const document = makeDocumentFromString(entityYaml, '/entity.yaml');

      const problems = await lintEntityFile({
        config: { document } as Config,
        entitySchema: entityFileSchema,
        entityDefaultSchema: entityFileDefaultSchema,
      });

      expect(problems.length).toBeGreaterThan(0);
      expect(problems.some((p) => p.message.includes('email'))).toBe(true);
    });

    it('should detect missing metadata for user entity', async () => {
      const entityYaml = `
  type: user
  key: john-doe
  title: John Doe
  `;

      const document = makeDocumentFromString(entityYaml, '/entity.yaml');

      const problems = await lintEntityFile({
        config: { document } as Config,
        entitySchema: entityFileSchema,
        entityDefaultSchema: entityFileDefaultSchema,
      });

      expect(problems.length).toBeGreaterThan(0);
      expect(problems.some((p) => p.message.includes('metadata'))).toBe(true);
    });

    it('should not validate patterns with Struct rule', async () => {
      const entityYaml = `
  type: service
  key: Invalid_Key_With_Underscores
  title: Invalid Service
  `;

      const document = makeDocumentFromString(entityYaml, '/entity.yaml');

      const problems = await lintEntityFile({
        config: { document } as Config,
        entitySchema: entityFileSchema,
        entityDefaultSchema: entityFileDefaultSchema,
      });

      expect(problems.length).toBe(1);
      expect(problems[0].ruleId).toBe('entity key-valid');
      expect(problems[0].message).toContain('lowercase letters');
    });

    it('should detect missing metadata fields for specific entity types', async () => {
      const entityYaml = `
  type: api-description
  key: my-api
  title: My API
  metadata:
    specType: openapi
    # Missing descriptionFile
  `;

      const document = makeDocumentFromString(entityYaml, '/entity.yaml');

      const problems = await lintEntityFile({
        config: { document } as Config,
        entitySchema: entityFileSchema,
        entityDefaultSchema: entityFileDefaultSchema,
      });

      expect(problems.length).toBeGreaterThan(0);
    });

    it('should detect invalid entity type in array', async () => {
      const entitiesYaml = `
  - type: user
    key: john-doe
    title: John Doe
    metadata:
      email: john@example.com
  
  - type: service
    key: invalid-service
    # Missing required title field
  `;

      const document = makeDocumentFromString(entitiesYaml, '/entities.yaml');

      const problems = await lintEntityFile({
        config: { document } as Config,
        entitySchema: entityFileSchema,
        entityDefaultSchema: entityFileDefaultSchema,
      });

      expect(problems.length).toBeGreaterThan(0);
      expect(problems.some((p) => p.message.includes('title'))).toBe(true);
    });

    it('should validate service entity without metadata', async () => {
      const entityYaml = `
  type: service
  key: my-service
  title: My Service
  summary: A simple service
  `;

      const document = makeDocumentFromString(entityYaml, '/entity.yaml');

      const problems = await lintEntityFile({
        config: { document } as Config,
        entitySchema: entityFileSchema,
        entityDefaultSchema: entityFileDefaultSchema,
      });

      expect(problems.length).toBe(0);
    });

    it('should detect invalid relation type', async () => {
      const entityYaml = `
  type: service
  key: my-service
  title: My Service
  relations:
    - type: invalidRelationType
      key: some-entity
  `;

      const document = makeDocumentFromString(entityYaml, '/entity.yaml');

      const problems = await lintEntityFile({
        config: { document } as Config,
        entitySchema: entityFileSchema,
        entityDefaultSchema: entityFileDefaultSchema,
      });

      expect(problems.length).toBeGreaterThan(0);
      expect(
        problems.some(
          (p) =>
            p.message.toLowerCase().includes('enum') ||
            p.message.includes('invalidRelationType') ||
            p.message.includes('type')
        )
      ).toBe(true);
    });

    it('should validate type-specific metadata fields correctly', async () => {
      const apiOperationYaml = `
  type: api-operation
  key: test-operation
  title: Test Operation
  metadata:
    wrongField: value
  `;

      const document = makeDocumentFromString(apiOperationYaml, '/entity.yaml');

      const problems = await lintEntityFile({
        config: { document } as Config,
        entitySchema: entityFileSchema,
        entityDefaultSchema: entityFileDefaultSchema,
      });

      expect(problems.length).toBeGreaterThan(0);
      const hasMethodOrPathError = problems.some(
        (p) => p.message.includes('method') || p.message.includes('path')
      );
      const hasEmailError = problems.some((p) => p.message.includes('email'));

      expect(hasEmailError).toBe(false);
      expect(hasMethodOrPathError).toBe(true);
    });

    it('should validate different metadata schemas in array of mixed entity types', async () => {
      const mixedEntitiesYaml = `
  - type: api-description
    key: my-api
    title: My API
    metadata:
      specType: openapi
      # Missing descriptionFile
  
  - type: api-operation
    key: my-operation
    title: My Operation
    metadata:
      wrongField: value
      # Missing method and path
  
  - type: data-schema
    key: my-schema
    title: My Schema
    metadata:
      wrongField: value
      # Missing specType
  `;

      const document = makeDocumentFromString(mixedEntitiesYaml, '/entities.yaml');

      const problems = await lintEntityFile({
        config: { document } as Config,
        entitySchema: entityFileSchema,
        entityDefaultSchema: entityFileDefaultSchema,
      });

      expect(problems.length).toBeGreaterThan(0);

      const hasDescriptionFileError = problems.some((p) => p.message.includes('descriptionFile'));

      const hasMethodError = problems.some((p) => p.message.includes('method'));
      const hasPathError = problems.some((p) => p.message.includes('path'));

      const hasSpecTypeError = problems.some((p) => p.message.includes('specType'));

      const hasEmailError = problems.some((p) => p.message.includes('email'));

      expect(hasDescriptionFileError).toBe(true);
      expect(hasMethodError).toBe(true);
      expect(hasPathError).toBe(true);
      expect(hasSpecTypeError).toBe(true);

      expect(hasEmailError).toBe(false);
    });

    it('should handle entity without type in array using default schema', async () => {
      const mixedEntitiesYaml = `
  - type: user
    key: valid-user
    title: Valid User
    metadata:
      email: user@example.com
  
  - key: no-type-entity
    title: Entity Without Type
    summary: This entity is missing the type field
    # Missing type - should use EntityFileDefault schema
  
  - type: service
    key: valid-service
    title: Valid Service
  `;

      const document = makeDocumentFromString(mixedEntitiesYaml, '/entities.yaml');

      const problems = await lintEntityFile({
        config: { document } as Config,
        entitySchema: entityFileSchema,
        entityDefaultSchema: entityFileDefaultSchema,
      });

      expect(problems.length).toBeGreaterThan(0);
      const hasTypeError = problems.some((p) => p.message.includes('type'));

      expect(hasTypeError).toBe(true);
    });
  });
});
