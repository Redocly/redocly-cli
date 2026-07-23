export default function SortPropertiesRequiredFirst() {
  console.log('re-ordering properties: required first');
  return {
    Schema: {
      leave(schema) {
        if (schema.type == 'object' && schema.properties) {
          const propList = Object.getOwnPropertyNames(schema.properties);
          let newProps = {};

          if (schema.required && schema.required.length > 0) {
            const requiredList = schema.required;
            // put the required items in first
            requiredList.forEach((prop) => {
              if (Object.hasOwn(schema.properties, prop)) {
                newProps[prop] = schema.properties[prop];
              }
            });

            // now add anything that wasn't already added
            propList.forEach((prop) => {
              if (!Object.hasOwn(newProps, prop)) {
                newProps[prop] = schema.properties[prop];
              }
            });
            schema.properties = newProps;
          }
        }
      },
    },
  };
}
