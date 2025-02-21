export function checkCircularRefsInSchema(schema: any): boolean {
  try {
    JSON.stringify(schema);
  } catch {
    return true;
  }

  return false;
}
