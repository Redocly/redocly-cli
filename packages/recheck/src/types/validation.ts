export interface ValidationError {
  message: string;
  path?: string;
  value?: unknown;
}
