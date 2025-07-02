export function validatePositiveNumber(optionName: string, requireInteger = false) {
  return (arg: any) => {
    const num = Number(arg);
    if (isNaN(num) || num <= 0) {
      throw new Error(`${optionName} must be a positive number`);
    }
    if (requireInteger && !Number.isInteger(num)) {
      throw new Error(`${optionName} must be a positive integer`);
    }
    return num;
  };
}
