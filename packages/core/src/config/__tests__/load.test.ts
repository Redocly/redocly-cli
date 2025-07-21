import { loadConfig, findConfig, createConfig } from '../load.js';
import { type Config } from '../config.js';
import { lintConfig } from '../../lint.js';
import { replaceSourceWithRef } from '../../../__tests__/utils.js';
import { type RuleConfig, type RawUniversalConfig } from './../types.js';
import { BaseResolver } from '../../resolve.js';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

vi.mock('node:fs', async () => {
  const actual = await vi.importActual('node:fs');
  return { ...actual };
});
vi.mock('node:path', async () => {
  const actual = await vi.importActual('node:path');
  return { ...actual };
});

describe('loadConfig', () => {
  it('should call callback if such passed', async () => {
    const mockFn = vi.fn();
    await loadConfig({
      configPath: path.join(__dirname, './fixtures/load-redocly.yaml'),
      processRawConfig: mockFn,
    });
    expect(mockFn).toHaveBeenCalled();
  });

  it('should load config and lint it', async () => {
    const config = await loadConfig({
      configPath: path.join(__dirname, './fixtures/resolve-refs-in-config/config-with-refs.yaml'),
    });

    const problems = await lintConfig({
      severity: 'warn',
      config,
    });

    expect(replaceSourceWithRef(problems, __dirname)).toMatchInlineSnapshot(`
      [
        {
          "from": {
            "pointer": "#/seo",
            "source": "fixtures/resolve-refs-in-config/config-with-refs.yaml",
          },
          "location": [
            {
              "pointer": "#/title",
              "reportOnKey": false,
              "source": "fixtures/resolve-refs-in-config/seo.yaml",
            },
          ],
          "message": "Expected type \`string\` but got \`integer\`.",
          "ruleId": "configuration struct",
          "severity": "warn",
          "suggest": [],
        },
        {
          "from": {
            "pointer": "#/rules",
            "source": "fixtures/resolve-refs-in-config/config-with-refs.yaml",
          },
          "location": [
            {
              "pointer": "#/non-existing-rule",
              "reportOnKey": true,
              "source": "fixtures/resolve-refs-in-config/rules.yaml",
            },
          ],
          "message": "Property \`non-existing-rule\` is not expected here.",
          "ruleId": "configuration struct",
          "severity": "warn",
          "suggest": [],
        },
        {
          "location": [
            {
              "pointer": "#/theme",
              "reportOnKey": false,
              "source": "fixtures/resolve-refs-in-config/config-with-refs.yaml",
            },
          ],
          "message": "Can't resolve $ref: ENOENT: no such file or directory 'fixtures/resolve-refs-in-config/wrong-ref.yaml'",
          "ruleId": "configuration no-unresolved-refs",
          "severity": "warn",
          "suggest": [],
        },
      ]
    `);
    expect(config.resolvedConfig).toMatchInlineSnapshot(`
      {
        "plugins": undefined,
        "rules": {
          "info-license": "error",
          "non-existing-rule": "warn",
        },
        "seo": {
          "title": 1,
        },
        "theme": undefined,
      }
    `);
  });

  it('should call externalRefResolver if such passed', async () => {
    const externalRefResolver = new BaseResolver();
    const resolverSpy = vi.spyOn(externalRefResolver, 'resolveDocument');
    const configPath = path.join(__dirname, './fixtures/load-external.yaml');
    await loadConfig({
      configPath,
      externalRefResolver,
    });
    expect(resolverSpy).toHaveBeenNthCalledWith(1, null, configPath, true);
    expect(resolverSpy).toHaveBeenNthCalledWith(
      2,
      configPath,
      'https://raw.githubusercontent.com/Redocly/redocly-cli-cookbook/main/rulesets/spec-compliant/redocly.yaml'
    );
  });

  it('should bundle config with scorecards', async () => {
    const configPath = path.join(__dirname, './fixtures/load-redocly-with-scorecards.yaml');
    let parsedConfig: any;
    await loadConfig({
      configPath,
      processRawConfig: (args) => {
        parsedConfig = args.parsed;
      },
    });

    expect(parsedConfig.scorecard).toMatchInlineSnapshot(`
      {
        "ignoreNonCompliant": true,
        "levels": [
          {
            "arazzo1Decorators": {},
            "arazzo1Preprocessors": {},
            "arazzo1Rules": {
              "criteria-unique": "off",
              "no-criteria-xpath": "off",
              "no-enum-type-mismatch": "warn",
              "no-required-schema-properties-undefined": "warn",
              "no-schema-type-mismatch": "warn",
              "no-x-security-scheme-name-in-workflow": "off",
              "no-x-security-scheme-name-without-openapi": "off",
              "parameters-unique": "off",
              "requestBody-replacements-unique": "off",
              "respect-supported-versions": "off",
              "sourceDescription-name-unique": "off",
              "sourceDescription-type": "off",
              "sourceDescriptions-not-empty": "off",
              "step-onFailure-unique": "off",
              "step-onSuccess-unique": "off",
              "stepId-unique": "error",
              "workflow-dependsOn": "off",
              "workflowId-unique": "error",
              "x-security-scheme-required-values": "off",
            },
            "async2Decorators": {},
            "async2Preprocessors": {},
            "async2Rules": {
              "channels-kebab-case": "off",
              "info-contact": "off",
              "info-license-strict": "off",
              "no-channel-trailing-slash": "off",
              "no-duplicated-tag-names": "off",
              "no-enum-type-mismatch": "warn",
              "no-required-schema-properties-undefined": "warn",
              "no-schema-type-mismatch": "warn",
              "operation-operationId": "warn",
              "tag-description": "warn",
              "tags-alphabetical": "off",
            },
            "async3Decorators": {},
            "async3Preprocessors": {},
            "async3Rules": {
              "channels-kebab-case": "off",
              "info-contact": "off",
              "info-license-strict": "off",
              "no-channel-trailing-slash": "off",
              "no-duplicated-tag-names": "off",
              "no-enum-type-mismatch": "warn",
              "no-required-schema-properties-undefined": "warn",
              "no-schema-type-mismatch": "warn",
              "operation-operationId": "warn",
              "tag-description": "warn",
              "tags-alphabetical": "off",
            },
            "decorators": {},
            "name": "Baseline",
            "oas2Decorators": {},
            "oas2Preprocessors": {},
            "oas2Rules": {
              "boolean-parameter-prefixes": {
                "severity": "off",
              },
              "info-contact": "off",
              "info-license": "off",
              "info-license-strict": "off",
              "no-ambiguous-paths": "warn",
              "no-duplicated-tag-names": "off",
              "no-enum-type-mismatch": "warn",
              "no-http-verbs-in-paths": "off",
              "no-identical-paths": "warn",
              "no-invalid-parameter-examples": "off",
              "no-invalid-schema-examples": "off",
              "no-path-trailing-slash": "warn",
              "no-required-schema-properties-undefined": "warn",
              "no-schema-type-mismatch": "warn",
              "operation-2xx-response": "warn",
              "operation-4xx-response": "off",
              "operation-description": "off",
              "operation-operationId": "warn",
              "operation-operationId-unique": "warn",
              "operation-operationId-url-safe": "warn",
              "operation-parameters-unique": "warn",
              "operation-singular-tag": "off",
              "operation-summary": "warn",
              "operation-tag-defined": "off",
              "parameter-description": "off",
              "path-declaration-must-exist": "warn",
              "path-http-verbs-order": "off",
              "path-not-include-query": "warn",
              "path-parameters-defined": "warn",
              "path-params-defined": "off",
              "path-segment-plural": "off",
              "paths-kebab-case": "off",
              "request-mime-type": "off",
              "required-string-property-missing-min-length": "off",
              "response-contains-header": "off",
              "response-contains-property": "off",
              "response-mime-type": "off",
              "scalar-property-missing-example": "off",
              "security-defined": "warn",
              "spec-strict-refs": "off",
              "tag-description": "warn",
              "tags-alphabetical": "off",
            },
            "oas3_0Decorators": {},
            "oas3_0Preprocessors": {},
            "oas3_0Rules": {
              "array-parameter-serialization": "off",
              "boolean-parameter-prefixes": {
                "severity": "off",
              },
              "component-name-unique": "off",
              "info-contact": "off",
              "info-license": "off",
              "info-license-strict": "off",
              "no-ambiguous-paths": "warn",
              "no-duplicated-tag-names": "off",
              "no-empty-servers": "warn",
              "no-enum-type-mismatch": "warn",
              "no-example-value-and-externalValue": "warn",
              "no-http-verbs-in-paths": "off",
              "no-identical-paths": "warn",
              "no-invalid-media-type-examples": {
                "allowAdditionalProperties": false,
                "severity": "warn",
              },
              "no-invalid-parameter-examples": "off",
              "no-invalid-schema-examples": "off",
              "no-path-trailing-slash": "warn",
              "no-required-schema-properties-undefined": "warn",
              "no-schema-type-mismatch": "warn",
              "no-server-example.com": "warn",
              "no-server-trailing-slash": "error",
              "no-server-variables-empty-enum": "error",
              "no-undefined-server-variable": "warn",
              "no-unused-components": "warn",
              "nullable-type-sibling": "warn",
              "operation-2xx-response": "warn",
              "operation-4xx-problem-details-rfc7807": "off",
              "operation-4xx-response": "off",
              "operation-description": "off",
              "operation-operationId": "warn",
              "operation-operationId-unique": "warn",
              "operation-operationId-url-safe": "warn",
              "operation-parameters-unique": "warn",
              "operation-singular-tag": "off",
              "operation-summary": "warn",
              "operation-tag-defined": "off",
              "parameter-description": "off",
              "path-declaration-must-exist": "warn",
              "path-http-verbs-order": "off",
              "path-not-include-query": "warn",
              "path-parameters-defined": "warn",
              "path-params-defined": "off",
              "path-segment-plural": "off",
              "paths-kebab-case": "off",
              "request-mime-type": "off",
              "required-string-property-missing-min-length": "off",
              "response-contains-header": "off",
              "response-contains-property": "off",
              "response-mime-type": "off",
              "scalar-property-missing-example": "off",
              "security-defined": "warn",
              "spec-components-invalid-map-name": "warn",
              "spec-strict-refs": "off",
              "tag-description": "warn",
              "tags-alphabetical": "off",
            },
            "oas3_1Decorators": {},
            "oas3_1Preprocessors": {},
            "oas3_1Rules": {
              "array-parameter-serialization": "off",
              "boolean-parameter-prefixes": {
                "severity": "off",
              },
              "component-name-unique": "off",
              "info-contact": "off",
              "info-license": "off",
              "info-license-strict": "off",
              "no-ambiguous-paths": "warn",
              "no-duplicated-tag-names": "off",
              "no-empty-servers": "warn",
              "no-enum-type-mismatch": "warn",
              "no-example-value-and-externalValue": "warn",
              "no-http-verbs-in-paths": "off",
              "no-identical-paths": "warn",
              "no-invalid-media-type-examples": "warn",
              "no-invalid-parameter-examples": "off",
              "no-invalid-schema-examples": "off",
              "no-path-trailing-slash": "warn",
              "no-required-schema-properties-undefined": "warn",
              "no-schema-type-mismatch": "warn",
              "no-server-example.com": "warn",
              "no-server-trailing-slash": "error",
              "no-server-variables-empty-enum": "error",
              "no-undefined-server-variable": "warn",
              "no-unused-components": "warn",
              "operation-2xx-response": "warn",
              "operation-4xx-problem-details-rfc7807": "off",
              "operation-4xx-response": "off",
              "operation-description": "off",
              "operation-operationId": "warn",
              "operation-operationId-unique": "warn",
              "operation-operationId-url-safe": "warn",
              "operation-parameters-unique": "warn",
              "operation-singular-tag": "off",
              "operation-summary": "warn",
              "operation-tag-defined": "off",
              "parameter-description": "off",
              "path-declaration-must-exist": "warn",
              "path-http-verbs-order": "off",
              "path-not-include-query": "warn",
              "path-parameters-defined": "warn",
              "path-params-defined": "off",
              "path-segment-plural": "off",
              "paths-kebab-case": "off",
              "request-mime-type": "off",
              "required-string-property-missing-min-length": "off",
              "response-contains-header": "off",
              "response-contains-property": "off",
              "response-mime-type": "off",
              "scalar-property-missing-example": "off",
              "security-defined": "warn",
              "spec-components-invalid-map-name": "warn",
              "spec-strict-refs": "off",
              "tag-description": "warn",
              "tags-alphabetical": "off",
            },
            "overlay1Decorators": {},
            "overlay1Preprocessors": {},
            "overlay1Rules": {
              "info-contact": "off",
            },
            "preprocessors": {},
            "rules": {
              "boolean-parameter-prefixes": {
                "severity": "off",
              },
              "no-unresolved-refs": "error",
              "struct": "error",
            },
          },
          {
            "arazzo1Decorators": {},
            "arazzo1Preprocessors": {},
            "arazzo1Rules": {
              "criteria-unique": "warn",
              "no-criteria-xpath": "off",
              "no-enum-type-mismatch": "error",
              "no-required-schema-properties-undefined": "warn",
              "no-schema-type-mismatch": "error",
              "no-x-security-scheme-name-in-workflow": "off",
              "no-x-security-scheme-name-without-openapi": "off",
              "parameters-unique": "error",
              "requestBody-replacements-unique": "warn",
              "respect-supported-versions": "off",
              "sourceDescription-name-unique": "error",
              "sourceDescription-type": "error",
              "sourceDescriptions-not-empty": "error",
              "step-onFailure-unique": "warn",
              "step-onSuccess-unique": "warn",
              "stepId-unique": "error",
              "workflow-dependsOn": "error",
              "workflowId-unique": "error",
              "x-security-scheme-required-values": "off",
            },
            "async2Decorators": {},
            "async2Preprocessors": {},
            "async2Rules": {
              "channels-kebab-case": "off",
              "info-contact": "off",
              "info-license-strict": "warn",
              "no-channel-trailing-slash": "off",
              "no-duplicated-tag-names": "warn",
              "no-enum-type-mismatch": "error",
              "no-required-schema-properties-undefined": "warn",
              "no-schema-type-mismatch": "error",
              "operation-operationId": "warn",
              "tag-description": "warn",
              "tags-alphabetical": "off",
            },
            "async3Decorators": {},
            "async3Preprocessors": {},
            "async3Rules": {
              "channels-kebab-case": "off",
              "info-contact": "off",
              "info-license-strict": "warn",
              "no-channel-trailing-slash": "off",
              "no-duplicated-tag-names": "warn",
              "no-enum-type-mismatch": "error",
              "no-required-schema-properties-undefined": "warn",
              "no-schema-type-mismatch": "error",
              "operation-operationId": "warn",
              "tag-description": "warn",
              "tags-alphabetical": "off",
            },
            "decorators": {},
            "name": "Silver",
            "oas2Decorators": {},
            "oas2Preprocessors": {},
            "oas2Rules": {
              "boolean-parameter-prefixes": "off",
              "info-contact": "off",
              "info-license": "warn",
              "info-license-strict": "warn",
              "no-ambiguous-paths": "warn",
              "no-duplicated-tag-names": "warn",
              "no-enum-type-mismatch": "error",
              "no-http-verbs-in-paths": "off",
              "no-identical-paths": "error",
              "no-invalid-parameter-examples": "off",
              "no-invalid-schema-examples": "off",
              "no-path-trailing-slash": "error",
              "no-required-schema-properties-undefined": "warn",
              "no-schema-type-mismatch": "error",
              "operation-2xx-response": "warn",
              "operation-4xx-response": "warn",
              "operation-description": "off",
              "operation-operationId": "warn",
              "operation-operationId-unique": "error",
              "operation-operationId-url-safe": "error",
              "operation-parameters-unique": "error",
              "operation-singular-tag": "off",
              "operation-summary": "error",
              "operation-tag-defined": "off",
              "parameter-description": "off",
              "path-declaration-must-exist": "error",
              "path-http-verbs-order": "off",
              "path-not-include-query": "error",
              "path-parameters-defined": "error",
              "path-params-defined": "off",
              "path-segment-plural": "off",
              "paths-kebab-case": "off",
              "request-mime-type": "off",
              "required-string-property-missing-min-length": "off",
              "response-contains-header": "off",
              "response-contains-property": "off",
              "response-mime-type": "off",
              "scalar-property-missing-example": "off",
              "security-defined": "error",
              "spec-strict-refs": "off",
              "tag-description": "warn",
              "tags-alphabetical": "off",
            },
            "oas3_0Decorators": {},
            "oas3_0Preprocessors": {},
            "oas3_0Rules": {
              "array-parameter-serialization": "off",
              "boolean-parameter-prefixes": "off",
              "component-name-unique": "off",
              "info-contact": "off",
              "info-license": "warn",
              "info-license-strict": "warn",
              "no-ambiguous-paths": "warn",
              "no-duplicated-tag-names": "warn",
              "no-empty-servers": "error",
              "no-enum-type-mismatch": "error",
              "no-example-value-and-externalValue": "error",
              "no-http-verbs-in-paths": "off",
              "no-identical-paths": "error",
              "no-invalid-media-type-examples": {
                "allowAdditionalProperties": false,
                "severity": "warn",
              },
              "no-invalid-parameter-examples": "off",
              "no-invalid-schema-examples": "off",
              "no-path-trailing-slash": "error",
              "no-required-schema-properties-undefined": "warn",
              "no-schema-type-mismatch": "error",
              "no-server-example.com": "warn",
              "no-server-trailing-slash": "error",
              "no-server-variables-empty-enum": "error",
              "no-undefined-server-variable": "error",
              "no-unused-components": "warn",
              "nullable-type-sibling": "error",
              "operation-2xx-response": "warn",
              "operation-4xx-problem-details-rfc7807": "off",
              "operation-4xx-response": "warn",
              "operation-description": "off",
              "operation-operationId": "warn",
              "operation-operationId-unique": "error",
              "operation-operationId-url-safe": "error",
              "operation-parameters-unique": "error",
              "operation-singular-tag": "off",
              "operation-summary": "error",
              "operation-tag-defined": "off",
              "parameter-description": "off",
              "path-declaration-must-exist": "error",
              "path-http-verbs-order": "off",
              "path-not-include-query": "error",
              "path-parameters-defined": "error",
              "path-params-defined": "off",
              "path-segment-plural": "off",
              "paths-kebab-case": "off",
              "request-mime-type": "off",
              "required-string-property-missing-min-length": "off",
              "response-contains-header": "off",
              "response-contains-property": "off",
              "response-mime-type": "off",
              "scalar-property-missing-example": "off",
              "security-defined": "error",
              "spec-components-invalid-map-name": "error",
              "spec-strict-refs": "off",
              "tag-description": "warn",
              "tags-alphabetical": "off",
            },
            "oas3_1Decorators": {},
            "oas3_1Preprocessors": {},
            "oas3_1Rules": {
              "array-parameter-serialization": "off",
              "boolean-parameter-prefixes": "off",
              "component-name-unique": "off",
              "info-contact": "off",
              "info-license": "warn",
              "info-license-strict": "warn",
              "no-ambiguous-paths": "warn",
              "no-duplicated-tag-names": "warn",
              "no-empty-servers": "error",
              "no-enum-type-mismatch": "error",
              "no-example-value-and-externalValue": "error",
              "no-http-verbs-in-paths": "off",
              "no-identical-paths": "error",
              "no-invalid-media-type-examples": "warn",
              "no-invalid-parameter-examples": "off",
              "no-invalid-schema-examples": "off",
              "no-path-trailing-slash": "error",
              "no-required-schema-properties-undefined": "warn",
              "no-schema-type-mismatch": "error",
              "no-server-example.com": "warn",
              "no-server-trailing-slash": "error",
              "no-server-variables-empty-enum": "error",
              "no-undefined-server-variable": "error",
              "no-unused-components": "warn",
              "operation-2xx-response": "warn",
              "operation-4xx-problem-details-rfc7807": "off",
              "operation-4xx-response": "warn",
              "operation-description": "off",
              "operation-operationId": "warn",
              "operation-operationId-unique": "error",
              "operation-operationId-url-safe": "error",
              "operation-parameters-unique": "error",
              "operation-singular-tag": "off",
              "operation-summary": "error",
              "operation-tag-defined": "off",
              "parameter-description": "off",
              "path-declaration-must-exist": "error",
              "path-http-verbs-order": "off",
              "path-not-include-query": "error",
              "path-parameters-defined": "error",
              "path-params-defined": "off",
              "path-segment-plural": "off",
              "paths-kebab-case": "off",
              "request-mime-type": "off",
              "required-string-property-missing-min-length": "off",
              "response-contains-header": "off",
              "response-contains-property": "off",
              "response-mime-type": "off",
              "scalar-property-missing-example": "off",
              "security-defined": "error",
              "spec-components-invalid-map-name": "error",
              "spec-strict-refs": "off",
              "tag-description": "warn",
              "tags-alphabetical": "off",
            },
            "overlay1Decorators": {},
            "overlay1Preprocessors": {},
            "overlay1Rules": {
              "info-contact": "off",
            },
            "preprocessors": {},
            "rules": {
              "no-unresolved-refs": "error",
              "rule/operation-summary": {
                "subject": {
                  "property": "summary",
                  "type": "Operation",
                },
                "where": [
                  {
                    "assertions": {
                      "defined": true,
                    },
                    "subject": {
                      "type": "Paths",
                    },
                  },
                ],
              },
              "struct": "error",
            },
          },
          {
            "arazzo1Decorators": {},
            "arazzo1Preprocessors": {},
            "arazzo1Rules": {
              "criteria-unique": "off",
              "no-criteria-xpath": "off",
              "no-enum-type-mismatch": "warn",
              "no-required-schema-properties-undefined": "warn",
              "no-schema-type-mismatch": "warn",
              "no-x-security-scheme-name-in-workflow": "off",
              "no-x-security-scheme-name-without-openapi": "off",
              "parameters-unique": "off",
              "requestBody-replacements-unique": "off",
              "respect-supported-versions": "off",
              "sourceDescription-name-unique": "off",
              "sourceDescription-type": "off",
              "sourceDescriptions-not-empty": "off",
              "step-onFailure-unique": "off",
              "step-onSuccess-unique": "off",
              "stepId-unique": "error",
              "workflow-dependsOn": "off",
              "workflowId-unique": "error",
              "x-security-scheme-required-values": "off",
            },
            "async2Decorators": {},
            "async2Preprocessors": {},
            "async2Rules": {
              "channels-kebab-case": "off",
              "info-contact": "off",
              "info-license-strict": "off",
              "no-channel-trailing-slash": "off",
              "no-duplicated-tag-names": "off",
              "no-enum-type-mismatch": "warn",
              "no-required-schema-properties-undefined": "warn",
              "no-schema-type-mismatch": "warn",
              "operation-operationId": "warn",
              "tag-description": "warn",
              "tags-alphabetical": "off",
            },
            "async3Decorators": {},
            "async3Preprocessors": {},
            "async3Rules": {
              "channels-kebab-case": "off",
              "info-contact": "off",
              "info-license-strict": "off",
              "no-channel-trailing-slash": "off",
              "no-duplicated-tag-names": "off",
              "no-enum-type-mismatch": "warn",
              "no-required-schema-properties-undefined": "warn",
              "no-schema-type-mismatch": "warn",
              "operation-operationId": "warn",
              "tag-description": "warn",
              "tags-alphabetical": "off",
            },
            "decorators": {},
            "name": "Gold",
            "oas2Decorators": {},
            "oas2Preprocessors": {},
            "oas2Rules": {
              "boolean-parameter-prefixes": "off",
              "info-contact": "off",
              "info-license": "off",
              "info-license-strict": "off",
              "no-ambiguous-paths": "error",
              "no-duplicated-tag-names": "off",
              "no-enum-type-mismatch": "warn",
              "no-http-verbs-in-paths": "off",
              "no-identical-paths": "warn",
              "no-invalid-parameter-examples": "off",
              "no-invalid-schema-examples": "error",
              "no-path-trailing-slash": "warn",
              "no-required-schema-properties-undefined": "warn",
              "no-schema-type-mismatch": "warn",
              "operation-2xx-response": "warn",
              "operation-4xx-response": "off",
              "operation-description": "off",
              "operation-operationId": "warn",
              "operation-operationId-unique": "warn",
              "operation-operationId-url-safe": "warn",
              "operation-parameters-unique": "warn",
              "operation-singular-tag": "off",
              "operation-summary": "warn",
              "operation-tag-defined": "off",
              "parameter-description": "off",
              "path-declaration-must-exist": "warn",
              "path-http-verbs-order": "off",
              "path-not-include-query": "warn",
              "path-parameters-defined": "warn",
              "path-params-defined": "off",
              "path-segment-plural": "off",
              "paths-kebab-case": "error",
              "request-mime-type": "off",
              "required-string-property-missing-min-length": "off",
              "response-contains-header": "off",
              "response-contains-property": "off",
              "response-mime-type": "off",
              "scalar-property-missing-example": "off",
              "security-defined": "warn",
              "spec-strict-refs": "error",
              "tag-description": "warn",
              "tags-alphabetical": "off",
            },
            "oas3_0Decorators": {},
            "oas3_0Preprocessors": {},
            "oas3_0Rules": {
              "array-parameter-serialization": "off",
              "boolean-parameter-prefixes": "off",
              "component-name-unique": "off",
              "info-contact": "off",
              "info-license": "off",
              "info-license-strict": "off",
              "no-ambiguous-paths": "error",
              "no-duplicated-tag-names": "off",
              "no-empty-servers": "warn",
              "no-enum-type-mismatch": "warn",
              "no-example-value-and-externalValue": "warn",
              "no-http-verbs-in-paths": "off",
              "no-identical-paths": "warn",
              "no-invalid-media-type-examples": {
                "allowAdditionalProperties": false,
                "severity": "warn",
              },
              "no-invalid-parameter-examples": "off",
              "no-invalid-schema-examples": "error",
              "no-path-trailing-slash": "warn",
              "no-required-schema-properties-undefined": "warn",
              "no-schema-type-mismatch": "warn",
              "no-server-example.com": "warn",
              "no-server-trailing-slash": "error",
              "no-server-variables-empty-enum": "error",
              "no-undefined-server-variable": "warn",
              "no-unused-components": "warn",
              "nullable-type-sibling": "warn",
              "operation-2xx-response": "warn",
              "operation-4xx-problem-details-rfc7807": "off",
              "operation-4xx-response": "off",
              "operation-description": "off",
              "operation-operationId": "warn",
              "operation-operationId-unique": "warn",
              "operation-operationId-url-safe": "warn",
              "operation-parameters-unique": "warn",
              "operation-singular-tag": "off",
              "operation-summary": "warn",
              "operation-tag-defined": "off",
              "parameter-description": "off",
              "path-declaration-must-exist": "warn",
              "path-http-verbs-order": "off",
              "path-not-include-query": "warn",
              "path-parameters-defined": "warn",
              "path-params-defined": "off",
              "path-segment-plural": "off",
              "paths-kebab-case": "error",
              "request-mime-type": "off",
              "required-string-property-missing-min-length": "off",
              "response-contains-header": "off",
              "response-contains-property": "off",
              "response-mime-type": "off",
              "scalar-property-missing-example": "off",
              "security-defined": "warn",
              "spec-components-invalid-map-name": "warn",
              "spec-strict-refs": "error",
              "tag-description": "warn",
              "tags-alphabetical": "off",
            },
            "oas3_1Decorators": {},
            "oas3_1Preprocessors": {},
            "oas3_1Rules": {
              "array-parameter-serialization": "off",
              "boolean-parameter-prefixes": "off",
              "component-name-unique": "off",
              "info-contact": "off",
              "info-license": "off",
              "info-license-strict": "off",
              "no-ambiguous-paths": "error",
              "no-duplicated-tag-names": "off",
              "no-empty-servers": "warn",
              "no-enum-type-mismatch": "warn",
              "no-example-value-and-externalValue": "warn",
              "no-http-verbs-in-paths": "off",
              "no-identical-paths": "warn",
              "no-invalid-media-type-examples": "warn",
              "no-invalid-parameter-examples": "off",
              "no-invalid-schema-examples": "error",
              "no-path-trailing-slash": "warn",
              "no-required-schema-properties-undefined": "warn",
              "no-schema-type-mismatch": "warn",
              "no-server-example.com": "warn",
              "no-server-trailing-slash": "error",
              "no-server-variables-empty-enum": "error",
              "no-undefined-server-variable": "warn",
              "no-unused-components": "warn",
              "operation-2xx-response": "warn",
              "operation-4xx-problem-details-rfc7807": "off",
              "operation-4xx-response": "off",
              "operation-description": "off",
              "operation-operationId": "warn",
              "operation-operationId-unique": "warn",
              "operation-operationId-url-safe": "warn",
              "operation-parameters-unique": "warn",
              "operation-singular-tag": "off",
              "operation-summary": "warn",
              "operation-tag-defined": "off",
              "parameter-description": "off",
              "path-declaration-must-exist": "warn",
              "path-http-verbs-order": "off",
              "path-not-include-query": "warn",
              "path-parameters-defined": "warn",
              "path-params-defined": "off",
              "path-segment-plural": "off",
              "paths-kebab-case": "error",
              "request-mime-type": "off",
              "required-string-property-missing-min-length": "off",
              "response-contains-header": "off",
              "response-contains-property": "off",
              "response-mime-type": "off",
              "scalar-property-missing-example": "off",
              "security-defined": "warn",
              "spec-components-invalid-map-name": "warn",
              "spec-strict-refs": "error",
              "tag-description": "warn",
              "tags-alphabetical": "off",
            },
            "overlay1Decorators": {},
            "overlay1Preprocessors": {},
            "overlay1Rules": {
              "info-contact": "off",
            },
            "preprocessors": {},
            "rules": {
              "no-ambiguous-paths": "error",
              "no-invalid-schema-examples": "error",
              "no-unresolved-refs": "error",
              "paths-kebab-case": "error",
              "rule/headers-include-example": {
                "assertions": {
                  "requireAny": [
                    "example",
                    "examples",
                  ],
                },
                "subject": {
                  "type": "Header",
                },
              },
              "rule/operation-security-defined": {
                "assertions": {
                  "defined": true,
                },
                "message": "Property \`security\` must be defined",
                "subject": {
                  "property": "security",
                  "type": "Operation",
                },
                "where": [
                  {
                    "assertions": {
                      "defined": true,
                    },
                    "subject": {
                      "type": "Paths",
                    },
                  },
                ],
              },
              "rule/operationId-casing": {
                "assertions": {
                  "casing": "camelCase",
                },
                "subject": {
                  "property": "operationId",
                  "type": "Operation",
                },
              },
              "rule/parameter-casing": {
                "assertions": {
                  "casing": "camelCase",
                },
                "subject": {
                  "type": "Parameter",
                },
              },
              "rule/params-must-include-examples": {
                "assertions": {
                  "mutuallyExclusive": [
                    "example",
                    "examples",
                  ],
                  "requireAny": [
                    "example",
                    "examples",
                  ],
                },
                "subject": {
                  "type": "Parameter",
                },
              },
              "rule/schema-properties-casing": {
                "assertions": {
                  "casing": "camelCase",
                },
                "subject": {
                  "property": "properties",
                  "type": "Schema",
                },
              },
              "rule/terms-url": {
                "assertions": {
                  "defined": true,
                },
                "subject": {
                  "property": "termsOfService",
                  "type": "Info",
                },
              },
              "spec-strict-refs": "error",
              "struct": "error",
            },
          },
        ],
      }
    `);
  });

  it('should keep the original config document', async () => {
    const { resolvedConfig } = await loadConfig({
      configPath: path.join(__dirname, './fixtures/resolve-refs-in-config/config-with-refs.yaml'),
    });
    expect(resolvedConfig).toEqual({
      seo: {
        title: 1,
      },
      rules: {
        'info-license': 'error',
        'non-existing-rule': 'warn',
      },
      theme: undefined,
    });
  });
});

describe('findConfig', () => {
  it('should find redocly.yaml', async () => {
    vi.spyOn(fs, 'existsSync').mockImplementation((name) => name === 'redocly.yaml');
    const configName = findConfig();
    expect(configName).toStrictEqual('redocly.yaml');
  });
  it('should find .redocly.yaml', async () => {
    vi.spyOn(fs, 'existsSync').mockImplementation((name) => name === '.redocly.yaml');
    const configName = findConfig();
    expect(configName).toStrictEqual('.redocly.yaml');
  });
  it('should throw an error when found multiple config files', async () => {
    vi.spyOn(fs, 'existsSync').mockImplementation(
      (name) => name === 'redocly.yaml' || name === '.redocly.yaml'
    );
    expect(findConfig).toThrow(`
      Multiple configuration files are not allowed.
      Found the following files: redocly.yaml, .redocly.yaml.
      Please use 'redocly.yaml' instead.
    `);
  });
  it('should find a nested config ', async () => {
    vi.spyOn(fs, 'existsSync').mockImplementation((name) => name === 'dir/redocly.yaml');
    vi.spyOn(path, 'resolve').mockImplementationOnce((dir, name) => `${dir}/${name}`);
    const configName = findConfig('dir');
    expect(configName).toStrictEqual('dir/redocly.yaml');
  });
});

describe('createConfig', () => {
  it('should create config from string', async () => {
    const config = await createConfig(`
      extends:
      - recommended
      rules:
        info-license: off
    `);

    verifyExtendedConfig(config, {
      extendsRuleSet: 'recommended',
      overridesRules: { 'info-license': 'off' },
    });
  });

  it('should create config from object', async () => {
    const rawConfig: RawUniversalConfig = {
      extends: ['minimal'],
      rules: {
        'info-license': 'off',
        'tag-description': 'off',
        'operation-2xx-response': 'off',
      },
    };
    const config = await createConfig(rawConfig);

    verifyExtendedConfig(config, {
      extendsRuleSet: 'minimal',
      overridesRules: rawConfig.rules as Record<string, RuleConfig>,
    });
  });

  it('should create config from object with a custom plugin', async () => {
    const testCustomRule = vi.fn();
    const rawConfig: RawUniversalConfig = {
      extends: [],
      plugins: [
        {
          id: 'my-plugin',
          rules: {
            oas3: {
              'test-rule': testCustomRule,
            },
          },
        },
      ],
      rules: {
        'my-plugin/test-rule': 'error',
      },
    };
    const config = await createConfig(rawConfig);

    expect(config.plugins[0]).toEqual({
      id: 'my-plugin',
      rules: {
        oas3: {
          'my-plugin/test-rule': testCustomRule,
        },
      },
    });
    expect(config.rules.oas3_0).toEqual({
      'my-plugin/test-rule': 'error',
    });
  });

  it('should create a config with the apis section', async () => {
    const testConfig: Config = await createConfig(
      {
        apis: {
          'test@v1': {
            root: 'resources/pets.yaml',
            rules: {
              'operation-summary': 'warn',
              'rule/test': 'warn',
            },
          },
        },
        rules: {
          'operation-summary': 'error',
          'no-empty-servers': 'error',
          'rule/test': {
            subject: {
              type: 'Operation',
              property: 'x-test',
            },
            assertions: {
              defined: true,
            },
          },
        },
        telemetry: 'on',
        resolve: { http: { headers: [] } },
      },
      {
        configPath: 'redocly.yaml',
      }
    );
    // clean absolute paths and not needed fields
    testConfig.plugins = [];
    testConfig.document = undefined;
    testConfig.resolvedRefMap = undefined;

    expect(testConfig).toMatchSnapshot();
  });

  it('should return empty object if there is no configPath and config file is not found', () => {
    expect(createConfig({})).toEqual(Promise.resolve({ resolvedConfig: {} }));
  });
});

function verifyExtendedConfig(
  config: Config,
  {
    extendsRuleSet,
    overridesRules,
  }: { extendsRuleSet: string; overridesRules: Record<string, RuleConfig> }
) {
  const defaultPlugin = config.plugins.find((plugin) => plugin.id === '');
  expect(defaultPlugin).toBeDefined();

  const recommendedRules = defaultPlugin?.configs?.[extendsRuleSet];
  expect(recommendedRules).toBeDefined();

  verifyOasRules(config.rules.oas2, overridesRules, {
    ...recommendedRules?.rules,
    ...recommendedRules?.oas2Rules,
  });

  verifyOasRules(config.rules.oas3_0, overridesRules, {
    ...recommendedRules?.rules,
    ...recommendedRules?.oas3_0Rules,
  });

  verifyOasRules(config.rules.oas3_1, overridesRules, {
    ...recommendedRules?.rules,
    ...recommendedRules?.oas3_1Rules,
  });
}

function verifyOasRules(
  finalRuleset: Record<string, RuleConfig>,
  overridesRules: Record<string, RuleConfig>,
  defaultRuleset: Record<string, RuleConfig>
) {
  Object.entries(finalRuleset).forEach(([ruleName, ruleValue]) => {
    if (ruleName in overridesRules) {
      expect(ruleValue).toBe(overridesRules[ruleName]);
    } else {
      expect(ruleValue).toBe(defaultRuleset[ruleName]);
    }
  });
}
