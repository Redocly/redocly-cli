---
'@redocly/cli': patch
---

Fixed an issue where the `bundle` command wrote the metadata file of `--metafile` with the data of the last API when it bundled several APIs.
The command only writes a metadata file when it bundles a single API.
