export type OrderDirection = 'asc' | 'desc';

export type OrderOptions = {
  direction: OrderDirection;
  property: string;
};

export function isOrdered(value: any[], options: OrderOptions | OrderDirection): boolean {
  const direction = (options as OrderOptions).direction || (options as OrderDirection);
  const property = (options as OrderOptions).property;
  for (let i = 1; i < value.length; i++) {
    let currValue = value[i];
    let prevVal = value[i - 1];

    if (property) {
      const currPropValue = value[i][property];
      const prevPropValue = value[i - 1][property];

      if (!currPropValue || !prevPropValue) {
        return false; // property doesn't exist, so collection is not ordered
      }

      currValue = currPropValue;
      prevVal = prevPropValue;
    }

    if (typeof currValue === 'string' && typeof prevVal === 'string') {
      currValue = currValue.toLowerCase();
      prevVal = prevVal.toLowerCase();
    }

    const result = direction === 'asc' ? currValue >= prevVal : currValue <= prevVal;
    if (!result) {
      return false;
    }
  }
  return true;
}
