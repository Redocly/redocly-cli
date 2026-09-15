export class HandledError extends Error {}

// Is used to abort the flow of execution - will be catched in the command execution wrapper
export class AbortFlowError extends Error {}
