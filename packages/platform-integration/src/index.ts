export {
  getMostUrgentSunsetWarning,
  PlatformApi,
  PlatformApiClient,
  PlatformApiError,
  type PushPayload,
  type SunsetWarning,
} from './api/api-client.js';
export { getApiKey, getApiKeys, type ApiKeyTarget } from './api/api-keys.js';
export {
  getDomain,
  getPlatformUrl,
  isValidPlatformUrl,
  InvalidPlatformUrlError,
  PLATFORM_URLS,
} from './api/domains.js';
export type {
  DeploymentStatus,
  DeploymentStatusResponse,
  ProjectResponse,
  ProjectSourceResponse,
  PullRequestCheck,
  PullRequestResponse,
  PushResponse,
  PushStatusResponse,
  ScorecardItem,
  UpsertRemoteResponse,
} from './api/types.js';
export { RedoclyOAuthClient, type AuthFailure, type AuthState } from './auth/oauth-client.js';
export { getPlatformCredentials } from './auth/platform-credentials.js';
export { createAuthHeaders, type PlatformCredentials } from './api/auth-headers.js';
export { FileCredentialsStore, type CredentialsStore } from './auth/credentials-store.js';
export {
  buildProjectGitUrl,
  createPullRequest,
  getPullRequestStatus,
  parseProjectGitUrl,
  resolveHostedProject,
  resolveProjectIds,
  type CreatePullRequestOptions,
  type HostedProject,
  type HostedProjectOptions,
  type PullRequestStatus,
  type ResolvedHostedProject,
} from './hosted-project.js';
export {
  RedoclyOAuthDeviceFlow,
  type Credentials,
  type DeviceCode,
  type OpenBrowser,
} from './auth/device-flow.js';
export {
  collectFilesToPush,
  pushFiles,
  type FileToUpload,
  type PushOptions,
  type PushResult,
} from './push.js';
export {
  resolveProjectRef,
  type ProjectRef,
  type ProjectRefResolution,
  type ResolveProjectRefOptions,
} from './resolve-project-ref.js';
export {
  getPushStatus,
  waitForDeployment,
  type BuildType,
  type PushStatusOptions,
  type WaitForDeploymentOptions,
} from './push-status.js';
export {
  fetchRemoteScorecardAndPlugins,
  RemoteScorecardError,
  type FetchRemoteScorecardAndPluginsParams,
  type RemoteScorecardErrorReason,
} from './scorecard-classic/remote/fetch-scorecard.js';
export {
  getTarget,
  resolveConfigForTarget,
} from './scorecard-classic/targets-handler/targets-handler.js';
export type { RemoteScorecardAndPlugins, ScorecardProblem } from './scorecard-classic/types.js';
export { evaluatePluginsFromCode } from './scorecard-classic/validation/plugin-evaluator.js';
export { isAllowedScorecardProjectUrl } from './scorecard-classic/validation/project-url.js';
export {
  validateScorecard,
  type ScorecardValidationResult,
  type ValidateScorecardParams,
} from './scorecard-classic/validation/validate-scorecard.js';
