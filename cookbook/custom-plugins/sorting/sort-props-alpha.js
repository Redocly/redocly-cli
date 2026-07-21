export default function SortPropertiesAlphabetically() {
  console.log('re-ordering properties: alphabetical');
  return {
    Schema: {
      leave(schema) {
        if (schema.type == 'object') {
          const propList = Object.getOwnPropertyNames(schema.properties).sort();
          let newProps = {};

          propList.forEach((prop) => {
            newProps[prop] = schema.properties[prop];
          });

          schema.properties = newProps;
        }
      },
    },
  };
}
