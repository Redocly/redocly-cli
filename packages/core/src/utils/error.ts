// Standard error when exiting with a known issue
export class HandledError extends Error {}

// Aborts the flow of execution. Caught in the command execution wrapper.
export class AbortFlowError extends Error {}
