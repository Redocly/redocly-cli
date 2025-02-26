import { generateWorkflowSecurityInputs } from '../../arazzo-description-generator';

describe('generateWorkflowSecurityInputs', () => {
  it('should return undefined if there are no security requirements', () => {
    const inputsComponents = {};
    const security = [] as any[];
    const result = generateWorkflowSecurityInputs(inputsComponents, security);
    expect(result).toBeUndefined();
  });

  it('should return the correct workflow security inputs reference', () => {
    const inputsComponents = {
      inputs: {
        basicAuth: {
          type: 'object',
        },
        bearerAuth: {
          type: 'string',
        },
      },
    };
    const security = [{ basicAuth: [] }];
    const result = generateWorkflowSecurityInputs(inputsComponents, security);
    expect(result).toEqual({
      $ref: '#/components/inputs/basicAuth',
    });
  });

  it('should return undefined if the security requirement is not found in the inputs components', () => {
    const inputsComponents = {
      inputs: {
        basicAuth: {
          type: 'object',
        },
        bearerAuth: {
          type: 'string',
        },
      },
    };
    const security = [{ apiKey: [] }];
    const result = generateWorkflowSecurityInputs(inputsComponents, security);
    expect(result).toBeUndefined();
  });
});
