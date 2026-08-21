import { buildHotspotAgentPrompt } from '../suggestions.js';
import type { HotspotOperation } from '../types.js';

function makeHotspot(overrides: Partial<HotspotOperation> = {}): HotspotOperation {
  return {
    path: '/widgets',
    method: 'post',
    operationId: 'createWidget',
    agentReadinessScore: 42.5,
    reasons: ['High parameter count (9)', 'Missing operation description'],
    issues: [
      { code: 'high_parameter_count', message: 'High parameter count (9)' },
      { code: 'missing_operation_description', message: 'Missing operation description' },
    ],
    ...overrides,
  };
}

describe('buildHotspotAgentPrompt', () => {
  it('includes document path, operation label, reasons, and focus guidance', () => {
    const prompt = buildHotspotAgentPrompt('openapi/widgets.yaml', makeHotspot());
    expect(prompt).toContain('openapi/widgets.yaml');
    expect(prompt).toContain('POST /widgets');
    expect(prompt).toContain('operationId: createWidget');
    expect(prompt).toContain('High parameter count (9)');
    expect(prompt).toContain('Missing operation description');
    expect(prompt).toContain('Reduce or consolidate parameters');
    expect(prompt).toContain('Add a concise `description`');
    expect(prompt).toContain('42.5/100');
  });

  it('omits operationId clause when absent', () => {
    const prompt = buildHotspotAgentPrompt(
      'api.yaml',
      makeHotspot({
        operationId: undefined,
        method: 'get',
        reasons: ['Missing response examples'],
        issues: [{ code: 'missing_response_examples', message: 'Missing response examples' }],
      })
    );
    expect(prompt).toContain('GET /widgets');
    expect(prompt).not.toContain('operationId:');
    expect(prompt).toContain('example` or `examples`');
  });
});
