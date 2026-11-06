import { mergeWorkflowInputs } from '../../../../modules/flow-runner/index.js';

describe('mergeWorkflowInputs', () => {
  const workflowInputSchema = {
    type: 'object',
    properties: {
      search: { type: 'string' },
      env: {
        type: 'object',
        required: ['CAFE_TOKEN'],
        properties: { CAFE_TOKEN: { type: 'string' } },
      },
    },
  };

  it('should report a required environment variable that is not set', () => {
    const onInvalidInputs = vi.fn();

    expect(
      mergeWorkflowInputs({
        inputs: { search: 'latte' },
        workflowInputSchema,
        env: { OTHER_VAR: 'ignored' },
        onInvalidInputs,
      })
    ).toEqual({ search: 'latte', env: {} });
    expect(onInvalidInputs).toHaveBeenCalledWith(
      "inputs/env must have required property 'CAFE_TOKEN'"
    );
  });

  it('should keep an env input when no environment variable is set', () => {
    const onInvalidInputs = vi.fn();

    expect(
      mergeWorkflowInputs({
        inputs: { env: { CAFE_TOKEN: 'from-cli' } },
        workflowInputSchema,
        env: {},
        onInvalidInputs,
      })
    ).toEqual({ env: { CAFE_TOKEN: 'from-cli' } });
    expect(onInvalidInputs).not.toHaveBeenCalled();
  });
});
