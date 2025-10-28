export function validateMountPath(value: string) {
  if (!value || value === '/') {
    throw new Error(
      'Mount path cannot be empty or root path. Please use --mount-path option with a valid path.'
    );
  }
  return value;
}
