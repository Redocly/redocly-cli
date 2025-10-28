export function validateMountPath(value: string) {
  if (!value || value === '/') {
    throw new Error(
      'Mount path cannot be empty or "/". Please use --mount-path option with a valid path.'
    );
  }
  return value;
}
