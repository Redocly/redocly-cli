export default function RuleSortProps({ type }) {
  let sortType = 'alpha'; // default
  const supportedSortTypes = ['alpha', 'required'];
  if (type && supportedSortTypes.includes(type)) {
    sortType = type;
  }
  console.log(`check properties order (${sortType})`);
  return {
    Schema: {
      enter(schema, ctx) {
        if (schema.type == 'object') {
          const propList = Object.getOwnPropertyNames(schema.properties);

          if (sortType == 'required') {
            // exit early if there are no required properties
            let requiredList = [];
            if (!schema.required) {
              return;
            } else {
              requiredList = schema.required;
            }

            const notRequiredList = propList.filter((item) => !requiredList.includes(item));
            // if the notRequiredList is empty, everything was required, we can exit
            if (notRequiredList.length == 0) {
              return;
            }

            // loop through, if we find an optional field before a required one then report
            let required = true;
            let prevProp = '';
            let prevReq = true;
            propList.forEach((prop) => {
              const isReq = requiredList.includes(prop);
              // did we go from an optional field to a required one?
              if (isReq && !prevReq) {
                ctx.report({
                  message: `Unexpected property order, found required \`${prop}\` after optional \`${prevProp}\``,
                });
              }

              // need these to refer to on the next iteration
              prevReq = isReq;
              prevProp = prop;
            });
          } else {
            // alpha sort is default
            const sortedList = [...propList].sort();

            // use a loop so we can show exactly where the order failed for large objects
            let i = 0;

            while (i < propList.length) {
              if (sortedList[i] !== propList[i]) {
                ctx.report({
                  message: `Unexpected property order, found \`${propList[i]}\` but expected \`${sortedList[i]}\``,
                });
                return; // if one property is out of order, there might be many others, return to avoid noise
              }

              i++;
            }
          }
        }
      },
    },
  };
}
