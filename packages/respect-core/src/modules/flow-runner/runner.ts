import { blue } from 'colorette';
import { getPath } from '../../utils/path.js';
import { ApiFetcher } from '../../utils/api-fetcher.js';
import { createTestContext } from './context/create-test-context.js';
import { getValueFromContext } from '../context-parser/index.js';
import { getWorkflowsToRun } from './get-workflows-to-run.js';
import { runStep } from './run-step.js';
import { printWorkflowSeparator, printRequiredWorkflowSeparator } from '../../utils/cli-outputs.js';
import { bundleArazzo } from './get-test-description-from-file.js';
import { CHECKS } from '../checks/index.js';
import { createRuntimeExpressionCtx } from './context/index.js';
import { evaluateRuntimeExpressionPayload } from '../runtime-expressions/index.js';
import { calculateTotals } from '../cli-output/index.js';
import { resolveRunningWorkflows } from './resolve-running-workflows.js';

import type { CollectFn, Config } from '@redocly/openapi-core';
import type {
  TestDescription,
  AppOptions,
  TestContext,
  RunOptions,
  Workflow,
  SourceDescription,
  Check,
  RunWorkflowInput,
  WorkflowExecutionResult,
} from '../../types.js';

export async function runTestFile(options: RunOptions, collectSpecData?: CollectFn) {
  const workflowOptions = {
    ...options,
    workflowPath: options.file, // filePath or documentPath
    metadata: { ...options },
  };

  const bundledTestDescription = await bundleArazzo({
    filePath: options.file,
    collectSpecData,
    version: options?.version,
    logger: options.logger,
    externalRefResolver: options?.externalRefResolver,
  });
  return await runWorkflows(bundledTestDescription, workflowOptions);
}

async function runWorkflows(testDescription: TestDescription, options: AppOptions) {
  const apiClient = new ApiFetcher({
    fetch: options.fetch,
  });

  const ctx = await createTestContext(testDescription, options, apiClient);

  const workflowsToRun = resolveRunningWorkflows(options.workflow);
  const workflowsToSkip = resolveRunningWorkflows(options.skip);

  const workflows = getWorkflowsToRun({
    workflows: ctx.workflows,
    workflowsToRun,
    workflowsToSkip,
    logger: ctx.options.logger,
  });

  const executedWorkflows: WorkflowExecutionResult[] = [];

  for (const workflow of workflows) {
    ctx.executedSteps = [];
    // run dependencies workflows first
    if (workflow.dependsOn?.length) {
      await handleDependsOn({ workflow, ctx, config: options.config });
    }

    const workflowExecutionResult = await runWorkflow({
      workflowInput: workflow.workflowId,
      ctx,
    });

    executedWorkflows.push(workflowExecutionResult);
  }

  return { ctx, executedWorkflows };
}

export async function runWorkflow({
  workflowInput,
  ctx,
  fromStepId,
  skipLineSeparator,
  parentStepId,
  invocationContext,
}: RunWorkflowInput): Promise<WorkflowExecutionResult> {
  const path = await getPath();
  const { logger } = ctx.options;
  const workflowStartTime = performance.now();
  const fileBaseName = path.basename(ctx.options.workflowPath);
  const workflow =
    typeof workflowInput === 'string'
      ? ctx.workflows.find((w) => w.workflowId === workflowInput)
      : workflowInput;

  if (!workflow) {
    throw new Error(`\n ${blue('Workflow')} ${workflowInput} ${blue('not found')} \n`);
  }

  const workflowId = workflow.workflowId;

  if (!fromStepId) {
    printWorkflowSeparator({
      fileName: fileBaseName,
      workflowName: workflowId,
      skipLineSeparator,
      logger,
    });
  }

  const fromStepIndex = fromStepId
    ? workflow.steps.findIndex((step) => step.stepId === fromStepId)
    : 0;

  const workflowSteps = workflow.steps.slice(fromStepIndex);

  // clean $steps ctx before running workflow steps
  ctx.$steps = {};

  for (const step of workflowSteps) {
    try {
      const stepResult = await runStep({
        step,
        ctx,
        workflowId,
      });

      // When `end` action is used, we should not continue with the next steps
      if (stepResult?.shouldEnd) {
        break;
      }
    } catch (err: any) {
      const failedCall: Check = {
        name: CHECKS.UNEXPECTED_ERROR,
        message: err.message,
        passed: false,
        severity: ctx.severity['UNEXPECTED_ERROR'],
      };
      step.checks.push(failedCall);
    }
  }

  const hasFailedTimeoutSteps = workflow.steps.some((step) =>
    step.checks?.some((check) => !check.passed && check.name == CHECKS.GLOBAL_TIMEOUT_ERROR)
  );

  // workflow level outputs
  if (workflow.outputs && workflowId && !hasFailedTimeoutSteps) {
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
          logger: ctx.options.logger,
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

  const endTime = performance.now();

  return {
    type: 'workflow',
    invocationContext,
    workflowId,
    stepId: parentStepId,
    startTime: workflowStartTime,
    endTime,
    totalTimeMs: Math.ceil(endTime - workflowStartTime),
    executedSteps: ctx.executedSteps,
    ctx,
    globalTimeoutError: hasFailedTimeoutSteps,
  };
}

async function handleDependsOn({
  workflow,
  ctx,
  config,
}: {
  workflow: Workflow;
  ctx: TestContext;
  config: Config;
}) {
  if (!workflow.dependsOn?.length) return;

  const dependenciesWorkflows = await Promise.all(
    workflow.dependsOn.map(async (workflowId) => {
      const resolvedWorkflow = getValueFromContext({
        value: workflowId,
        ctx,
        logger: ctx.options.logger,
      });
      const workflowCtx = await resolveWorkflowContext(workflowId, resolvedWorkflow, ctx, config);

      printRequiredWorkflowSeparator(workflow.workflowId, ctx.options.logger);
      return runWorkflow({
        workflowInput: resolvedWorkflow,
        ctx: workflowCtx,
        skipLineSeparator: true,
      });
    })
  );

  const totals = calculateTotals(dependenciesWorkflows);
  const hasProblems = totals.steps.failed > 0;

  if (hasProblems) {
    throw new Error('Dependent workflows has failed steps');
  }
}

export async function resolveWorkflowContext(
  workflowId: string | undefined,
  resolvedWorkflow: Workflow,
  ctx: TestContext,
  config: Config
) {
  const { logger } = ctx.options;
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
          workflowPath: await findSourceDescriptionUrl(
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
          maxSteps: ctx.options.maxSteps,
          maxFetchTimeout: ctx.options.maxFetchTimeout,
          executionTimeout: ctx.options.executionTimeout,
          config,
          requestFileLoader: ctx.requestFileLoader,
          envVariables: ctx.options.envVariables,
          logger,
          fetch: ctx.options.fetch,
        },
        ctx.apiClient
      )
    : {
        ...ctx,
        executedSteps: [],
      };
}

async function findSourceDescriptionUrl(
  sourceDescriptionId: string,
  sourceDescriptions: SourceDescription[] | undefined,
  options: AppOptions
) {
  const path = await getPath();
  const sourceDescription =
    sourceDescriptions && sourceDescriptions.find(({ name }) => name === sourceDescriptionId);

  if (!sourceDescription) {
    return '';
  } else if (sourceDescription.type === 'openapi') {
    return sourceDescription.url;
  } else if (sourceDescription.type === 'arazzo') {
    return path.resolve(path.dirname(options.workflowPath), sourceDescription.url);
  } else {
    throw new Error(
      `Unknown source description type ${(sourceDescription as SourceDescription).type}`
    );
  }
}
