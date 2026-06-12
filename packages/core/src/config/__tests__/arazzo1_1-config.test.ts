import { createConfig } from '../index.js';

describe('arazzo1_1 config', () => {
  it('exposes severity settings for arazzo1_1 docs from common rules and arazzo1_1Rules', async () => {
    const config = await createConfig({
      rules: { struct: 'error' },
      arazzo1_1Rules: { 'workflowId-unique': 'error' },
    });
    expect(config.rules.arazzo1_1).toMatchObject({
      struct: 'error',
      'workflowId-unique': 'error',
    });
  });

  it('includes arazzo1_1Rules in the recommended preset', async () => {
    const config = await createConfig({ extends: ['recommended'] });
    expect(config.rules.arazzo1_1['workflowId-unique']).toEqual('error');
  });
});
