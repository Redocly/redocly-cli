// Jest Snapshot v1, https://goo.gl/fbAQLP

exports[`E2E bundle operation-description-override-error 1`] = `

[WARNING] "max-problems" option is deprecated and will be removed in the next major release. 

bundling ./openapi.yaml...
openapi.yaml:
  23:7  error    operation-description-override  Failed to read markdown override file for operation "updatePet".
ENOENT: no such file or directory, open './update-pet-operation-description.md'

❌ Errors encountered while bundling ./openapi.yaml: bundle not created (use --force to ignore errors).

`;
