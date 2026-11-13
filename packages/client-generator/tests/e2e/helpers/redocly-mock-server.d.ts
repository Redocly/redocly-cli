// Ambient declarations for @redocly/mock-server.
// The published package ships only a bundled dist/bin.js with no .d.ts files,
// so we describe just the subset of the public API the test harness uses.

declare module '@redocly/mock-server' {
  export interface MockServerRequest {
    readonly path: string;
    readonly method: string;
    readonly query?: string;
    readonly headers: Record<string, string>;
    getBody(): Promise<Buffer | undefined>;
  }

  export interface MockServerResponse {
    statusCode: number;
    headers?: Record<string, string>;
    body?: Buffer;
  }

  export type MockServerRequestHandler = (
    request: MockServerRequest
  ) => Promise<MockServerResponse>;

  export interface MockServerUserConfig {
    strictExamples?: boolean;
    errorIfForcedExampleNotFound?: boolean;
  }

  export function createMockServer(
    definitionInput: string | Record<string, unknown>,
    userConfig?: MockServerUserConfig
  ): Promise<MockServerRequestHandler>;
}
