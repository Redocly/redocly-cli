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

  function checkRuntimeExpressions(
    value: unknown,
    report: UserContext['report'],
    location: UserContext['location'],
    path: string[] = []
  ) {
    if (typeof value === 'string') {
      matchWorkflowOutput({ value, report, location, path, definedWorkflowOutputs });
      matchStepOutput({ value, report, location, path, definedStepOutputs });
    } else if (isPlainObject(value)) {
      for (const [key, val] of Object.entries(value)) {
        checkRuntimeExpressions(val, report, location, [...path, key]);
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
      enter(parameters, { report, location }: UserContext) {
        if (!parameters) return;
        deferredValidationTasks.push(() => {
          checkRuntimeExpressions(parameters, report, location);
        });
      },
    },

    RequestBody: {
      enter(requestBody, { report, location }: UserContext) {
        if (!requestBody) return;
        deferredValidationTasks.push(() => {
          checkRuntimeExpressions(requestBody, report, location);
        });
      },
    },

    CriterionObject: {
      enter(criteria, { report, location }: UserContext) {
        if (!criteria.condition) return;
        deferredValidationTasks.push(() => {
          checkRuntimeExpressions(criteria.condition, report, location);
        });
      },
    },

    Outputs: {
      enter(outputs, { report, location }: UserContext) {
        if (!outputs) return;
        deferredValidationTasks.push(() => {
          checkRuntimeExpressions(outputs, report, location);
        });
      },
    },

    ExtendedSecurity: {
      enter(extendedSecurity, { report, location }: UserContext) {
        if (!extendedSecurity) return;
        deferredValidationTasks.push(() => {
          checkRuntimeExpressions(extendedSecurity, report, location);
        });
      },
    },

    ExtendedOperation: {
      enter(extendedOperation, { report, location }: UserContext) {
        if (!extendedOperation) return;
        deferredValidationTasks.push(() => {
          checkRuntimeExpressions(extendedOperation, report, location);
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
