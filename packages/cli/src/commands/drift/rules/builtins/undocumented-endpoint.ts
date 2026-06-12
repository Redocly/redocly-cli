import type { Finding, RulePlugin } from '../../types/index.js';

export class UndocumentedEndpointRule implements RulePlugin {
  public readonly id = 'undocumented-endpoint';

  public analyze(context: Parameters<RulePlugin['analyze']>[0]): Finding[] {
    if (context.matchedOperation) {
      return [];
    }

    return [
      {
        ruleId: this.id,
        severity: 'error',
        category: 'documentation',
        message: `Undocumented endpoint: ${context.exchange.request.method} ${context.exchange.request.path}`,
        exchangeIndex: context.exchange.index,
        target: 'request',
      },
    ];
  }
}
