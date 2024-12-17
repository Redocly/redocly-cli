import type { PluginStyleguideConfig } from './types';

const spec: PluginStyleguideConfig<'built-in'> = {
  rules: {
    struct: 'error',
  },
  // TODO: populate with spec-related rules similar to `arazzo1Rules`
  oas2Rules: {},
  oas3_0Rules: {},
  oas3_1Rules: {},
  async2Rules: {},
  async3Rules: {},
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
    'criteria-unique': 'error',
  },
};

export default spec;
