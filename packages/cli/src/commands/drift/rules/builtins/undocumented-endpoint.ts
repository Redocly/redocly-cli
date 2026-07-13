import type { Finding, TrafficRule } from '../../types/index.js';

export class UndocumentedEndpointRule implements TrafficRule {
  public readonly id = 'undocumented-endpoint';

  public analyze(context: Parameters<TrafficRule['analyze']>[0]): Finding[] {
    if (context.matchedOperation) {
      return [];
    }

    const { method, path, host } = context.exchange.request;
    const isHostMismatch =
      context.matchMode === 'strict-host' && !context.hostCompatibleWithSpecServers;
    const message = isHostMismatch
      ? `Undocumented server: ${method} ${path} was sent to "${host}", which does not match any server in the description`
      : `Undocumented endpoint: ${method} ${path}`;

    return [
      {
        ruleId: this.id,
        severity: 'error',
        category: 'documentation',
        message,
        exchangeIndex: context.exchange.index,
        target: 'request',
      },
    ];
  }
}
