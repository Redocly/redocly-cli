import type { CollectFn, Config } from '@redocly/openapi-core';
import { blue, red } from 'colorette';
import { basename, dirname, resolve } from 'node:path';

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
  ExecutedStepsCount,
  Step,
} from '../../types.js';
import { ApiFetcher } from '../../utils/api-fetcher.js';
import { CHECKS } from '../checks/index.js';
import { resolveWorkflowReference } from '../context-parser/index.js';
import {
  printWorkflowSeparator,
  printRequiredWorkflowSeparator,
  printUnknownStep,
} from '../logger-output/helpers.js';
import { calculateTotals } from '../logger-output/index.js';
import { evaluateRuntimeExpressionPayload } from '../runtime-expressions/index.js';
import { createTestContext } from './context/create-test-context.js';
import { createRuntimeExpressionCtx, mergeWorkflowInputs } from './context/index.js';
import { bundleArazzo } from './get-test-description-from-file.js';
import { getWorkflowsToRun } from './get-workflows-to-run.js';
import { resolveRunningWorkflows } from './resolve-running-workflows.js';
import { runStep } from './run-step.js';

export async function runTestFile({
  options,
  collectSpecData,
  executedStepsCount,
}: {
  options: RunOptions;
  collectSpecData?: CollectFn;
  executedStepsCount: ExecutedStepsCount;
}) {
  const workflowOptions = {
    ...options,
    filePath: options.file,
    metadata: { ...options },
  };

  const bundledTestDescription = await bundleArazzo({
    filePath: options.file,
    collectSpecData,
    version: options?.version,
    logger: options.logger,
    externalRefResolver: options?.externalRefResolver,
    skipLint: options?.skipLint,
  });
  return await runWorkflows({
    testDescription: bundledTestDescription,
    options: workflowOptions,
    executedStepsCount,
  });
}

async function runWorkflows({
  testDescription,
  options,
  executedStepsCount,
}: {
  testDescription: TestDescription;
  options: AppOptions;
  executedStepsCount: ExecutedStepsCount;
}) {
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
      try {
        await handleDependsOn({ workflow, ctx, config: options.config, executedStepsCount });
      } catch (error) {
        if (!(error instanceof WorkflowDependencyError)) {
          throw error;
        }

        // an unresolvable or failed dependsOn dependency fails this workflow
        // but must not abort the remaining workflows and files
        const failureTime = performance.now();
        // a synthetic step to carry the failed check; it has no operation to call
        const failedStep = {
          stepId: 'dependsOn',
          checks: [
            {
              name: CHECKS.UNEXPECTED_ERROR,
              message: error.message,
              passed: false,
              severity: ctx.severity['UNEXPECTED_ERROR'],
            },
          ],
        } as Step;

        printWorkflowSeparator({
          fileName: basename(ctx.options.filePath),
          workflowName: workflow.workflowId,
          logger: options.logger,
        });
        printUnknownStep(failedStep, options.logger);

        executedWorkflows.push({
          type: 'workflow',
          workflowId: workflow.workflowId,
          startTime: failureTime,
          endTime: failureTime,
          totalTimeMs: 0,
          executedSteps: [failedStep],
          ctx,
          globalTimeoutError: false,
        });
        continue;
      }
    }

    const workflowExecutionResult = await runWorkflow({
      workflowInput: workflow.workflowId,
      ctx,
      executedStepsCount,
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
  executedStepsCount,
  retriesLeft,
}: RunWorkflowInput): Promise<WorkflowExecutionResult> {
  const { logger } = ctx.options;
  const workflowStartTime = performance.now();
  const fileBaseName = basename(ctx.options.filePath);
  const workflow =
    typeof workflowInput === 'string'
      ? ctx.workflows.find((w) => w.workflowId === workflowInput)
      : workflowInput;

  if (!workflow) {
    throw new Error(`\n ${blue('Workflow')} ${workflowInput} ${blue('not found')} \n`);
  }

  const workflowInputSchema = workflow.inputs;
  if (workflowInputSchema) {
    const inputs = ctx.$workflows[workflow.workflowId].inputs;

    ctx.$workflows[workflow.workflowId].inputs = mergeWorkflowInputs({
      inputs,
      workflowInputSchema,
      env: ctx.options.envVariables,
    });
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
        executedStepsCount,
        retriesLeft,
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
      ctx.executedSteps.push(step);
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
          ...ctx.$inputs,
          ...ctx.$workflows[workflowId]?.inputs,
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
    totalTimeMs: calculateWorkflowTotalTimeMs(ctx.executedSteps),
    executedSteps: ctx.executedSteps,
    ctx,
    globalTimeoutError: hasFailedTimeoutSteps,
  };
}

// Thrown when a dependsOn entry cannot be resolved to a workflow or a dependency
// workflow fails. Handled per workflow in runWorkflows so one broken dependency
// doesn't abort the rest of the run.
class WorkflowDependencyError extends Error {}

async function handleDependsOn({
  workflow,
  ctx,
  config,
  executedStepsCount,
}: {
  workflow: Workflow;
  ctx: TestContext;
  config: Config;
  executedStepsCount: ExecutedStepsCount;
}) {
  if (!workflow.dependsOn?.length) return;

  // resolve every reference before starting any dependency run, so one broken
  // reference cannot leave sibling dependency workflows running unawaited
  const resolvedDependencies = workflow.dependsOn.map((workflowId) => {
    const resolvedWorkflow = resolveWorkflowReference({ ref: workflowId, ctx });

    if (!resolvedWorkflow) {
      throw new WorkflowDependencyError(
        `Workflow ${red(workflowId)} from dependsOn of workflow ${red(
          workflow.workflowId
        )} is not found.`
      );
    }

    return { workflowId, resolvedWorkflow };
  });

  const dependenciesWorkflows = await Promise.all(
    resolvedDependencies.map(async ({ workflowId, resolvedWorkflow }) => {
      const workflowCtx = await resolveWorkflowContext(workflowId, resolvedWorkflow, ctx, config);

      printRequiredWorkflowSeparator(workflow.workflowId, ctx.options.logger);
      return runWorkflow({
        workflowInput: resolvedWorkflow,
        ctx: workflowCtx,
        skipLineSeparator: true,
        executedStepsCount,
      });
    })
  );

  const failedDependencies = dependenciesWorkflows
    .filter((dependencyWorkflow) => calculateTotals([dependencyWorkflow]).steps.failed > 0)
    .map((dependencyWorkflow) => dependencyWorkflow.workflowId);

  if (failedDependencies.length) {
    throw new WorkflowDependencyError(
      `Dependent workflows of workflow ${red(workflow.workflowId)} have failed steps: ${red(
        failedDependencies.join(', ')
      )}.`
    );
  }
}

export async function resolveWorkflowContext(
  workflowId: string | undefined,
  resolvedWorkflow: Workflow,
  ctx: TestContext,
  config: Config
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
          ...ctx.options,
          filePath: findSourceDescriptionUrl(
            sourceDescriptionId,
            ctx.sourceDescriptions,
            ctx.options
          ),
          workflow: [resolvedWorkflow.workflowId],
          skip: undefined,
          config,
        },
        ctx.apiClient
      )
    : {
        ...ctx,
        executedSteps: [],
      };
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
    return resolve(dirname(options.filePath), sourceDescription.url);
  } else {
    throw new Error(
      `Unknown source description type ${(sourceDescription as SourceDescription).type}`
    );
  }
}

function isWorkflowExecutionResult(
  step: Step | WorkflowExecutionResult
): step is WorkflowExecutionResult {
  return 'type' in step && step.type === 'workflow';
}

function calculateWorkflowTotalTimeMs(executedSteps: (Step | WorkflowExecutionResult)[]) {
  let totalTime = 0;

  for (const step of executedSteps) {
    if (isWorkflowExecutionResult(step)) {
      totalTime += step.totalTimeMs;
    } else {
      totalTime += step.response?.time || 0;
    }
  }

  return totalTime;
}
