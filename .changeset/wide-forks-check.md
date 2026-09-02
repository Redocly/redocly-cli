---
'@redocly/respect-core': patch
'@redocly/cli': patch
---

Updated `@faker-js/faker` to the `10.6.0` version to resolve the high severity advisory `GHSA-qxc2-j82w-r537`.
Fixed an issue where `$faker.string.email()` used without options generated addresses at the `undefined.com` domain.
