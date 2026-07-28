---
description: Remove AI-generated slop from the current branch's diff
---

Check the diff against main and remove all AI-generated slop introduced in this branch.

This includes:

- Extra comments that a human wouldn't add, or that are inconsistent with the rest of the file
- Extra defensive checks or try/catch blocks abnormal for that area of the codebase (especially in trusted/validated codepaths)
- Casts to `any` to work around type issues
- Any other style inconsistent with the surrounding file

Report at the end with a 1–3 sentence summary of what was changed.
