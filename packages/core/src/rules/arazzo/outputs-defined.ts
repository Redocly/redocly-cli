import { isPlainObject } from '../../utils/is-plain-object.js';
import type { Arazzo1Rule } from '../../visitors.js';
import type { UserContext } from '../../walk.js';

export const OutputsDefined: Arazzo1Rule = () => {
  const definedWorkflowOutputs = new Map<string, string[]>();
  // stepId is unique only within a workflow, so step outputs are kept per workflow
  const definedStepOutputsByWorkflow = new Map<string, Map<string, string[]>>();
  // Used for expressions outside a workflow, such as reusable components
  const definedStepOutputs = new Map<string, string[]>();
  let currentWorkflowId: string | undefined;

  // Store validation tasks to run after all outputs are collected
  const deferredValidationTasks: Array<() => void> = [];

  function deferCheck(value: unknown, ctx: UserContext) {
    const workflowId = currentWorkflowId;
    deferredValidationTasks.push(() => {
      const stepOutputs =
        workflowId === undefined
          ? definedStepOutputs
          : (definedStepOutputsByWorkflow.get(workflowId) ?? new Map<string, string[]>());
      checkRuntimeExpressions(value, ctx, stepOutputs);
    });
  }

  // Match $workflows.{id}.outputs.{key} pattern
  function matchWorkflowOutput({
    value,
    report,
    location,
    path,
    definedWorkflowOutputs,
  }: {
    value: string;
    report: UserContext['report'];
    location: UserContext['location'];
    path: string[];
    definedWorkflowOutputs: Map<string, string[]>;
  }) {
    const workflowOutputPattern = /\$workflows\.([^.\s]+)\.outputs\.([^.\s}\]#]+)/g;
    let match;

    while ((match = workflowOutputPattern.exec(value)) !== null) {
      const [fullMatch, workflowId, outputKey] = match;
      const definedKeys = definedWorkflowOutputs.get(workflowId);

      if (!definedKeys) {
        report({
          message: `Workflow "${workflowId}" referenced in runtime expression "${fullMatch}" is not defined or has no outputs.`,
          location: location.child(path),
        });
      } else if (!definedKeys.includes(outputKey)) {
        report({
          message: `Output key "${outputKey}" is not defined in workflow "${workflowId}". Available outputs: [ ${definedKeys.join(
            ', '
          )} ].`,
          location: location.child(path),
        });
      }
    }
  }

  // Match $steps.{id}.outputs.{key} pattern
  function matchStepOutput({
    value,
    report,
    location,
    path,
    definedStepOutputs,
  }: {
    value: string;
    report: UserContext['report'];
    location: UserContext['location'];
    path: string[];
    definedStepOutputs: Map<string, string[]>;
  }) {
    const stepOutputPattern = /\$steps\.([^.\s]+)\.outputs\.([^.\s}\]#]+)/g;
    let match;

    while ((match = stepOutputPattern.exec(value)) !== null) {
      const [fullMatch, stepId, outputKey] = match;
      const definedKeys = definedStepOutputs.get(stepId);

      if (!definedKeys) {
        report({
          message: `Step "${stepId}" referenced in runtime expression "${fullMatch}" is not defined or has no outputs.`,
          location: location.child(path),
        });
      } else if (!definedKeys.includes(outputKey)) {
        report({
          message: `Output key "${outputKey}" is not defined in step "${stepId}". Available outputs: [ ${definedKeys.join(
            ', '
          )} ].`,
          location: location.child(path),
        });
      }
    }
  }

  function checkRuntimeExpressions(
    value: unknown,
    ctx: UserContext,
    stepOutputs: Map<string, string[]>,
    path: string[] = []
  ) {
    if (typeof value === 'string') {
      matchWorkflowOutput({
        value,
        report: ctx.report,
        location: ctx.location,
        path,
        definedWorkflowOutputs,
      });
      matchStepOutput({
        value,
        report: ctx.report,
        location: ctx.location,
        path,
        definedStepOutputs: stepOutputs,
      });
    } else if (isPlainObject(value) || Array.isArray(value)) {
      for (const [key, val] of Object.entries(value)) {
        checkRuntimeExpressions(val, ctx, stepOutputs, [...path, key]);
      }
    }
  }

  return {
    Step: {
      enter(step, { report: _report, location: _location }: UserContext) {
        if (!step.outputs) return;
        const keys = Object.keys(step.outputs);
        definedStepOutputs.set(step.stepId, keys);
        if (currentWorkflowId !== undefined) {
          let stepOutputs = definedStepOutputsByWorkflow.get(currentWorkflowId);
          if (!stepOutputs) {
            stepOutputs = new Map<string, string[]>();
            definedStepOutputsByWorkflow.set(currentWorkflowId, stepOutputs);
          }
          stepOutputs.set(step.stepId, keys);
        }
      },
    },

    Workflow: {
      enter(workflow, { report: _report, location: _location }: UserContext) {
        currentWorkflowId = workflow.workflowId;
        if (!workflow.outputs) return;
        definedWorkflowOutputs.set(workflow.workflowId, Object.keys(workflow.outputs));
      },
      leave() {
        currentWorkflowId = undefined;
      },
    },

    Parameters: {
      enter(parameters, ctx: UserContext) {
        deferCheck(parameters, ctx);
      },
    },

    // success and failure action parameters, added in Arazzo 1.1
    ActionParameters: {
      enter(parameters, ctx: UserContext) {
        deferCheck(parameters, ctx);
      },
    },

    RequestBody: {
      enter(requestBody, ctx: UserContext) {
        deferCheck(requestBody, ctx);
      },
    },

    CriterionObject: {
      enter(criteria, ctx: UserContext) {
        deferCheck(criteria.condition, ctx);
      },
    },

    Outputs: {
      enter(outputs, ctx: UserContext) {
        deferCheck(outputs, ctx);
      },
    },

    ExtendedSecurity: {
      enter(extendedSecurity, ctx: UserContext) {
        deferCheck(extendedSecurity, ctx);
      },
    },

    ExtendedOperation: {
      enter(extendedOperation, ctx: UserContext) {
        deferCheck(extendedOperation, ctx);
      },
    },

    Root: {
      leave() {
        // Run all deferred validations after all outputs are collected
        for (const task of deferredValidationTasks) {
          task();
        }
      },
    },
  };
};
