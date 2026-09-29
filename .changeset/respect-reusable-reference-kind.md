---
'@redocly/cli': patch
'@redocly/respect-core': patch
---

Fixed an issue where `respect` ignored a Reusable Object that pointed to the wrong kind of component, such as a success action in `parameters`.
A parameter, success action, or failure action written as a reference must point to `$components.parameters`, `$components.successActions`, or `$components.failureActions` respectively.
**Note:** a step with such a reference now fails with an error instead of running without it.
