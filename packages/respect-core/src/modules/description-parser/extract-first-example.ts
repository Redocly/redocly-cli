export function extractFirstExample(examples: Record<string, any> | undefined) {
  if (typeof examples !== 'object') return;
  const firstKey = Object.keys(examples)[0];

  return firstKey ? examples[firstKey]?.value : undefined;
}
