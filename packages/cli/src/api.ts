import type {
  PushOptions,
  PushResult,
  PushStatusOptions,
  PushStatusSummary,
} from './reunite/api/types.js';
import { handlePushStatus } from './reunite/commands/push-status.js';
import { handlePush } from './reunite/commands/push.js';

export type {
  CommitStatus,
  DeploymentStatus,
  DeploymentStatusResponse,
  PushOptions,
  PushResponse,
  PushResult,
  PushStatusBase,
  PushStatusOptions,
  PushStatusSummary,
  ScorecardItem,
} from './reunite/api/types.js';

export function push(options: PushOptions): Promise<PushResult | undefined> {
  return handlePush({ argv: options });
}

export function pushStatus(options: PushStatusOptions): Promise<PushStatusSummary> {
  return handlePushStatus({ argv: options });
}
