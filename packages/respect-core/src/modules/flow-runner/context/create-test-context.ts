import path from '../../../utils/path.js';
import {
  type TestDescription,
  type AppOptions,
  type TestContext,
  type InputSchema,
} from '../../../types.js';
import { type ApiFetcher } from '../../../utils/api-fetcher.js';
import { bundleOpenApi } from '../../description-parser/index.js';
import { createFaker } from '../../faker.js';
import { infoSubstitute } from '../../arazzo-description-generator/index.js';
import { formatCliInputs } from '../inputs/index.js';
import { bundleArazzo } from '../get-test-description-from-file.js';
import { getNestedValue } from '../../../utils/get-nested-value.js';
import { getPublicWorkflows } from './set-public-workflows.js';
import { resolveSeverityConfiguration } from '../../checks/index.js';

const faker = createFaker();

interface Descriptions {
  [key: string]: any;
}

export async function createTestContext(
  testDescription: TestDescription,
  options: AppOptions,
  apiClient: ApiFetcher
): Promise<TestContext> {
  const sourceDescriptions = testDescription?.sourceDescriptions;

  const bundledDescriptions = {} as Descriptions;

  if (sourceDescriptions) {
    await Promise.all(
      sourceDescriptions.map(async (sourceDescription) => {
        if (sourceDescription.type === 'openapi') {
          const parsedDocument = await bundleOpenApi({
            descriptionPath: sourceDescription.url,
            config: options.config,
            base: options.workflowPath,
            externalRefResolver: options?.externalRefResolver,
          });
          const { paths, servers, info, security, components } = parsedDocument;
          bundledDescriptions[sourceDescription.name] = {
            paths,
            servers,
            info,
            security,
            components,
          };
        } else if (sourceDescription.type === 'arazzo') {
          const { url: sourceDescriptionPath, name } = sourceDescription;
          const filePath = path.resolve(path.dirname(options.workflowPath), sourceDescriptionPath);
          const bundledTestDescription = await bundleArazzo({
            filePath,
            version: options?.version,
            logger: options.logger,
            externalRefResolver: options?.externalRefResolver,
          });

          bundledDescriptions[name] = bundledTestDescription;
        }
      })
    );
  }

  for (const workflow of testDescription.workflows || []) {
    for (const step of workflow.steps) {
      step.checks = []; // we are mutating the copy of the arazzo file
    }
  }

  const ctx: TestContext = {
    $response: undefined,
    $request: undefined,
    $inputs: { env: {} },
    $faker: faker,
    $sourceDescriptions: bundledDescriptions,
    $workflows: getPublicWorkflows({
      workflows: testDescription.workflows || [],
      inputs: formatCliInputs(options?.input),
      env: options.envVariables || {},
    }),
    $steps: {},
    $components: testDescription.components || {},
    $outputs: {},

    executedSteps: [],

    workflows: testDescription.workflows || [],
    options,
    testDescription,
    info: testDescription.info || infoSubstitute,
    arazzo: testDescription.arazzo || '',
    sourceDescriptions: testDescription.sourceDescriptions || [],
    secretFields: new Set<string>(),
    severity: resolveSeverityConfiguration(options.severity),
    apiClient,
    requestFileLoader: options.requestFileLoader,
  };

  // Collect all secret fields from the input schema and the workflow inputs
  for (const workflow of testDescription.workflows || []) {
    if (workflow.inputs) {
      collectSecretFields(ctx, workflow.inputs, ctx.$workflows[workflow.workflowId].inputs);
    }
  }

  return ctx;
}

export function collectSecretFields(
  ctx: TestContext,
  schema: InputSchema | undefined,
  inputs: Record<string, any> | undefined,
  path: string[] = []
) {
  if (!schema || !inputs) return;

  const inputValue = getNestedValue(inputs, path);

  if (schema.format === 'password' && inputValue) {
    ctx.secretFields.add(inputValue);
  }

  if (schema.properties) {
    Object.entries(schema.properties).forEach(([key, value]: [string, any]) => {
      const currentPath = [...path, key];
      collectSecretFields(ctx, value, inputs, currentPath);
    });
  }
}
