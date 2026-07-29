import { type TestContext } from '../../../types.js';
import { resolveWorkflowReference } from '../../context-parser/index.js';

describe('resolveWorkflowReference', () => {
  const externalWorkflow = {
    workflowId: 'externalWorkflow',
    steps: [],
  };
  const localWorkflow = {
    workflowId: 'localWorkflow',
    steps: [],
  };
  const ctx = {
    workflows: [localWorkflow],
    $sourceDescriptions: {
      externalApi: {
        info: { title: 'External API' },
        workflows: [externalWorkflow],
      },
      openapiSource: {
        paths: {},
        servers: [{ url: 'https://api.example.com' }],
      },
    },
  } as unknown as TestContext;

  it('should resolve a local workflow by its workflowId', () => {
    expect(resolveWorkflowReference({ ref: 'localWorkflow', ctx })).toEqual(localWorkflow);
  });

  it('should resolve the `$sourceDescriptions.<name>.<workflowId>` spec form', () => {
    expect(
      resolveWorkflowReference({ ref: '$sourceDescriptions.externalApi.externalWorkflow', ctx })
    ).toEqual(externalWorkflow);
  });

  it('should resolve the legacy `$sourceDescriptions.<name>.workflows.<workflowId>` form', () => {
    expect(
      resolveWorkflowReference({
        ref: '$sourceDescriptions.externalApi.workflows.externalWorkflow',
        ctx,
      })
    ).toEqual(externalWorkflow);
  });

  it('should return undefined for an unknown local workflowId', () => {
    expect(resolveWorkflowReference({ ref: 'unknownWorkflow', ctx })).toBeUndefined();
  });

  it('should return undefined when the source description does not exist', () => {
    expect(
      resolveWorkflowReference({ ref: '$sourceDescriptions.unknownApi.externalWorkflow', ctx })
    ).toBeUndefined();
  });

  it('should return undefined when the workflow does not exist in the source description', () => {
    expect(
      resolveWorkflowReference({ ref: '$sourceDescriptions.externalApi.unknownWorkflow', ctx })
    ).toBeUndefined();
  });

  it('should return undefined when the reference matches a document field instead of a workflow', () => {
    expect(
      resolveWorkflowReference({ ref: '$sourceDescriptions.externalApi.info', ctx })
    ).toBeUndefined();
  });

  it('should return undefined when the source description has no workflows', () => {
    expect(
      resolveWorkflowReference({ ref: '$sourceDescriptions.openapiSource.someWorkflow', ctx })
    ).toBeUndefined();
  });

  it('should return undefined for a malformed reference', () => {
    expect(
      resolveWorkflowReference({ ref: '$sourceDescriptions.externalApi', ctx })
    ).toBeUndefined();
  });

  it('should return undefined for a legacy form reference with extra segments after the workflowId', () => {
    expect(
      resolveWorkflowReference({
        ref: '$sourceDescriptions.externalApi.workflows.externalWorkflow.steps',
        ctx,
      })
    ).toBeUndefined();
  });

  it('should return undefined for other runtime expressions', () => {
    expect(resolveWorkflowReference({ ref: '$inputs.someInput', ctx })).toBeUndefined();
  });

  it('should return undefined for an undefined reference', () => {
    expect(resolveWorkflowReference({ ref: undefined, ctx })).toBeUndefined();
  });
});
