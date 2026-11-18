---
'@redocly/platform-integration': minor
---

Added the `reason` of a failed `fetchRemoteScorecardAndPlugins` call: the error is a `RemoteScorecardError` that tells apart no access to the project, a project that is not found, a project without a scorecard, and a platform that is not reachable.
