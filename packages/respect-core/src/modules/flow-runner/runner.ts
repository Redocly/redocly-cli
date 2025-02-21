import { blue, green } from 'colorette';
import { basename, dirname, resolve } from 'node:path';
import { writeFileSync } from 'node:fs';
import { createHarLog } from '../../utils/har-logs';
import { ApiFetcher } from '../../utils/api-fetcher';
import { createTestContext } from './context/create-test-context';
import { getValueFromContext } from '../config-parser';
import { getWorkflowsToRun } from './get-workflows-to-run';
import { runStep } from './run-step';
import {
  printWorkflowSeparator,
  indent,
  printRequiredWorkflowSeparator,
} from '../../utils/cli-outputs';
import { bundleArazzo } from './get-test-description-from-file';
import { CHECKS } from '../checks';
import { createRuntimeExpressionCtx } from './context';
import { evaluateRuntimeExpressionPayload } from '../runtime-expressions';
import { calculateTotals, composeJsonLogs, maskSecrets } from '../cli-output';
import { resolveRunningWorkflows } from './resolve-running-workflows';
import { DefaultLogger } from '../../utils/logger/logger';

import type { CollectFn } from '@redocly/openapi-core/src/utils';
import type {
  TestDescription,
  AppOptions,
  TestContext,
  RunArgv,
  Workflow,
  SourceDescription,
  Check,
  RunWorkflowInput,
} from '../../types';

const logger = DefaultLogger.getInstance();

export async function runTestFile(
  argv: RunArgv,
  output: { harFile?: string; jsonFile?: string },
  collectSpecData?: CollectFn
) {
  const {
    file: filePath,
    workflow,
    verbose,
    input,
    skip,
    server,
    'har-output': harOutput,
    'json-output': jsonOutput,
    severity,
  } = argv;

  const options = {
    workflowPath: filePath, // filePath or documentPath
    workflow,
    skip,
    verbose,
    harOutput,
    jsonOutput,
    metadata: { ...argv },
    input,
    server,
    severity,
    mutualTls: {
      clientCert: argv['client-cert'],
      clientKey: argv['client-key'],
      caCert: argv['ca-cert'],
    },
  };

  const bundledTestDescription = await bundleArazzo(filePath);
  collectSpecData?.(bundledTestDescription);
  const descriptionCopy = JSON.parse(JSON.stringify(bundledTestDescription));

  const { harLogs, jsonLogs, workflows, secretFields } = await runWorkflows(
    bundledTestDescription,
    options
  );

  if (output?.harFile && Object.keys(harLogs).length) {
    const parsedHarLogs = maskSecrets(harLogs, secretFields || new Set());
    writeFileSync(output.harFile, JSON.stringify(parsedHarLogs, null, 2), 'utf-8');
    logger.log(blue(`Har logs saved in ${green(output.harFile)}`));
    logger.printNewLine();
    logger.printNewLine();
  }

  if (output?.jsonFile && jsonLogs) {
    writeFileSync(output.jsonFile, JSON.stringify(jsonLogs, null, 2), 'utf-8');
    logger.log(blue(indent(`JSON logs saved in ${green(output.jsonFile)}`, 2)));
    logger.printNewLine();
    logger.printNewLine();
  }

  return { workflows, parsedYaml: descriptionCopy };
}

async function runWorkflows(testDescription: TestDescription, options: AppOptions) {
  const harLogs = options?.harOutput && createHarLog();
  const apiClient = new ApiFetcher({
    harLogs,
  });

  const ctx = await createTestContext(testDescription, options, apiClient);

  const workflowsToRun = resolveRunningWorkflows(options.workflow);
  const workflowsToSkip = resolveRunningWorkflows(options.skip);

  const workflows = getWorkflowsToRun(ctx.workflows, workflowsToRun, workflowsToSkip);

  for (const workflow of workflows) {
    // run dependencies workflows first
    if (workflow.dependsOn?.length) {
      await handleDependsOn({ workflow, ctx });
    }

    await runWorkflow({
      workflowInput: workflow.workflowId,
      ctx,
    });
  }

  // json logs should be composed after all workflows are run
  const jsonLogs = options.jsonOutput ? composeJsonLogs(ctx) : undefined;

  return { ...ctx, harLogs, jsonLogs };
}

export async function runWorkflow({
  workflowInput,
  ctx,
  fromStepId,
  skipLineSeparator,
}: RunWorkflowInput): Promise<Workflow | void> {
  const workflowStartTime = performance.now();
  const fileBaseName = basename(ctx.options.workflowPath);
  const workflow =
    typeof workflowInput === 'string'
      ? ctx.workflows.find((w) => w.workflowId === workflowInput)
      : workflowInput;

  if (!workflow) {
    throw new Error(`\n ${blue('Workflow')} ${workflowInput} ${blue('not found')} \n`);
  }

  const workflowId = workflow.workflowId;

  printWorkflowSeparator(fileBaseName, workflowId, skipLineSeparator);

  const fromStepIndex = fromStepId
    ? workflow.steps.findIndex((step) => step.stepId === fromStepId)
    : 0;
  const workflowSteps = workflow.steps.slice(fromStepIndex);

  // clean $steps ctx before running workflow steps
  ctx.$steps = {};

  for (const step of workflowSteps) {
    try {
      const stepResults = await runStep({
        step,
        ctx,
        workflowId,
      });
      // When `end` action is used, we should not continue with the next steps
      if (stepResults?.shouldEnd) {
        break;
      }
    } catch (err: any) {
      const failedCall: Check = {
        name: CHECKS.UNEXPECTED_ERROR,
        message: err.message,
        pass: false,
        severity: ctx.severity['UNEXPECTED_ERROR'],
      };
      step.checks.push(failedCall);
      return;
    }
  }

  // workflow level outputs
  if (workflow.outputs && workflowId) {
    if (!ctx.$outputs) {
      ctx.$outputs = {};
    }
    if (!ctx.$outputs[workflowId]) {
      ctx.$outputs[workflowId] = {};
    }

    const runtimeExpressionContext = createRuntimeExpressionCtx({
      ctx: {
        ...ctx,
        $inputs: {
          ...(ctx.$inputs || {}),
          ...(ctx.$workflows[workflowId]?.inputs || {}),
        },
      },
      workflowId,
    });

    const outputs: Record<string, any> = {};
    for (const outputKey of Object.keys(workflow.outputs)) {
      try {
        outputs[outputKey] = evaluateRuntimeExpressionPayload({
          payload: workflow.outputs[outputKey],
          context: runtimeExpressionContext,
        });
      } catch (error: any) {
        throw new Error(
          `Failed to resolve output "${outputKey}" in workflow "${workflowId}": ${error.message}`
        );
      }
    }
    ctx.$outputs[workflowId] = outputs;
    ctx.$workflows[workflowId].outputs = outputs;
  }

  workflow.time = Math.ceil(performance.now() - workflowStartTime);
  logger.printNewLine();

  return workflow;
}

async function handleDependsOn({ workflow, ctx }: { workflow: Workflow; ctx: TestContext }) {
  if (!workflow.dependsOn?.length) return;

  const dependenciesWorkflows = await Promise.all(
    workflow.dependsOn.map(async (workflowId) => {
      const resolvedWorkflow = getValueFromContext(workflowId, ctx);
      const workflowCtx = await resolveWorkflowContext(workflowId, resolvedWorkflow, ctx);

      printRequiredWorkflowSeparator(workflow.workflowId);
      return runWorkflow({
        workflowInput: resolvedWorkflow,
        ctx: workflowCtx,
        skipLineSeparator: true,
      });
    })
  );

  if (dependenciesWorkflows.some((w) => !w)) {
    throw new Error('Dependent workflows failed');
  }

  const totals = calculateTotals(dependenciesWorkflows as Workflow[]);
  const hasProblems = totals.steps.failed > 0;

  if (hasProblems) {
    throw new Error('Dependent workflows has failed steps');
  }
}

export async function resolveWorkflowContext(
  workflowId: string | undefined,
  resolvedWorkflow: Workflow,
  ctx: TestContext
) {
  const sourceDescriptionId =
    workflowId && workflowId.startsWith('$sourceDescriptions.') && workflowId.split('.')[1];

  const testDescription = sourceDescriptionId && ctx.$sourceDescriptions[sourceDescriptionId];
  // executing external workflow should not mutate the original context
  // only outputs are transferred to the parent workflow
  // creating the new ctx for the external workflow or recreate current ctx for local workflow
  return testDescription
    ? await createTestContext(
        testDescription,
        {
          workflowPath: findSourceDescriptionUrl(
            sourceDescriptionId,
            ctx.sourceDescriptions,
            ctx.options
          ),
          workflow: [resolvedWorkflow.workflowId],
          skip: undefined,
          input: ctx.options.input || undefined,
          server: ctx.options.server || undefined,
          severity: ctx.options.severity || undefined,
          verbose: ctx.options.verbose || undefined,
        },
        ctx.apiClient
      )
    : await createTestContext(
        JSON.parse(JSON.stringify(ctx.testDescription)),
        JSON.parse(JSON.stringify(ctx.options)),
        ctx.apiClient
      );
}

function findSourceDescriptionUrl(
  sourceDescriptionId: string,
  sourceDescriptions: SourceDescription[] | undefined,
  options: AppOptions
) {
  const sourceDescription =
    sourceDescriptions && sourceDescriptions.find(({ name }) => name === sourceDescriptionId);

  if (!sourceDescription) {
    return '';
  } else if (sourceDescription.type === 'openapi') {
    return sourceDescription.url;
  } else if (sourceDescription.type === 'arazzo') {
    return resolve(dirname(options.workflowPath), sourceDescription.url);
  } else {
    throw new Error(
      `Unknown source description type ${(sourceDescription as SourceDescription).type}`
    );
  }
}
