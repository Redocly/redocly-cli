export const GRAPHQL_EXTENSIONS = ['.graphql', '.gql'];

export function isGraphqlRef(ref: string): boolean {
  const lowerCasedRef = ref.toLowerCase();
  return GRAPHQL_EXTENSIONS.some((ext) => lowerCasedRef.endsWith(ext));
}
