export function addSecurityPrefix(security: any, componentsPrefix: string) {
  return componentsPrefix
    ? security?.map((s: any) => {
        const joinedSecuritySchema = {};
        for (const [key, value] of Object.entries(s)) {
          Object.assign(joinedSecuritySchema, { [componentsPrefix + '_' + key]: value });
        }
        return joinedSecuritySchema;
      })
    : security;
}
