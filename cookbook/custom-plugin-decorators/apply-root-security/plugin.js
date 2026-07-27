import { applyRootSecurity } from './decorator.js';

export default function plugin() {
  return {
    id: 'security-plugin',
    decorators: {
      oas3: { 'apply-root-security': applyRootSecurity },
    },
  };
}
