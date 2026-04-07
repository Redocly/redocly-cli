import { isPlainObject } from '../../utils/is-plain-object.js';
import type { Arazzo1Rule } from '../../visitors.js';
import type { UserContext } from '../../walk.js';

export const OutputsDefined: Arazzo1Rule = () => {
  const definedWorkflowOutputs = new Map<string, string[]>();
  const definedStepOutputs = new Map<string, string[]>();

  // Store validation tasks to run after all outputs are collected
  const deferredValidationTasks: Array<() => void> = [];

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

  function checkRuntimeExpressions(value: unknown, ctx: UserContext, path: string[] = []) {
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
        definedStepOutputs,
      });
    } else if (isPlainObject(value) || Array.isArray(value)) {
      for (const [key, val] of Object.entries(value)) {
        checkRuntimeExpressions(val, ctx, [...path, key]);
      }
    }
  }

  return {
    Step: {
      enter(step, { report: _report, location: _location }: UserContext) {
        if (!step.outputs) return;
        definedStepOutputs.set(step.stepId, Object.keys(step.outputs));
      },
    },

    Workflow: {
      enter(workflow, { report: _report, location: _location }: UserContext) {
        if (!workflow.outputs) return;
        definedWorkflowOutputs.set(workflow.workflowId, Object.keys(workflow.outputs));
      },
    },

    Parameters: {
      enter(parameters, ctx: UserContext) {
        deferredValidationTasks.push(() => {
          checkRuntimeExpressions(parameters, ctx);
        });
      },
    },

    RequestBody: {
      enter(requestBody, ctx: UserContext) {
        deferredValidationTasks.push(() => {
          checkRuntimeExpressions(requestBody, ctx);
        });
      },
    },

    CriterionObject: {
      enter(criteria, ctx: UserContext) {
        deferredValidationTasks.push(() => {
          checkRuntimeExpressions(criteria.condition, ctx);
        });
      },
    },

    Outputs: {
      enter(outputs, ctx: UserContext) {
        deferredValidationTasks.push(() => {
          checkRuntimeExpressions(outputs, ctx);
        });
      },
    },

    ExtendedSecurity: {
      enter(extendedSecurity, ctx: UserContext) {
        deferredValidationTasks.push(() => {
          checkRuntimeExpressions(extendedSecurity, ctx);
        });
      },
    },

    ExtendedOperation: {
      enter(extendedOperation, ctx: UserContext) {
        deferredValidationTasks.push(() => {
          checkRuntimeExpressions(extendedOperation, ctx);
        });
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
