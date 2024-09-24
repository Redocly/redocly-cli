declare module 'colorette' {
  const colorette: any;
  export const options: {
    enabled: boolean
  }
  export function black(text: string): string;
  export function red(text: string): string;
  export function green(text: string): string;
  export function yellow(text: string): string;
  export function blue(text: string): string;
  export function magenta(text: string): string;
  export function cyan(text: string): string;
  export function white(text: string): string;
  export function gray(text: string): string;

  export function bgBlack(text: string): string;
  export function bgRed(text: string): string;
  export function bgGreen(text: string): string;
  export function bgYellow(text: string): string;
  export function bgBlue(text: string): string;
  export function bgMagenta(text: string): string;
  export function bgCyan(text: string): string;
  export function bgWhite(text: string): string;

  export function dim(text: string): string;
  export function bold(text: string): string;
  export function hidden(text: string): string;
  export function italic(text: string): string;
  export function underline(text: string): string;
  export function strikethrough(text: string): string;
  export function reset(text: string): string;
  export function inverse(text: string): string;
  export default colorette;
}
