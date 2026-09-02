---
'@redocly/respect-core': patch
'@redocly/cli': patch
---

Fixed an issue where `$faker.string.email()` used without options generated addresses at the `undefined.com` domain.
