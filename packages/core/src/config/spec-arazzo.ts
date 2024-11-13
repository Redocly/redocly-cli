import type { PluginStyleguideConfig } from './types';

const specArazzo: PluginStyleguideConfig<'built-in'> = {
  arazzo1Rules: {
    'parameters-not-in-body': 'error',
    'sourceDescription-type': 'error',
    'version-enum': 'error',
    'workflowId-unique': 'error',
    'stepId-unique': 'error',
    'sourceDescription-name-unique': 'error',
    'sourceDescriptions-not-empty': 'error',
    'workflow-dependsOn': 'error',
    'parameters-unique': 'error',
    'step-onSuccess-unique': 'error',
    'step-onFailure-unique': 'error',
    'requestBody-replacements-unique': 'error',
    'no-criteria-xpath': 'error',
    'no-actions-type-end': 'error',
    'criteria-unique': 'error',
  },
};

export default specArazzo;
