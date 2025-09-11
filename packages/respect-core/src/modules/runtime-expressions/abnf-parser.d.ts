export declare const parse: (input: string, options?: any) => any;
export declare class SyntaxError extends Error {
  message: string;
  expected: any;
  found: any;
  location: any;
  name: string;
}
export default {
  SyntaxError: SyntaxError,
  parse: typeof parse,
};
