export function isTestFile(path: string, fileContent: any) {
  return /\.(yaml|yml|json)$/i.test(path) && !!fileContent.arazzo;
}
