# Where the index pays and where the description already is one — every run

{% admonition type="info" name="Build" %}
Measured on a build of PR #3005 at `0203f1081`, five runs a cell for every model.
The grid moves to a published snapshot once one carries this build.
{% /admonition %}

This is the long form of [Where the index pays](./tree-agent-index-benchmark-v3.md): every run, every command, every verdict.
Read the short version first — this page exists to check it.

The [second benchmark](./tree-agent-index-benchmark-v2.md) asked whether the flow an agent produces would actually run, over three descriptions that were all one file.
This one adds five task-description pairs chosen to be hard in new ways — Stripe, whose schemas are enormous; PayPal Orders, small but dense with approval steps and id chains; DigitalOcean, which ships as 2,909 files with one operation each — and, for two of them, a second task asking about a corner of the same file that no tutorial covers, so that what a model remembers can be told apart from what it reads.

Eight description-task pairs, three models, two conditions, five runs a cell — 240 runs:

- **no tree** — the task and the path to the description. Neither `tree` nor Redocly is named.
- **tree** — the same task plus two lines: the CLI is installed, and `redocly tree --help` lists what it can select.

Every context and cost cell is the median of the runs in it whose flow works; a cell marked ❌ is one where none did, and its numbers are the median of all its runs.
A difference is printed only where both sides carry the same mark.

## The head-to-heads

{% tabs %}

{% tab label="GitHub REST" %}

**Description:** 9.52 MB in one file.

**Task:** a CI job that publishes a release, attaches the built zip, and can take that file back down, authenticating as a GitHub App installation.
Expected: `POST /app/installations/{id}/access_tokens` → `POST /releases` → the asset upload → `DELETE /releases/assets/{asset_id}`.
Traps: the upload overrides its server to `https://uploads.github.com`, and the delete is keyed by asset, not release.

{% tabs %}
{% tab label="Prompt: no tree" %}

```text
I want a CI job that publishes a release for a repository, attaches the built zip to it,
and can take that file back down if the upload turns out wrong. Work out what it calls.
The CI authenticates as a GitHub App installation.

API description: github-api.yaml

Give me a working flow as JSON in your reply: the steps in order, what each one calls, what it
needs, and what to carry from its response into the next step. It has to work as written.
```

{% /tab %}
{% tab label="Prompt: tree" %}

```text
I want a CI job that publishes a release for a repository, attaches the built zip to it,
and can take that file back down if the upload turns out wrong. Work out what it calls.
The CI authenticates as a GitHub App installation.

API description: github-api.yaml

The Redocly CLI is installed and its `tree` command can search the description for you.
Start with `redocly tree --help` to see what it can select, then work with `--format=ai`:
redocly tree github-api.yaml --format=ai <flags>

Give me a working flow as JSON in your reply: the steps in order, what each one calls, what it
needs, and what to carry from its response into the next step. It has to work as written.
```

{% /tab %}
{% /tabs %}

Context the run added, and the tool calls it took (medians over the working runs):

| Model           |     no tree |         tree | Difference |
| --------------- | ----------: | -----------: | ---------: |
| Sonnet 5 (n=5)  | 12,492 / 12 |   11,336 / 9 |        −9% |
| Opus 5 (n=5)    | 16,870 / 11 |  14,681 / 11 |       −13% |
| Haiku 4.5 (n=5) | 13,058 / 11 | 6,880 / 7 ❌ |          — |

What those runs were billed:

| Model           | no tree |     tree | Difference |
| --------------- | ------: | -------: | ---------: |
| Sonnet 5 (n=5)  |   $0.39 |    $0.33 |       −15% |
| Opus 5 (n=5)    |   $0.63 |    $0.60 |        −5% |
| Haiku 4.5 (n=5) |   $0.12 | $0.07 ❌ |          — |

Whether each run produced a flow that would run:

| Run               | no tree                       | tree         |
| ----------------- | ----------------------------- | ------------ |
| Sonnet 5 · run 1  | works                         | works        |
| Sonnet 5 · run 2  | works                         | works        |
| Sonnet 5 · run 3  | works                         | works        |
| Sonnet 5 · run 4  | works                         | works        |
| Sonnet 5 · run 5  | works                         | works        |
| Opus 5 · run 1    | works                         | works        |
| Opus 5 · run 2    | works                         | works        |
| Opus 5 · run 3    | works                         | works        |
| Opus 5 · run 4    | works                         | works        |
| Opus 5 · run 5    | works                         | works        |
| Haiku 4.5 · run 1 | no app token, no asset delete | no app token |
| Haiku 4.5 · run 2 | no app token                  | no app token |
| Haiku 4.5 · run 3 | no app token                  | no app token |
| Haiku 4.5 · run 4 | no app token                  | no app token |
| Haiku 4.5 · run 5 | works                         | no app token |

A run works when its flow contains the installation token call, `POST /releases`, the asset upload sent to `uploads.github.com`, and the delete keyed by asset id.

What each run ran:

{% tabs %}
{% tab label="Sonnet 5" %}

{% tabs %}
{% tab label="Sonnet 5 · run 1 · no tree" %}

```bash
wc -l github-api.yaml
grep -n "operationId: repos/(create-release|upload-release-asset|delete-release-asset|get-release)" github-api.yaml
grep -n "operationId: apps/create-installation-access-token" github-api.yaml
sed -n '3390,3490p' github-api.yaml
sed -n '53280,53980p' github-api.yaml
grep -n "installation-token:" github-api.yaml
sed -n '87440,87480p' github-api.yaml
```

{% /tab %}
{% tab label="Sonnet 5 · run 1 · tree" %}

```bash
redocly tree --help
ls **/github-api.yaml
redocly tree github-api.yaml --format=ai --find "release" | head -200
redocly tree github-api.yaml --format=ai --find "installation access token" | head -100
redocly tree github-api.yaml --format=ai --find "upload release asset" | head -50
redocly tree github-api.yaml --format=ai --operation=post --path=/app/installations/{installation_id}/access_tokens --with-deps | head -150
redocly tree github-api.yaml --format=ai --operation=post --path=/repos/{owner}/{repo}/releases --with-deps | head -100
redocly tree github-api.yaml --format=ai --operation=post --path=/repos/{owner}/{repo}/releases/{release_id}/assets --with-deps | head -100
redocly tree github-api.yaml --format=ai --operation=delete --path=/repos/{owner}/{repo}/releases/assets/{asset_id} --with-deps | head -60
```

{% /tab %}
{% tab label="Sonnet 5 · run 2 · no tree" %}

```bash
wc -l github-api.yaml
grep "operationId: repos/create-release|operationId: repos/upload-release-asset|operationId: repos/delete-release-asset|operationId:.*installation.*access.*token|operationId: apps/create-installation-access-token" github-api.yaml
sed -n '3380,3480p' github-api.yaml
grep -n "installation-token:" -A 30 github-api.yaml | head -40
sed -n '53230,53420p' github-api.yaml
grep -n "^    release:" github-api.yaml | head -5
sed -n '90926,91010p' github-api.yaml
sed -n '53480,53560p' github-api.yaml
sed -n '53870,53980p' github-api.yaml
grep -n "^    release-asset:" github-api.yaml | head -3
grep -n "asset-id:" github-api.yaml | head -3
grep -n "^  securitySchemes:" -A 30 github-api.yaml | head -40
sed -n '90866,90926p' github-api.yaml
sed -n '260610,260625p' github-api.yaml
grep -n "securitySchemes" github-api.yaml
sed -n '1,60p' github-api.yaml | grep -n "security"
sed -n '53420,53480p' github-api.yaml
mkdir -p "/private/tmp/claude-501/-Users-tora-bench-run-github-api-control-v3-sonnet-r2/1c5d26d8-ce49-4313-95ff-9e604cc569ed/scratchpad"
```

{% /tab %}
{% tab label="Sonnet 5 · run 2 · tree" %}

```bash
redocly tree --help
redocly tree github-api.yaml --format=ai --find=release
redocly tree github-api.yaml --format=ai --find="upload asset"
redocly tree github-api.yaml --format=ai --path=/repos/{owner}/{repo}/releases --operation=post --with-deps
redocly tree github-api.yaml --format=ai --path=/repos/{owner}/{repo}/releases/{release_id}/assets --operation=post --with-deps
redocly tree github-api.yaml --format=ai --path=/repos/{owner}/{repo}/releases/assets/{asset_id} --operation=delete --with-deps
redocly tree github-api.yaml --format=ai --find="installation access token"
redocly tree github-api.yaml --format=ai --path=/app/installations/{installation_id}/access_tokens --operation=post --with-deps
redocly tree github-api.yaml --format=ai --find="app-jwt" | head -20; echo "---"; redocly tree github-api.yaml --format=ai --find="bearer" | head -10
Artifact
```

{% /tab %}
{% tab label="Sonnet 5 · run 3 · no tree" %}

```bash
wc -l github-api.yaml
grep -n "operationId: (apps/create-installation-access-token|repos/create-release|repos/upload-release-asset|repos/delete-release-asset|repos/get-release)" github-api.yaml
sed -n '3380,3480p' github-api.yaml
sed -n '53260,53500p' github-api.yaml
sed -n '53500,53580p' github-api.yaml
sed -n '53870,53970p' github-api.yaml
grep -n "^    installation-token:" github-api.yaml
grep -n "^    release:$" github-api.yaml
Artifact
```

{% /tab %}
{% tab label="Sonnet 5 · run 3 · tree" %}

```bash
redocly tree --help
redocly tree github-api.yaml --format=ai --find="release" | head -100
redocly tree github-api.yaml --format=ai --find="upload release asset" | head -60
redocly tree github-api.yaml --format=ai --path="/repos/{owner}/{repo}/releases" --operation=post --with-deps | head -200
redocly tree github-api.yaml --format=ai --path="/repos/{owner}/{repo}/releases/{release_id}/assets" --operation=post --with-deps | head -150
redocly tree github-api.yaml --format=ai --path="/repos/{owner}/{repo}/releases/assets/{asset_id}" --operation=delete --with-deps | head -100
redocly tree github-api.yaml --format=ai --find="installation access token" | head -40
redocly tree github-api.yaml --format=ai --path="/app/installations/{installation_id}/access_tokens" --operation=post --with-deps | head -150
```

{% /tab %}
{% tab label="Sonnet 5 · run 4 · no tree" %}

```bash
wc -l github-api.yaml
grep "operationId: (apps/create-installation-access-token|repos/create-release|repos/upload-release-asset|repos/delete-release-asset|apps/create-installation-access-token|apps/get-installation)" github-api.yaml
sed -n '3380,3500p' github-api.yaml
sed -n '53300,53560p' github-api.yaml
sed -n '53870,53970p' github-api.yaml
grep -n "installation-token:" -A 15 github-api.yaml | head -30
grep -n "^    release:" -A 40 github-api.yaml | grep -E "^\s*(id|upload_url|html_url):"
grep -n "^    release:$" github-api.yaml
sed -n '90926,90996p' github-api.yaml
grep -n "^    release-asset:$" github-api.yaml
sed -n '90866,90906p' github-api.yaml
Artifact
```

{% /tab %}
{% tab label="Sonnet 5 · run 4 · tree" %}

```bash
redocly tree --help
redocly tree github-api.yaml --format=ai --find "release"
redocly tree github-api.yaml --format=ai --find "upload release asset"
redocly tree github-api.yaml --format=ai --path=/repos/{owner}/{repo}/releases --operation=post --with-deps
redocly tree github-api.yaml --format=ai --path=/repos/{owner}/{repo}/releases/{release_id}/assets --operation=post --with-deps
redocly tree github-api.yaml --format=ai --path=/repos/{owner}/{repo}/releases/assets/{asset_id} --operation=delete --with-deps
redocly tree github-api.yaml --format=ai --find "installation access token"
redocly tree github-api.yaml --format=ai --path=/app/installations/{installation_id}/access_tokens --operation=post --with-deps
redocly tree github-api.yaml --format=ai --component=examples --name=installation-token
```

{% /tab %}
{% tab label="Sonnet 5 · run 5 · no tree" %}

```bash
grep -i "operationId: .*(installation|release)" github-api.yaml
sed -n '3420,3510p' github-api.yaml
grep -n "installation-token:" github-api.yaml
grep -n "installation-token" github-api.yaml
grep -n "^    installation-token:" github-api.yaml
sed -n '87440,87480p' github-api.yaml
sed -n '53325,53455p' github-api.yaml
sed -n '53870,53970p' github-api.yaml
sed -n '53524,53554p' github-api.yaml
grep -n "^    release-asset:" github-api.yaml
sed -n '90866,90896p' github-api.yaml
# write /private/tmp/claude-501/-Users-tora-bench-run-github-api-control-v3-sonnet-r5/397612fd-e244-47b7-83a5-3fd6dfe24c65/scratchpad/release-flow.json
```

{% /tab %}
{% tab label="Sonnet 5 · run 5 · tree" %}

```bash
redocly tree --help
find . -maxdepth 3 -iname "github-api.yaml" 2>/dev/null; ls
redocly tree github-api.yaml --format=ai --find "release asset" | head -100
redocly tree github-api.yaml --format=ai --find "create a release" | head -50
redocly tree github-api.yaml --format=ai --operation=repos/create-release --with-deps | head -200
redocly tree github-api.yaml --format=ai --operation=repos/upload-release-asset --with-deps | head -150
redocly tree github-api.yaml --format=ai --operation=repos/delete-release-asset --with-deps | head -100
redocly tree github-api.yaml --format=ai --component=securitySchemes | head -50
redocly tree github-api.yaml --format=ai --file=github-api.yaml | head -30
grep -n "^security:" -A5 github-api.yaml | head -20
grep -n "bearerAuth\|securitySchemes\|installation" github-api.yaml | head -20
redocly tree github-api.yaml --format=ai --operation=apps/create-installation-access-token --with-deps | head -150
```

{% /tab %}
{% /tabs %}

{% /tab %}
{% tab label="Opus 5" %}

{% tabs %}
{% tab label="Opus 5 · run 1 · no tree" %}

```bash
wc -l github-api.yaml
grep -n "^  /.*releases|^  /.*assets|^  /app/installations|access_tokens" github-api.yaml
grep -n "releases" github-api.yaml | head -60
grep -n "^  '/repos/{owner}/{repo}/releases" github-api.yaml; grep -n "^  '/repos/{owner}/{repo}/releases/assets" github-api.yaml
sed -n '53272,53552p' github-api.yaml
sed -n '53843,53963p' github-api.yaml
sed -n '3419,3509p' github-api.yaml
grep -n "^  '/repos/{owner}/{repo}/installation'" github-api.yaml; sed -n '45238,45272p' github-api.yaml; grep -n "    contents:" -A6 github-api.yaml | grep -n "releases" | head
sed -n '45809,45850p' github-api.yaml; echo ---; sed -n '86275,86300p' github-api.yaml; echo ---WORKFLOWS; grep -n "        workflows:" -A6 github-api.yaml | head -20
cd /Users/tora/Desktop/Projects/tree-bench-kit-v2/specs; grep -n "    installation-token:" -A20 github-api.yaml | head -30; echo ---ASSET; grep -n "^    release-asset:" -A40 github-api.yaml | head -50; echo ---PARAMS; grep -n "^    asset-id:" -A8 github-api.yaml; grep -n "^    release-id:" -A8 github-api.yaml
sed -n '53730,53800p' github-api.yaml
```

{% /tab %}
{% tab label="Opus 5 · run 1 · tree" %}

```bash
redocly tree --help; ls
redocly tree github-api.yaml --format=ai --find "release" | head -60
redocly tree github-api.yaml --format=ai --find "upload release asset" | head -30; echo ===; redocly tree github-api.yaml --format=ai --find "installation access token" | head -20
redocly tree github-api.yaml --format=ai --find "installation access token" | head -20
cd /Users/tora/bench-run/github-api-tree-help-local-opus-r1; redocly tree github-api.yaml --format=ai --operation=apps/create-installation-access-token --with-deps | head -120
cd /Users/tora/bench-run/github-api-tree-help-local-opus-r1; redocly tree github-api.yaml --format=ai --operation=repos/create-release | head -40
cd /Users/tora/bench-run/github-api-tree-help-local-opus-r1; redocly tree github-api.yaml --format=ai --operation=repos/upload-release-asset | head -40; echo "=== DELETE ASSET"; redocly tree github-api.yaml --format=ai --operation=repos/delete-release-asset | head -20
cd /Users/tora/bench-run/github-api-tree-help-local-opus-r1; redocly tree github-api.yaml --format=ai --component=schemas --name=release-asset | head -20; echo "=== REL"; redocly tree github-api.yaml --format=ai --component=schemas --name=release | head -20; echo "=== INST"; redocly tree github-api.yaml --format=ai --find "get a repository installation" | head -8
cd /Users/tora/bench-run/github-api-tree-help-local-opus-r1; redocly tree github-api.yaml --format=ai --operation=apps/get-repo-installation | head -12; echo "=== SEC"; redocly tree github-api.yaml --format=ai --component=securitySchemes | head -20; echo "=== VERIFY ASSET"; redocly tree github-api.yaml --format=ai --operation=repos/get-release-asset | head -12
cd /Users/tora/bench-run/github-api-tree-help-local-opus-r1; redocly tree github-api.yaml --format=ai --operation=repos/check-immutable-releases | head -8; echo "=== UPD"; redocly tree github-api.yaml --format=ai --operation=repos/update-release | grep -o '"requestBody".*"responses"' | head -c 2000
```

{% /tab %}
{% tab label="Opus 5 · run 2 · no tree" %}

```bash
wc -l github-api.yaml
grep -n "^  /.*:" github-api.yaml
grep -n "^paths:\|^  \S" github-api.yaml | head -50
grep -n "releases\|/assets" github-api.yaml | grep -n "'\|\"" | head -60
sed -n '53272,53440p' github-api.yaml
sed -n '53843,53960p' github-api.yaml; echo "=== ASSET_ID ==="; sed -n '53431,53545p' github-api.yaml
grep -n "'/app/installations/{installation_id}/access_tokens'\|'/repos/{owner}/{repo}/installation'\|^  /app/installations" github-api.yaml
grep -n "securitySchemes" -A 20 github-api.yaml | head -30; echo "=== SERVERS ==="; grep -n "^servers:" -A 5 github-api.yaml
sed -n '3419,3520p' github-api.yaml
sed -n '45809,45860p' github-api.yaml
sed -n '45238,45285p' github-api.yaml; echo "=== check-immutable-releases schema ==="; grep -n "check-immutable-releases:" -A 30 github-api.yaml | head -40
grep -n "    release-asset:" -A 45 github-api.yaml | head -55
grep -n "        contents:" -A 8 github-api.yaml | sed -n '1,20p'; echo "=== workflows perm ==="; grep -n "        workflows:" -A 8 github-api.yaml | head -20
awk 'NR>=90700 && NR<=90870' github-api.yaml | grep -n "upload_url\|^    release:\|  id:\|html_url"
grep -n "^    release:" -A 60 github-api.yaml | grep -n "upload_url\|id:\|tag_name\|assets_url\|title:" | head -20; echo "=== app-permissions contents ==="; sed -n '86380,86426p' github-api.yaml
sed -n '53685,53780p' github-api.yaml | grep -n "patch:\|operationId\|draft\|make_latest\|required\|tag_name\|'200'\|delete:"
```

{% /tab %}
{% tab label="Opus 5 · run 2 · tree" %}

```bash
ls && redocly tree --help | head -60
redocly tree github-api.yaml --format=ai --find "release" | head -80
redocly tree github-api.yaml --format=ai --find "upload release asset" | head -30; echo "=== INSTALL TOKEN ==="; redocly tree github-api.yaml --format=ai --find "installation access token" | head -30
redocly tree github-api.yaml --format=ai --operation=apps/create-installation-access-token --with-deps | head -120
redocly tree github-api.yaml --format=ai --operation=repos/create-release --with-deps | head -40
redocly tree github-api.yaml --format=ai --operation=repos/upload-release-asset --with-deps | head -30; echo "=== DELETE ==="; redocly tree github-api.yaml --format=ai --operation=repos/delete-release-asset | head -20
redocly tree github-api.yaml --format=ai --path="/repos/{owner}/{repo}/installation" | head -20; echo "=== TOP ==="; redocly tree github-api.yaml --format=ai | head -25
redocly tree github-api.yaml --format=ai --operation=repos/update-release | head -12; echo "=== IMM ==="; redocly tree github-api.yaml --format=ai --operation=repos/check-immutable-releases --with-deps | head -12; echo "=== GETINST ==="; redocly tree github-api.yaml --format=ai --operation=apps/get-repo-installation | head -10
redocly tree github-api.yaml --format=ai --operation=apps/revoke-installation-access-token | head -6; echo "=== LIST ASSETS ==="; redocly tree github-api.yaml --format=ai --find "list release assets" | head -6
```

{% /tab %}
{% tab label="Opus 5 · run 3 · no tree" %}

```bash
wc -l github-api.yaml; grep -n "^  /" github-api.yaml
cd /Users/tora/Desktop/Projects/tree-bench-kit-v2/specs; grep -nE "^ *\"?/[a-z{]" github-api.yaml | grep -iE "release|asset|access_token"
cd /Users/tora/Desktop/Projects/tree-bench-kit-v2/specs; head -40 github-api.yaml; grep -n "releases" github-api.yaml | head -40
cd /Users/tora/Desktop/Projects/tree-bench-kit-v2/specs; grep -n "operationId: \(repos/create-release\|repos/upload-release-asset\|repos/delete-release-asset\|repos/get-release\|repos/update-release\|apps/create-installation-access-token\|repos/list-release-assets\|repos/get-release-asset\)$" github-api.yaml
cd /Users/tora/Desktop/Projects/tree-bench-kit-v2/specs; sed -n '3400,3470p;53300,53440p' github-api.yaml
cd /Users/tora/Desktop/Projects/tree-bench-kit-v2/specs; sed -n '53500,53560p;53880,53990p' github-api.yaml
cd /Users/tora/Desktop/Projects/tree-bench-kit-v2/specs; grep -n "operationId: apps/get-repo-installation" github-api.yaml; sed -n '53660,53740p' github-api.yaml; grep -n "immutable" github-api.yaml | awk -F: '$1>53000 && $1<54200'
cd /Users/tora/Desktop/Projects/tree-bench-kit-v2/specs; awk 'NR>=45818 && NR<=45870' github-api.yaml; grep -n "^    release-asset:" -A 40 github-api.yaml | grep -nE "state|^ *id:|name:|label:|browser_download_url" | head
cd /Users/tora/Desktop/Projects/tree-bench-kit-v2/specs; grep -n "X-GitHub-Api-Version" github-api.yaml | head -3; grep -n "^    installation:" github-api.yaml
```

{% /tab %}
{% tab label="Opus 5 · run 3 · tree" %}

```bash
ls && redocly tree --help
redocly tree github-api.yaml --format=ai --find "release" | head -60
redocly tree github-api.yaml --format=ai --find "installation access token" | head -40
redocly tree github-api.yaml --format=ai --operation=apps/create-installation-access-token | head -60; echo ====; redocly tree github-api.yaml --format=ai --operation=repos/create-release | head -60
redocly tree github-api.yaml --format=ai --find "upload release asset" | head -20; echo ====; redocly tree github-api.yaml --format=ai --operation=repos/delete-release-asset | head -40
redocly tree github-api.yaml --format=ai --operation=repos/create-release | head -40
redocly tree github-api.yaml --format=ai --operation=repos/upload-release-asset | head -40
redocly tree github-api.yaml --format=ai --operation=repos/delete-release-asset | head -20
redocly tree github-api.yaml --format=ai --find "repo installation app" | head -20
redocly tree github-api.yaml --format=ai --operation=apps/get-repo-installation | head -20
redocly tree github-api.yaml --format=ai --component=schemas --name=installation-token | head -30
redocly tree github-api.yaml --format=ai --component=schemas --name=app-permissions | grep -o '"contents":{[^}]*}' | head -5
redocly tree github-api.yaml --format=ai --component=schemas --name=release | head -8
redocly tree github-api.yaml --format=ai --operation=repos/check-immutable-releases | head -12
redocly tree github-api.yaml --format=ai --operation=repos/update-release | head -12
redocly tree github-api.yaml --format=ai --component=schemas --name=release-asset | head -3
redocly tree github-api.yaml --format=ai --operation=apps/revoke-installation-access-token | head -8
```

{% /tab %}
{% tab label="Opus 5 · run 4 · no tree" %}

```bash
wc -l github-api.yaml; grep -n "^  /" github-api.yaml | head -100
cd /Users/tora/Desktop/Projects/tree-bench-kit-v2/specs; grep -n "^paths:\|^components:\|^  \/" github-api.yaml | head -20; echo ---; grep -nE "^ *'?/[a-z{]" github-api.yaml | head -20
cd /Users/tora/Desktop/Projects/tree-bench-kit-v2/specs; grep -nE "^ *'?/repos/\{owner\}/\{repo\}/releases" github-api.yaml; echo ---; grep -n "createInstallationAccessToken\|apps/create-installation-access-token" github-api.yaml | head
cd /Users/tora/Desktop/Projects/tree-bench-kit-v2/specs; sed -n '3419,3500p' github-api.yaml
cd /Users/tora/Desktop/Projects/tree-bench-kit-v2/specs; grep -nE "^ *'?/repos/\{owner\}/\{repo\}/installation'?:" github-api.yaml; echo === CREATE; sed -n '53272,53300p' github-api.yaml; echo === POSTPART; awk 'NR>=53272 && NR<=53431' github-api.yaml | grep -n "post:\|operationId\|requestBody\|required:\|properties:\|^          [a-z_]*:\|responses:\|'201'\|Location" | head -60
cd /Users/tora/Desktop/Projects/tree-bench-kit-v2/specs; sed -n '53272,53431p' github-api.yaml
cd /Users/tora/Desktop/Projects/tree-bench-kit-v2/specs; sed -n '53843,53959p' github-api.yaml; echo "=====ASSET_ID====="; sed -n '53431,53542p' github-api.yaml
cd /Users/tora/Desktop/Projects/tree-bench-kit-v2/specs; sed -n '45809,45850p' github-api.yaml; echo "=====PATCH REL====="; sed -n '53685,53843p' github-api.yaml | grep -n "get:\|patch:\|delete:\|operationId\|^ *[a-z_]*:$\|required" | head -40
cd /Users/tora/Desktop/Projects/tree-bench-kit-v2/specs; awk '/^    app-permissions:/,/^    installation:/' github-api.yaml | grep -n "^        workflows:\|^        contents:\|^        metadata:" ; echo "=====REL SCHEMA====="; awk '/^    release:$/,0' github-api.yaml | sed -n '1,60p' | grep -n "upload_url\|html_url\|^          id:\|assets_url\|tag_name\|draft\|node_id"; echo "=====ASSET SCHEMA====="; awk '/^    release-asset:$/,0' github-api.yaml | sed -n '1,70p' | grep -n "url:\|^          id:\|name:\|state:\|size:\|browser_download"
cd /Users/tora/Desktop/Projects/tree-bench-kit-v2/specs; awk '/^    app-permissions:/,/^    installation:$/' github-api.yaml | sed -n '50,62p;190,205p'; echo "=====REL ID FIELD====="; awk '/^    release:$/,0' github-api.yaml | sed -n '1,35p'
```

{% /tab %}
{% tab label="Opus 5 · run 4 · tree" %}

```bash
ls && redocly tree --help
redocly tree github-api.yaml --format=ai --find release | head -80
redocly tree github-api.yaml --format=ai --operation=repos/create-release | head -60; echo ===; redocly tree github-api.yaml --format=ai --find "upload release asset" | head -30
redocly tree github-api.yaml --format=ai --find "upload asset" | head -20
redocly tree github-api.yaml --format=ai --operation=repos/upload-release-asset | head -40
redocly tree github-api.yaml --format=ai --find "installation access token" | head -20
redocly tree github-api.yaml --format=ai --operation=apps/create-installation-access-token | head -40
redocly tree github-api.yaml --format=ai --component=schemas --name=installation-token | head -20
redocly tree github-api.yaml --format=ai --find "repo installation" | head -15
redocly tree github-api.yaml --format=ai --operation=apps/get-repo-installation | head -20
redocly tree github-api.yaml --format=ai --operation=repos/delete-release-asset | head -20
redocly tree github-api.yaml --format=ai --component=schemas --name=release | head -8
redocly tree github-api.yaml --format=ai --component=schemas --name=release-asset | head -4; redocly tree github-api.yaml --format=ai --component=schemas --name=app-permissions | grep -o '"contents":[^}]*}' | head -3
redocly tree github-api.yaml --format=ai --operation=repos/check-immutable-releases | head -6; redocly tree github-api.yaml --format=ai --component=parameters --name=api-version | head -5
redocly tree github-api.yaml --format=ai --operation=apps/revoke-installation-access-token | head -6; redocly tree github-api.yaml --format=json | head -20
```

{% /tab %}
{% tab label="Opus 5 · run 5 · no tree" %}

```bash
wc -l github-api.yaml
grep "^  /.*:$" github-api.yaml
grep "releases" github-api.yaml | head -80
grep "access_tokens" github-api.yaml | head -30
sed -n '3400,3520p;53312,53345p' github-api.yaml
grep "upload-release-asset|releases/\\{release_id\\}/assets|get-repo-installation" github-api.yaml
sed -n '53345,53440p' github-api.yaml
sed -n '53843,53990p' github-api.yaml
sed -n '53518,53545p' github-api.yaml; echo ---; sed -n '45805,45860p' github-api.yaml
cd /Users/tora/Desktop/Projects/tree-bench-kit-v2/specs; grep -n "installation-token:" -A 30 github-api.yaml | head -60; echo === ; grep -n "  release-id:" -A 8 github-api.yaml
cd /Users/tora/Desktop/Projects/tree-bench-kit-v2/specs; grep -n "operationId: repos/update-release$" -B 15 github-api.yaml | head -40; echo ====; sed -n '45238,45320p' github-api.yaml
cd /Users/tora/Desktop/Projects/tree-bench-kit-v2/specs; grep -n "^    release:" -A 60 github-api.yaml | head -80; echo ====; grep -n "        workflows:" -A 6 github-api.yaml | head -20
cd /Users/tora/Desktop/Projects/tree-bench-kit-v2/specs; sed -n '45238,45272p' github-api.yaml; echo ==; grep -n "check-immutable-releases:" -A 25 github-api.yaml | head -40
cd /Users/tora/Desktop/Projects/tree-bench-kit-v2/specs; grep -n "    app-permissions:" -A 400 github-api.yaml | grep -nE "^[0-9]+-        [a-z_]+:|description: The level of permission to grant the access token (for|to) (repository contents|update GitHub Actions workflow)" | head -60
cd /Users/tora/Desktop/Projects/tree-bench-kit-v2/specs; grep -n "^    release-asset:" -A 45 github-api.yaml | grep -E "^[0-9]+-        [a-z_]+:|state|enum|uploaded|starter" | head -30
```

{% /tab %}
{% tab label="Opus 5 · run 5 · tree" %}

```bash
ls && redocly tree --help | head -80
redocly tree github-api.yaml --format=ai | head -60; echo "EXIT:$?"; redocly --version
which -a redocly; ls node_modules/.bin 2>/dev/null | head; npx -y @redocly/cli@latest tree --help | tail -30
/Users/tora/bench-builds/local/bin/redocly tree --help | head -60
R=/Users/tora/bench-builds/local/bin/redocly; $R tree github-api.yaml --format=ai --find "release" | head -60
R=/Users/tora/bench-builds/local/bin/redocly; $R tree github-api.yaml --format=ai --find "upload release asset" | head -30; echo ====; $R tree github-api.yaml --format=ai --find "installation access token" | head -30
R=/Users/tora/bench-builds/local/bin/redocly; $R tree github-api.yaml --format=ai --find "installation access token" | head -30
R=/Users/tora/bench-builds/local/bin/redocly; $R tree github-api.yaml --format=ai --operation=apps/create-installation-access-token --with-deps | head -120
R=/Users/tora/bench-builds/local/bin/redocly; $R tree github-api.yaml --format=ai --path="/repos/{owner}/{repo}/releases" --operation=post --with-deps | head -40
R=/Users/tora/bench-builds/local/bin/redocly; $R tree github-api.yaml --format=ai --operation=repos/upload-release-asset --with-deps | head -25
R=/Users/tora/bench-builds/local/bin/redocly; $R tree github-api.yaml --format=ai --operation=repos/delete-release-asset --with-deps | head -20; echo "=== root ==="; $R tree github-api.yaml --format=ai | head -25
```

{% /tab %}
{% /tabs %}

{% /tab %}
{% tab label="Haiku 4.5" %}

{% tabs %}
{% tab label="Haiku 4.5 · run 1 · no tree" %}

```bash
cat github-api.yaml
grep "release|upload|delete"  | head -100
grep "release|upload" /Users/tora/Desktop/Projects/tree-bench-kit-v2/specs | head -150
grep -n "POST\|GET\|DELETE" github-api.yaml | grep -i "release" | head -20
grep -n "^  /repos.*releases" github-api.yaml | head -30
grep -n "releases" github-api.yaml | grep "^[0-9]*:\s*/" | head -20
grep -n "releases" github-api.yaml | head -30
grep -n "'/repos/{owner}/{repo}/releases" github-api.yaml
sed -n '53272,53472p' github-api.yaml
sed -n '53469,53619p' github-api.yaml
sed -n '53843,53993p' github-api.yaml
grep -n "schemas/release:" github-api.yaml | head -5
grep -n "^  release:" github-api.yaml
grep -n "^    release:" github-api.yaml | head -5
sed -n '90926,91026p' github-api.yaml
grep -n "^    release-asset:" github-api.yaml
sed -n '90866,90966p' github-api.yaml
```

{% /tab %}
{% tab label="Haiku 4.5 · run 1 · tree" %}

```bash
redocly tree --help
redocly tree github-api.yaml --format=ai --find release
redocly tree github-api.yaml --format=ai --find "upload asset"
redocly tree github-api.yaml --format=ai --path=/repos/{owner}/{repo}/releases --operation=post --with-deps
redocly tree github-api.yaml --format=ai --path=/repos/{owner}/{repo}/releases/{release_id}/assets --operation=post --with-deps
redocly tree github-api.yaml --format=ai --path=/repos/{owner}/{repo}/releases/assets/{asset_id} --operation=delete --with-deps
```

{% /tab %}
{% tab label="Haiku 4.5 · run 2 · no tree" %}

```bash
cat github-api.yaml
grep "release|asset" github-api.yaml
grep "/(repos/[^/]+/[^/]+/releases|POST|DELETE)" github-api.yaml | head -50
sed -n '53272,53672p' github-api.yaml
sed -n '53843,53993p' github-api.yaml
grep "'^  release:'" github-api.yaml | head -5
grep "release:$" github-api.yaml | head -20
sed -n '90926,91126p' github-api.yaml
grep "release-asset:" github-api.yaml | head -3
sed -n '90866,90966p' github-api.yaml
```

{% /tab %}
{% tab label="Haiku 4.5 · run 2 · tree" %}

```bash
redocly tree --help
redocly tree github-api.yaml --format=ai --find "release" | head -100
redocly tree github-api.yaml --format=ai --find "asset upload" | head -50
redocly tree github-api.yaml --format=ai --path="/repos/{owner}/{repo}/releases" --operation="post" --with-deps
redocly tree github-api.yaml --format=ai --path="/repos/{owner}/{repo}/releases/{release_id}/assets" --operation="post" --with-deps
redocly tree github-api.yaml --format=ai --path="/repos/{owner}/{repo}/releases/assets/{asset_id}" --operation="delete" --with-deps
redocly tree github-api.yaml --format=ai --component="schemas" --name="release" | head -80
```

{% /tab %}
{% tab label="Haiku 4.5 · run 3 · no tree" %}

```bash
cat github-api.yaml
grep "release|asset|upload" github-api.yaml | head -200
grep "upload.*asset|asset.*upload|POST.*release" github-api.yaml | head -300
sed -n '53313,53413p' github-api.yaml
sed -n '53520,53550p' github-api.yaml
sed -n '53879,53959p' github-api.yaml
grep "schema.*release:|release:" github-api.yaml | head -5
sed -n '90926,91026p' github-api.yaml
grep "release-asset:" github-api.yaml | head -5
sed -n '90866,90926p' github-api.yaml
```

{% /tab %}
{% tab label="Haiku 4.5 · run 3 · tree" %}

```bash
ls -la | head -20
redocly tree --help
redocly tree github-api.yaml --format=ai --find "release create"
redocly tree github-api.yaml --format=ai --find "upload asset"
redocly tree github-api.yaml --format=ai --find "delete asset"
redocly tree github-api.yaml --format=ai --operation=post --path="/repos/{owner}/{repo}/releases"
redocly tree github-api.yaml --format=ai --operation=post --path="/repos/{owner}/{repo}/releases/{release_id}/assets"
redocly tree github-api.yaml --format=ai --operation=delete --path="/repos/{owner}/{repo}/releases/assets/{asset_id}"
```

{% /tab %}
{% tab label="Haiku 4.5 · run 4 · no tree" %}

```bash
Skill
cat github-api.yaml
grep "release|asset" github-api.yaml
grep "^\\s+/repos.*release" github-api.yaml
grep "release" github-api.yaml | head -100
grep "/repos/.*?/releases" github-api.yaml | head -200
sed -n '53272,53572p' github-api.yaml
sed -n '53843,53993p' github-api.yaml
```

{% /tab %}
{% tab label="Haiku 4.5 · run 4 · tree" %}

```bash
redocly tree --help
redocly tree github-api.yaml --find release --format=ai | head -100
redocly tree github-api.yaml --find "upload" --format=ai
redocly tree github-api.yaml --operation repos/create-release --format=ai --with-deps
redocly tree github-api.yaml --operation repos/upload-release-asset --format=ai --with-deps
redocly tree github-api.yaml --operation repos/delete-release-asset --format=ai --with-deps
```

{% /tab %}
{% tab label="Haiku 4.5 · run 5 · no tree" %}

```bash
cat github-api.yaml
grep "releases|assets" github-api.yaml | head -100
grep "upload.*asset|create.*asset|'/repos/{owner}/{repo}/releases/assets'" github-api.yaml | head -150
grep "upload-release-asset|/repos/.*releases.*asset" github-api.yaml | head -200
grep -n "operationId: repos/upload-release-asset\|operationId: repos/create-release\|operationId: repos/delete-release-asset" github-api.yaml
sed -n '53313,53463p' github-api.yaml
sed -n '53510,53560p' github-api.yaml
sed -n '53843,53993p' github-api.yaml
grep -n "schemas/release" github-api.yaml | head -5
grep -n "^\s*release:" github-api.yaml | grep -v release- | head -3
sed -n '90926,91026p' github-api.yaml
```

{% /tab %}
{% tab label="Haiku 4.5 · run 5 · tree" %}

```bash
redocly tree --help
redocly tree github-api.yaml --find release --format=ai
redocly tree github-api.yaml --find "upload asset" --format=ai
redocly tree github-api.yaml --path /repos/{owner}/{repo}/releases --operation POST --format=ai
redocly tree github-api.yaml --path /repos/{owner}/{repo}/releases/{release_id}/assets --operation POST --format=ai
redocly tree github-api.yaml --path /repos/{owner}/{repo}/releases/assets/{asset_id} --operation DELETE --format=ai
redocly tree github-api.yaml --component schemas --name release --format=ai
redocly tree github-api.yaml --component schemas --name release-asset --format=ai
```

{% /tab %}
{% /tabs %}

{% /tab %}
{% /tabs %}

Sonnet 5 and Opus 5 pass every run on both sides, with 9% to 13% less context and fewer calls through the index.
Haiku 4.5 fails the same way each time — it declares an installation token it never mints — and its one pass came without the index.

{% /tab %}

{% tab label="Billing API" %}

**Description:** 1.25 MB in one file.

**Task:** put an existing customer onto a recurring plan, with nothing else set up yet.
Expected: `POST /products` → `POST /plans` → `POST /subscriptions`.
Traps: the subscription body requires `orderType`, `customerId`, `websiteId` and `items`, and every call needs the `SecretApiKey` key in the `REB-APIKEY` header.

{% tabs %}
{% tab label="Prompt: no tree" %}

```text
We're moving existing customers onto monthly recurring billing. One of them is already in
the system, nothing else is set up yet. Work out what our backend has to call to get that
customer onto a recurring plan.

API description: rebilly.yaml

Give me a working flow as JSON in your reply: the steps in order, what each one calls, what it
needs, and what to carry from its response into the next step. It has to work as written.
```

{% /tab %}
{% tab label="Prompt: tree" %}

```text
We're moving existing customers onto monthly recurring billing. One of them is already in
the system, nothing else is set up yet. Work out what our backend has to call to get that
customer onto a recurring plan.

API description: rebilly.yaml

The Redocly CLI is installed and its `tree` command can search the description for you.
Start with `redocly tree --help` to see what it can select, then work with `--format=ai`:
redocly tree rebilly.yaml --format=ai <flags>

Give me a working flow as JSON in your reply: the steps in order, what each one calls, what it
needs, and what to carry from its response into the next step. It has to work as written.
```

{% /tab %}
{% /tabs %}

Context the run added, and the tool calls it took (medians over the working runs):

| Model           |        no tree |        tree | Difference |
| --------------- | -------------: | ----------: | ---------: |
| Sonnet 5 (n=5)  | 12,532 / 16 ❌ | 23,098 / 20 |          — |
| Opus 5 (n=5)    |    44,355 / 39 | 35,346 / 20 |       −20% |
| Haiku 4.5 (n=5) | 25,809 / 18 ❌ | 19,777 / 18 |          — |

What those runs were billed:

| Model           |  no tree |  tree | Difference |
| --------------- | -------: | ----: | ---------: |
| Sonnet 5 (n=5)  | $0.76 ❌ | $0.65 |          — |
| Opus 5 (n=5)    |    $1.97 | $1.12 |       −43% |
| Haiku 4.5 (n=5) | $0.18 ❌ | $0.16 |          — |

Whether each run produced a flow that would run:

| Run               | no tree                                       | tree            |
| ----------------- | --------------------------------------------- | --------------- |
| Sonnet 5 · run 1  | no auth scheme                                | works           |
| Sonnet 5 · run 2  | no auth scheme                                | no auth scheme  |
| Sonnet 5 · run 3  | no product call, no plan call, no auth scheme | works           |
| Sonnet 5 · run 4  | wrong auth header                             | works           |
| Sonnet 5 · run 5  | no auth scheme                                | works           |
| Opus 5 · run 1    | works                                         | works           |
| Opus 5 · run 2    | works                                         | works           |
| Opus 5 · run 3    | works                                         | works           |
| Opus 5 · run 4    | works                                         | works           |
| Opus 5 · run 5    | works                                         | works           |
| Haiku 4.5 · run 1 | no product call, no plan call, no auth scheme | works           |
| Haiku 4.5 · run 2 | no product call, no plan call, no auth scheme | no product call |
| Haiku 4.5 · run 3 | no product call, no auth scheme               | no product call |
| Haiku 4.5 · run 4 | no product call, no plan call, no auth scheme | no product call |
| Haiku 4.5 · run 5 | no product call, no plan call, no auth scheme | works           |

A run works when its flow contains `POST /products`, `POST /plans` and `POST /subscriptions`, names `orderType`, `customerId`, `websiteId` and `items`, and sends the key in the `REB-APIKEY` header.

What each run ran:

{% tabs %}
{% tab label="Sonnet 5" %}

{% tabs %}
{% tab label="Sonnet 5 · run 1 · no tree" %}

```bash
wc -l rebilly.yaml
grep "^  /(customers|plans|subscriptions|payment-instruments)" rebilly.yaml
sed -n '31004,31184p' rebilly.yaml
sed -n '32539,32789p' rebilly.yaml
grep -n "SubscriptionOrder:\|SubscriptionOrder$\|^    SubscriptionOrder" rebilly.yaml | head -20
grep -n "^    Plan:$" rebilly.yaml
sed -n '12201,12331p' rebilly.yaml
grep -n "^    SubscriptionPlan:\|^    OneTimeSalePlan:\|^    TrialOnlyPlan:" rebilly.yaml
sed -n '11888,12088p' rebilly.yaml
grep -n "^  requestBodies:\|Subscription:$" rebilly.yaml | head -20
grep -n "^    PlanPriceFormula:|^    PlanFormulaFlatRate:|^    OrderItem:|^    OrderItemPlan:" rebilly.yaml
sed -n '15233,15453p' rebilly.yaml
sed -n '11222,11272p' rebilly.yaml
grep -n "items:" rebilly.yaml | awk -F: '$1>15440 && $1<15700'
sed -n '15555,15675p' rebilly.yaml
grep -n "paymentInstrumentId\|websiteId" rebilly.yaml | awk -F: '$1>15233 && $1<15900'
sed -n '30460,30590p' rebilly.yaml
sed -n '15495,15545p' rebilly.yaml
grep -n "PostPaymentInstrument:" rebilly.yaml
sed -n '20441,20481p' rebilly.yaml
grep -n "^    PaymentInstrumentCreateToken:\|^    PaymentCardCreatePlain:\|^    WebsiteId:" rebilly.yaml
sed -n '10876,10966p' rebilly.yaml
grep -n "^  /websites" rebilly.yaml
grep -n "websites:" rebilly.yaml
sed -n '2897,2912p' rebilly.yaml
grep -n "^    ContactObject:" rebilly.yaml | head -3
# write /private/tmp/claude-501/-Users-tora-bench-run-rebilly-control-v3-sonnet-r1/4a753cca-ffbe-40b9-8ee6-077e9d2de9df/scratchpad/recurring-billing-flow.json
```

{% /tab %}
{% tab label="Sonnet 5 · run 1 · tree" %}

```bash
redocly tree --help | head -100
redocly tree rebilly.yaml --format=ai --find="recurring" | head -150
redocly tree rebilly.yaml --format=ai --find="subscription" | head -150
redocly tree rebilly.yaml --format=ai --path=/subscriptions --operation=post --with-deps | head -400
redocly tree rebilly.yaml --format=ai --pointer="#/components/requestBodies/Subscription" | head -100
redocly tree rebilly.yaml --format=ai --component=schemas --name=SubscriptionOrOneTimeSaleItem --with-deps | head -150
redocly tree rebilly.yaml --format=ai --find="plans" | head -100
redocly tree rebilly.yaml --format=ai --path=/plans --operation=post --with-deps | head -150
redocly tree rebilly.yaml --format=ai --find="products" | head -60
redocly tree rebilly.yaml --format=ai --component=schemas --name=Product | head -60
redocly tree rebilly.yaml --format=ai --pointer="#/components/schemas/SubscriptionPlan" | head -120
redocly tree rebilly.yaml --format=ai --pointer="#/components/schemas/PlanPriceFormula" | head -60
redocly tree rebilly.yaml --format=ai --find="payment-instruments" | head -40
redocly tree rebilly.yaml --format=ai --pointer="#/components/schemas/PlanFormulaFlatRate" | head -40
redocly tree rebilly.yaml --format=ai --path=/payment-instruments --operation=post | head -60
redocly tree rebilly.yaml --format=ai --pointer="#/components/requestBodies/PostPaymentInstrument" | head -60
redocly tree rebilly.yaml --format=ai --pointer="#/components/schemas/PaymentInstrumentCreateToken" | head -40
redocly tree rebilly.yaml --format=ai --pointer="#/components/schemas/Subscription" | python3 -c "
import json,sys
data=sys.stdin.read()
start=data.find('--- json')
print(data[:start])
"
redocly tree rebilly.yaml --format=ai --pointer="#/components/schemas/Subscription" > /tmp/sub.txt
python3 -c "
import json
data=open('/tmp/sub.txt').read()
start=data.find('{')
end=data.find('\n--- deps')
if end==-1: end=data.find('\nrefs:')
s=data[start:end]
obj=json.loads(s)
print('required:', obj.get('required'))
props=obj['properties']
for k in ['paymentInstrumentId','autopay','websiteId','currency','items','customerId']:
print(k, props.get(k))
print(props['paymentInstrumentId']['description'])
print('---')
print(props['autopay']['description'])
grep -n "ID of the payment instrument to use for autopay" -A3 rebilly.yaml
grep -n "Specifies if payment attempts are made automatically" -A5 rebilly.yaml
sed -n '15390,15430p' /Users/tora/bench-run/rebilly-tree-help-local-sonnet-r1/rebilly.yaml
redocly tree rebilly.yaml --format=ai --pointer="#/components/schemas/OriginalPlan" | head -20
redocly tree rebilly.yaml --format=ai --pointer="#/components/schemas/CustomerId" | head -20
redocly tree rebilly.yaml --format=ai --pointer="#/components/schemas/WebsiteId" | head -20
redocly tree rebilly.yaml --format=ai --path=/products --operation=post | head -20
```

{% /tab %}
{% tab label="Sonnet 5 · run 2 · no tree" %}

```bash
wc -l rebilly.yaml
Agent
```

{% /tab %}
{% tab label="Sonnet 5 · run 2 · tree" %}

```bash
redocly tree --help
redocly tree rebilly.yaml --format=ai --find="recurring" | head -100
redocly tree rebilly.yaml --format=ai --find="plan" | head -150
redocly tree rebilly.yaml --format=ai --find="subscription" | head -150
redocly tree rebilly.yaml --format=ai --path=/subscriptions --operation=post --with-deps | head -400
redocly tree rebilly.yaml --component=requestBodies --name=Subscription --with-deps | head -200
sed -n '15100,15240p' /Users/tora/bench-run/rebilly-tree-help-local-sonnet-r2/rebilly.yaml
sed -n '12322,12352p' /Users/tora/bench-run/rebilly-tree-help-local-sonnet-r2/rebilly.yaml
sed -n '15233,15393p' /Users/tora/bench-run/rebilly-tree-help-local-sonnet-r2/rebilly.yaml
sed -n '15392,15532p' /Users/tora/bench-run/rebilly-tree-help-local-sonnet-r2/rebilly.yaml
sed -n '11889,12089p' /Users/tora/bench-run/rebilly-tree-help-local-sonnet-r2/rebilly.yaml
redocly tree rebilly.yaml --format=ai --find="product" | head -60
sed -n '12216,12322p' /Users/tora/bench-run/rebilly-tree-help-local-sonnet-r2/rebilly.yaml
sed -n '11169,11234p' /Users/tora/bench-run/rebilly-tree-help-local-sonnet-r2/rebilly.yaml
redocly tree rebilly.yaml --format=ai --find="payment instrument" | head -60
redocly tree rebilly.yaml --format=ai --path=/payment-instruments --operation=post --with-deps | head -100
redocly tree rebilly.yaml --format=ai --path=/customers/{id} --operation=get --with-deps | head -60
redocly tree rebilly.yaml --format=ai --component=schemas --name=CustomerId; echo ---; redocly tree rebilly.yaml --format=ai --component=schemas --name=ResourceId
# write /private/tmp/claude-501/-Users-tora-bench-run-rebilly-tree-help-local-sonnet-r2/7479a81f-d4e4-43dc-9ed2-763fac9dacde/scratchpad/rebilly_recurring_flow.json
```

{% /tab %}
{% tab label="Sonnet 5 · run 3 · no tree" %}

```bash
wc -l rebilly.yaml
Agent
Artifact
```

{% /tab %}
{% tab label="Sonnet 5 · run 3 · tree" %}

```bash
ls rebilly.yaml 2>/dev/null && redocly tree --help | head -50
redocly tree rebilly.yaml --format=ai --tag | head -100
redocly tree rebilly.yaml --format=ai --tag=Orders
redocly tree rebilly.yaml --format=ai --path=/subscriptions --operation=post --with-deps | head -250
redocly tree rebilly.yaml --component=requestBodies --name=Subscription --with-deps | head -150
sed -n '15100,15235p' rebilly.yaml
sed -n '12322,12350p' rebilly.yaml; echo ---; sed -n '15234,15260p' rebilly.yaml
redocly tree rebilly.yaml --format=ai --tag=Plans; echo ---; redocly tree rebilly.yaml --format=ai --tag="Payment instruments"
sed -n '11889,12086p' rebilly.yaml
redocly tree rebilly.yaml --format=ai --path=/products --operation=post | head -30
sed -n '12216,12322p' rebilly.yaml
grep -n "PlanPriceFormula:" rebilly.yaml
sed -n '11615,11650p' /Users/tora/bench-run/rebilly-tree-help-local-sonnet-r3/rebilly.yaml
grep -n "PlanFormulaFlatRate:" rebilly.yaml
sed -n '11222,11262p' /Users/tora/bench-run/rebilly-tree-help-local-sonnet-r3/rebilly.yaml
redocly tree rebilly.yaml --format=ai --path=/payment-instruments --operation=post
grep -n "PostPaymentInstrument:" rebilly.yaml | head -5
sed -n '20441,20476p' /Users/tora/bench-run/rebilly-tree-help-local-sonnet-r3/rebilly.yaml
grep -n "PaymentInstrumentCreateToken:" rebilly.yaml
sed -n '10876,10926p' /Users/tora/bench-run/rebilly-tree-help-local-sonnet-r3/rebilly.yaml
grep -n "paymentInstrumentId:\|autopay:\|websiteId:\|customerId:\|items:" rebilly.yaml | sed -n '1,5p'
awk 'NR==15234,NR==15791' rebilly.yaml > /dev/null
sed -n '15234,15420p' rebilly.yaml | grep -n "paymentInstrumentId\|autopay\|readOnly"
sed -n '15385,15425p' /Users/tora/bench-run/rebilly-tree-help-local-sonnet-r3/rebilly.yaml
sed -n '15234,15391p' rebilly.yaml | grep -n "paymentInstrumentId"
grep -n "paymentInstrumentId" rebilly.yaml | head -20
sed -n '15495,15510p' /Users/tora/bench-run/rebilly-tree-help-local-sonnet-r3/rebilly.yaml
sed -n '2898,2908p' rebilly.yaml
```

{% /tab %}
{% tab label="Sonnet 5 · run 4 · no tree" %}

```bash
wc -l rebilly.yaml
Agent
grep "^  /products:|^  /websites:" rebilly.yaml
grep "websiteId" rebilly.yaml | head -40
grep -n "ProductCreate\|title: Product" rebilly.yaml | head -20
sed -n '31374,31434p' rebilly.yaml
sed -n '31434,31534p' rebilly.yaml
grep -n "requestBodies:" -A2 rebilly.yaml | head; grep -n "^  Product:$" rebilly.yaml
grep -n "Product:$" rebilly.yaml
grep -n "^    Product:" rebilly.yaml
sed -n '11888,11948p' rebilly.yaml
grep -n "^    PlanPriceFormula:|^    RecurringInterval:|^    PlanFixedPrice:\"" rebilly.yaml
grep -n "^    PlanFormulaFlatRate:\"" rebilly.yaml
grep -n "PlanFormulaFlatRate:" rebilly.yaml
grep -n "recurringInterval:|RecurringInterval:" rebilly.yaml | head -40
sed -n '15233,15273p' rebilly.yaml
```

{% /tab %}
{% tab label="Sonnet 5 · run 4 · tree" %}

```bash
redocly tree --help
redocly tree rebilly.yaml --format=ai --tag | head -100
redocly tree rebilly.yaml --format=ai --tag=Orders
redocly tree rebilly.yaml --format=ai --tag=Plans
redocly tree rebilly.yaml --format=ai --tag=Products
redocly tree rebilly.yaml --format=ai --path=/subscriptions --operation=post --with-deps | head -250
redocly tree rebilly.yaml --format=ai --component=requestBodies --name=Subscription --with-deps | head -150
redocly tree rebilly.yaml --format=ai --component=schemas --name=SubscriptionOrOneTimeSaleItem --with-deps | head -100
redocly tree rebilly.yaml --format=ai --component=schemas --name=SubscriptionPlan --with-deps | head -100
redocly tree rebilly.yaml --format=ai --pointer="#/components/schemas/Subscription" | head -80
redocly tree rebilly.yaml --format=ai --tag="Payment instruments"
redocly tree rebilly.yaml --format=ai --path=/payment-instruments --operation=post --with-deps | head -60
redocly tree rebilly.yaml --format=ai --path=/products --operation=post --with-deps | head -40
redocly tree rebilly.yaml --format=ai --path=/plans --operation=post --with-deps | head -40
Artifact
```

{% /tab %}
{% tab label="Sonnet 5 · run 5 · no tree" %}

```bash
wc -l rebilly.yaml
grep "^  /(subscriptions|plans|customers|payment-instruments|payment-cards)" rebilly.yaml
sed -n '31004,31184p' rebilly.yaml
sed -n '32539,32789p' rebilly.yaml
grep -n "Subscription:" rebilly.yaml | head -5
sed -n '30460,30590p' rebilly.yaml
grep -n "PostPaymentInstrument:\|requestBodies:" rebilly.yaml | head -10
grep "^    Subscription:$|SubscriptionOrder:$\" -A 3" rebilly.yaml
sed -n '20150,20490p' rebilly.yaml
grep -n "SubscriptionOrOneTimeSale:\|SubscriptionOrder:\|OrderItem:\|OrderItemPlan:\|PaymentCardCreatePlain:\|PaymentInstrumentCreateToken:" rebilly.yaml
sed -n '16038,16198p' rebilly.yaml
sed -n '10876,10956p' rebilly.yaml
sed -n '15233,15393p' rebilly.yaml
grep -n "paymentInstrumentId|paymentMethod" rebilly.yaml | head -20
grep -n "^    Plan:" rebilly.yaml
sed -n '15480,15520p' rebilly.yaml
sed -n '12201,12271p' rebilly.yaml
grep -n "^    SubscriptionPlan:\|^    OneTimeSalePlan:\|^    TrialOnlyPlan:" rebilly.yaml
sed -n '11888,12008p' rebilly.yaml
grep "^  /products:" rebilly.yaml
grep -n "^    PlanPriceFormula:\|^    PlanFormulaFlatRate:" rebilly.yaml
sed -n '11222,11262p' rebilly.yaml
grep -n "^  /customers/{id}:" -A 30 rebilly.yaml | grep -n "operationId\|get:\|200"
# write /private/tmp/claude-501/-Users-tora-bench-run-rebilly-control-v3-sonnet-r5/0227ede4-6ba0-49c9-8731-6a7ba3049b59/scratchpad/rebilly_flow.json
```

{% /tab %}
{% tab label="Sonnet 5 · run 5 · tree" %}

```bash
ls && redocly tree --help
redocly tree rebilly.yaml --format=ai --find="subscription" | head -100
redocly tree rebilly.yaml --format=ai --path=/subscriptions --operation=post --with-deps | head -250
redocly tree rebilly.yaml --format=ai --find="plan" | head -60
redocly tree rebilly.yaml --format=ai --component=schemas --name=SubscriptionOrOneTimeSaleItem --with-deps | head -150
redocly tree rebilly.yaml --format=ai --path=/plans --operation=post --with-deps | head -100
redocly tree rebilly.yaml --format=ai --find="product" | head -40
redocly tree rebilly.yaml --format=ai --component=schemas --name=Product --with-deps | head -60
redocly tree rebilly.yaml --format=ai --component=schemas --name=PlanPriceFormula --with-deps | head -60
redocly tree rebilly.yaml --format=ai --component=schemas --name=SubscriptionPlan | python3 -c "import json,sys
lines=sys.stdin.read()
print(lines[:200])
"
redocly tree rebilly.yaml --format=ai --pointer="#/components/schemas/SubscriptionPlan/properties/recurringInterval" | head -40
redocly tree rebilly.yaml --format=ai --component=schemas --name=TimeUnit | head -20
redocly tree rebilly.yaml --format=ai --component=schemas --name=TimePluralUnit | head -20
redocly tree rebilly.yaml --format=ai --pointer="#/components/schemas/Subscription" | python3 -c "
import sys,json
data=sys.stdin.read()
# find the --- json line
idx = data.find('--- json')
print(data[:idx])
jsonpart = data[idx+9:]
jsonpart = jsonpart.split('\n---')[0].split('\nrefs:')[0]
try:
obj=json.loads(jsonpart.strip())
print('required:', obj.get('required'))
except Exception as e:
print('parse err', e)
print(jsonpart[:500])
redocly tree rebilly.yaml --format=ai --find="website" | head -30
redocly tree rebilly.yaml --format=ai --pointer="#/components/schemas/Subscription/properties/paymentInstrumentId" | head -20
redocly tree rebilly.yaml --format=ai --pointer="#/components/schemas/Subscription/properties/autopay" | head -20
redocly tree rebilly.yaml --format=ai --find="payment-instruments" | head -30
redocly tree rebilly.yaml --format=ai --path=/payment-instruments --operation=post --with-deps | head -80
redocly tree rebilly.yaml --format=ai --component=schemas --name=ContactObject | head -10
redocly tree rebilly.yaml --format=ai --pointer="#/components/schemas/CurrencyCode" | head -10
```

{% /tab %}
{% /tabs %}

{% /tab %}
{% tab label="Opus 5" %}

{% tabs %}
{% tab label="Opus 5 · run 1 · no tree" %}

```bash
ls -la rebilly.yaml && wc -l rebilly.yaml
grep -n "^  /" rebilly.yaml | head -200
sed -n '31374,31530p' rebilly.yaml
grep -n "^    Product:\|^    Plan:\|^    Subscription:\|^    PaymentInstrument:\|^    PaymentToken:\|^    Token:\|^    PaymentCardToken" rebilly.yaml
sed -n '12201,12260p' rebilly.yaml && echo ===== && grep -n "ProductCreate\|PlanCreate\|Plan:$\|productFields\|planFields" rebilly.yaml | head -40
grep -n "^    SubscriptionPlan:" rebilly.yaml
sed -n '11888,12201p' rebilly.yaml
grep -n "^    PlanPriceFormula:\|^    FixedPriceFormula:\|^    PlanTrial:\|^    PlanSetup:" rebilly.yaml
sed -n '11615,11640p' rebilly.yaml && echo "=====" && grep -n "^    FixedPricing:\|^    QuantityBasedPricing\|Pricing:$" rebilly.yaml | head
grep -n "^    PlanFormulaFixedFee:" rebilly.yaml
sed -n '11168,11215p' rebilly.yaml
sed -n '15233,15420p' rebilly.yaml
sed -n '15420,15700p' rebilly.yaml | grep -n "^        [a-zA-Z_]*:"
sed -n '15503,15520p;15537,15580p' rebilly.yaml && echo "=== items schema ===" && grep -n "^    SubscriptionItem\|^    OrderItem" rebilly.yaml
grep -n "SubscriptionOrOneTimeSaleItem:" rebilly.yaml
sed -n '15099,15233p' rebilly.yaml
grep -n "^    OriginalPlan:" rebilly.yaml
sed -n '12321,12360p' rebilly.yaml
grep -n "websites" rebilly.yaml | head -20 && echo "=== WebsiteId ===" && grep -n "^    WebsiteId:" rebilly.yaml
sed -n '37280,37360p' rebilly.yaml && echo "=== 2897 ===" && sed -n '2897,2915p' rebilly.yaml
sed -n '30460,30560p' rebilly.yaml
sed -n '30560,30640p' rebilly.yaml
grep -n "    PostPaymentInstrument:" rebilly.yaml
sed -n '20441,20480p' rebilly.yaml && echo "=== CreatePaymentInstrument ===" && grep -n "^    CreatePaymentInstrument\|^    PaymentCardPaymentInstrument\|CreatePaymentCard" rebilly.yaml | head -20
grep -n "^    PaymentInstrumentCreateToken:" rebilly.yaml
sed -n '10876,10960p' rebilly.yaml
sed -n '34892,34990p' rebilly.yaml
grep -n "^    CompositeToken:" rebilly.yaml && sed -n '17081,17140p' rebilly.yaml
sed -n '17801,17830p' rebilly.yaml && echo "=== token prop ===" && grep -n "^        token:" rebilly.yaml | sed -n '1,20p'
sed -n '17140,17200p' rebilly.yaml
sed -n '32620,32700p' rebilly.yaml
sed -n '28565,28640p' rebilly.yaml
sed -n '35340,35420p' rebilly.yaml
sed -n '35258,35340p' rebilly.yaml | grep -n "requestBody\|schema\|\$ref\|summary\|operationId"
grep -n "    TransactionRequest:" rebilly.yaml && grep -n "^    CreateTransaction\|^    TransactionCreate" rebilly.yaml
sed -n '20508,20530p' rebilly.yaml
sed -n '20530,20700p' rebilly.yaml | grep -n "^              [a-zA-Z]*:"
sed -n '20532,20562p;20573,20590p' rebilly.yaml && echo "=== PaymentInstruction ===" && grep -n "^    PaymentInstruction:" rebilly.yaml
sed -n '18000,18090p' rebilly.yaml
sed -n '160,200p' rebilly.yaml && echo "=== security schemes ===" && grep -n "  securitySchemes:" rebilly.yaml
sed -n '192,270p' rebilly.yaml
grep -n "subscriptionExpand:" rebilly.yaml && grep -n "defaultPaymentInstrument" rebilly.yaml | head
sed -n '447,470p' rebilly.yaml && echo "===" && sed -n '3540,3580p' rebilly.yaml
awk 'NR>=3400 && NR<=3545 && /^    [A-Za-z]+:/ {print NR": "$0}' rebilly.yaml && echo "=== VaultedInstrument ===" && grep -n "^    VaultedInstrument:" rebilly.yaml
sed -n '3096,3130p' rebilly.yaml && echo "=== customers/{id} PATCH ===" && sed -n '26100,26180p' rebilly.yaml | grep -n "patch:\|operationId\|requestBody\|\$ref"
awk 'NR>=25986 && NR<=26221 && (/^    (get|patch|put|delete|post):/ || /operationId:/ || /requestBody:/)' rebilly.yaml
awk 'NR>=31090 && NR<=31135' rebilly.yaml | grep -n "post:\|operationId\|requestBody\|\$ref\|'201'" && echo "=== requestBodies Plan ===" && grep -n "^    Plan:$" rebilly.yaml
grep -n "^    ServicePeriodAnchorInstruction:" rebilly.yaml && sed -n "$(grep -n '^    ServicePeriodAnchorInstruction:' rebilly.yaml | cut -d: -f1),+45p" rebilly.yaml
sed -n "$(grep -n '^    Invoice:' rebilly.yaml | head -1 | cut -d: -f1),+80p" rebilly.yaml | grep -n -A14 "status:" | head -40
grep -n "^    InvoiceStatus\|abandoned$" rebilly.yaml | head -5; grep -n "          - past-due" rebilly.yaml | head
sed -n '6840,6862p' rebilly.yaml
```

{% /tab %}
{% tab label="Opus 5 · run 1 · tree" %}

```bash
ls && redocly tree --help
redocly tree rebilly.yaml --format=ai --find "subscription" | head -60
redocly tree rebilly.yaml --format=ai --find "plan" | head -30; echo ===; redocly tree rebilly.yaml --format=ai --find "product" | head -25; echo ===; redocly tree rebilly.yaml --format=ai --find "payment instrument" | head -40
redocly tree rebilly.yaml --format=ai --find "product" | head -20; echo "-----"; redocly tree rebilly.yaml --format=ai --find "payment-instrument" | head -40
redocly tree rebilly.yaml --format=ai --operation=PostProduct --with-deps | head -150
redocly tree rebilly.yaml --format=ai --operation=PostPlan --with-deps | head -60; echo "-----"; redocly tree rebilly.yaml --format=ai --component=schemas --name=SubscriptionPlan --with-deps | head -120
redocly tree rebilly.yaml --format=ai --operation=PostSubscription --with-deps | head -40
redocly tree rebilly.yaml --format=ai --component=schemas --name=SubscriptionOrOneTimeSaleItem | head -20; echo "-----"; redocly tree rebilly.yaml --format=ai --find "website" | head -20
redocly tree rebilly.yaml --format=ai --component=schemas --name=WebsiteId | head -8; echo "-----"; redocly tree rebilly.yaml --format=ai --component=schemas --name=OriginalPlan|head -8; echo "-----"; redocly tree rebilly.yaml --format=ai --operation=PostPaymentInstrument --with-deps | head -40
redocly tree rebilly.yaml --format=ai --component=requestBodies --name=PostPaymentInstrument|head -10; echo "-----"; redocly tree rebilly.yaml --format=ai --find "token"|head -20
redocly tree rebilly.yaml --format=ai --component=schemas --name=Subscription | tr ',' '\n' | grep -n -A6 -E '"(autopay|paymentInstrumentId|startTime|websiteId|items|customerId|orderType|currency|delinquencyPeriod)"' | head -80
redocly tree rebilly.yaml --format=ai --component=schemas --name=ContactObject|head -6; echo "-----"; redocly tree rebilly.yaml --format=ai --path=/customers|head -20; echo "-----"; redocly tree rebilly.yaml --format=ai --operation=PostToken|head -12
redocly tree rebilly.yaml --format=ai --operation=GetCustomerCollection|head -8; echo "-----"; redocly tree rebilly.yaml --format=ai --find "gateway-account"|head -12; echo "-----"; redocly tree rebilly.yaml --format=ai --find "invoices"|head -12
redocly tree rebilly.yaml --format=ai --path="/customers/{id}"|head; echo "-----"; redocly tree rebilly.yaml --format=ai --component=parameters --name=collectionFilter|head -6
grep -n -A6 "^servers:" rebilly.yaml | head -20
sed -n 166,200p rebilly.yaml
redocly tree rebilly.yaml --format=ai --component=schemas --name=PlanFormulaFixedFee|head -5; echo "-----"; redocly tree rebilly.yaml --format=ai --component=parameters --name=subscriptionExpand|head -5
redocly tree rebilly.yaml --format=ai --component=schemas --name=CompositeToken|head -5
redocly tree rebilly.yaml --format=ai --component=schemas --name=PaymentCardToken|sed -n 3p | head -c 2000
redocly tree rebilly.yaml --format=ai --component=schemas --name=PaymentCardToken|sed -n 4p | head -c 2500
```

{% /tab %}
{% tab label="Opus 5 · run 2 · no tree" %}

```bash
ls -la rebilly.yaml && wc -l rebilly.yaml
grep -n "^  /" rebilly.yaml | head -300
sed -n '31374,31560p' rebilly.yaml
grep -n "^    Product:\|^    Plan:\|^    Subscription:\|^    PaymentInstrument:\|^    PaymentCardToken\|^    Token:\|^  requestBodies:\|^  schemas:\|^    Website:\|^    GatewayAccount" rebilly.yaml
sed -n '12201,12320p' rebilly.yaml && echo ==== && sed -n '20455,20500p' rebilly.yaml
sed -n '20455,20500p' rebilly.yaml; grep -n "    SubscriptionPlan:" rebilly.yaml
sed -n '11888,12201p' rebilly.yaml
grep -n "    SubscriptionOrOneTimeSale:\|    PlanPriceFormula:\|    NewSubscription\|    SubscriptionItem" rebilly.yaml
sed -n '11615,11700p' rebilly.yaml && echo "=====" && sed -n '16038,16300p' rebilly.yaml
sed -n '15233,15500p' rebilly.yaml
sed -n '15500,15800p' rebilly.yaml | grep -n "^        [a-zA-Z_]*:"
sed -n '15503,15520p;15537,15546p;15564,15582p' rebilly.yaml
grep -n "    SubscriptionOrOneTimeSaleItem:\|    OriginalPlan:\|    FlexiblePlan:\|    WebsiteId:" rebilly.yaml
sed -n '2897,2910p;12321,12360p;15099,15140p' rebilly.yaml
grep -n "websites:\|GetWebsiteCollection\|/websites" rebilly.yaml | head -20
sed -n '37286,37292p' rebilly.yaml && sed -n '30460,30790p' rebilly.yaml
grep -n "    PostPaymentInstrument:" rebilly.yaml && grep -n "    PaymentInstrumentCreateToken:\|    PaymentCardCreatePlain:" rebilly.yaml
sed -n '20441,20455p;10820,10990p' rebilly.yaml
sed -n '34892,34990p' rebilly.yaml
grep -n "    CompositeToken:" rebilly.yaml && sed -n '17081,17160p' rebilly.yaml
sed -n '17160,17200p;17801,17830p' rebilly.yaml
grep -n "    PlanFormulaFlatRate:\|    PlanFormulaFixedFee:\|    PlanTrial:\|    ServicePeriodAnchorInstruction:" rebilly.yaml
sed -n '11168,11280p;11743,11800p' rebilly.yaml
sed -n '31100,31182p' rebilly.yaml | grep -n "post:\|requestBody\|\$ref\|responses\|'201'" ; echo ---; sed -n '32660,32790p' rebilly.yaml | grep -n "post:\|requestBody:\|\$ref:\|'201'\|description:" | head -40
sed -n '32610,32665p' rebilly.yaml; echo ---SERVERS---; sed -n '1,60p' rebilly.yaml | grep -n "url:\|servers:"; grep -n "^servers:" rebilly.yaml
sed -n '166,185p' rebilly.yaml; grep -n "  securitySchemes:" rebilly.yaml
sed -n '192,260p' rebilly.yaml
grep -n "^    ContactObject:" rebilly.yaml
sed -n '3261,3300p' rebilly.yaml; grep -n "^    Contact:" rebilly.yaml
grep -n "^    Customer:" rebilly.yaml
sed -n '3509,3700p' rebilly.yaml | grep -n "^        [a-zA-Z]*:"
sed -n '3543,3570p' rebilly.yaml
grep -n "^    VaultedInstrument:" rebilly.yaml | head -1; sed -n '25986,26010p' rebilly.yaml | grep -n "patch:\|put:\|get:\|operationId"
sed -n '3096,3115p' rebilly.yaml; grep -n "operationId: P.*Customer\b\|operationId: PatchCustomer\|operationId: PutCustomer" rebilly.yaml
sed -n '26030,26060p' rebilly.yaml; sed -n '3115,3140p' rebilly.yaml
sed -n '3509,3515p' rebilly.yaml
grep -n "REB-\|apiVersion" rebilly.yaml | head
grep -n "    SchedulingMethodImmediately:" rebilly.yaml
sed -n '6536,6560p' rebilly.yaml
```

{% /tab %}
{% tab label="Opus 5 · run 2 · tree" %}

```bash
ls && redocly tree --help
redocly tree rebilly.yaml --format=ai --find "subscription" | head -60
redocly tree rebilly.yaml --format=ai --find "plan" | head -60
redocly tree rebilly.yaml --format=ai --operation=PostSubscription --with-deps | head -200
redocly tree rebilly.yaml --format=ai --find "product" | head -40
redocly tree rebilly.yaml --format=ai --component=requestBodies --name=Subscription --with-deps | head -60
redocly tree rebilly.yaml --format=ai --find "website" | head -30
redocly tree rebilly.yaml --format=ai --component=schemas --name=SubscriptionOrOneTimeSaleItem --with-deps | head -40; echo ====; redocly tree rebilly.yaml --format=ai --component=schemas --name=WebsiteId | head -20
redocly tree rebilly.yaml --format=ai --find "payment instrument" | head -40; echo ====; redocly tree rebilly.yaml --format=ai --find "payment token" | head -25
redocly tree rebilly.yaml --format=ai --component=schemas --name=SubscriptionPlan | head -30
redocly tree rebilly.yaml --format=ai --component=schemas --name=Product | head -30
redocly tree rebilly.yaml --format=ai --component=schemas --name=PlanFormulaFixedFee | head -20; redocly tree rebilly.yaml --format=ai --component=schemas --name=PlanPriceFormula | head -10
redocly tree rebilly.yaml --format=ai --operation=PostToken --with-deps | head -40
redocly tree rebilly.yaml --format=ai --component=schemas --name=PaymentInstrumentCreateToken | head -20
redocly tree rebilly.yaml --format=ai --operation=PostPaymentInstrument | head -20; redocly tree rebilly.yaml --format=ai --component=schemas --name=PaymentCardToken | head -12
redocly tree rebilly.yaml --format=ai --component=schemas --name=WebsiteId | head; redocly tree rebilly.yaml --format=ai --find "organization"|head -20
sed -n '15234,15364p' /Users/tora/bench-run/rebilly-tree-help-local-opus-r2/rebilly.yaml
grep -n "autopay:" -A 12 rebilly.yaml | sed -n '1,60p'
redocly tree rebilly.yaml --format=ai --component=schemas --name=Customer | head -12
sed -n '15364,15484p' /Users/tora/bench-run/rebilly-tree-help-local-opus-r2/rebilly.yaml
grep -n "paymentInstrumentId:" -A 8 rebilly.yaml | sed -n '/15[45][0-9][0-9]/,+10p' | head -20; echo ---; redocly tree rebilly.yaml --format=ai --path=/customers/{id}|head -20
redocly tree rebilly.yaml --format=ai --component=schemas --name=Plan|head -8; echo ---; redocly tree rebilly.yaml --format=ai --operation=PostPlan|head -10; echo ---; redocly tree rebilly.yaml --format=ai --operation=PostProduct|head -10
redocly tree rebilly.yaml --format=ai --component=schemas --name=ContactObject|head -8
grep -n "^servers:" -A 8 rebilly.yaml; grep -n "REB-APIKEY" -B4 -A4 rebilly.yaml | head -30
sed -n '166,196p' /Users/tora/bench-run/rebilly-tree-help-local-opus-r2/rebilly.yaml
redocly tree rebilly.yaml --format=ai --component=schemas --name=PaymentInstrument|head -4; redocly tree rebilly.yaml --format=ai --component=schemas --name=VaultedInstrument|head -4
```

{% /tab %}
{% tab label="Opus 5 · run 3 · no tree" %}

```bash
ls -la rebilly.yaml && wc -l rebilly.yaml
grep -n "^  /" rebilly.yaml | head -200
sed -n '31374,31530p' rebilly.yaml
grep -n "^    Product:\|^    Plan:\|^    Subscription:\|^    PaymentInstrument:\|^    PaymentToken:\|^  requestBodies:\|^  schemas:\|^    Order:" rebilly.yaml
sed -n '12201,12320p' rebilly.yaml && echo "=====PRODUCT REQBODY" && sed -n '20455,20490p' rebilly.yaml
grep -n "^    SubscriptionPlan:\|^    OneTimeSalePlan:\|^    TrialOnlyPlan:\|^    SubscriptionOrOneTimeSale:\|^    PlanPricing\|^    RecurringInterval\|^    PlanRecurring" rebilly.yaml
sed -n '11888,12087p' rebilly.yaml
grep -n "^    PlanPriceFormula:\|^    ServicePeriodAnchorInstruction:" rebilly.yaml
sed -n '11615,11650p' rebilly.yaml && echo "=== fixed/flat?" && grep -n "^    FixedPriceFormula:\|^    FlatRatePriceFormula\|PriceFormula:" rebilly.yaml | head -30
grep -n "PlanFormulaFlatRate:\|PlanFormulaFixedFee:" rebilly.yaml
sed -n '11168,11260p' rebilly.yaml
sed -n '15233,15420p' rebilly.yaml
sed -n '15420,15700p' rebilly.yaml | grep -n "^        [a-zA-Z_]*:"
sed -n '15503,15525p;15537,15580p' rebilly.yaml && echo "=== SubscriptionItems" && grep -n "^    SubscriptionItems\?:\|^    OrderItem" rebilly.yaml
grep -n "SubscriptionOrOneTimeSaleItem:" rebilly.yaml
sed -n '15099,15233p' rebilly.yaml
grep -n "^    OriginalPlan:\|^    FlexiblePlan:\|^    WebsiteId:\|^    CustomerId:" rebilly.yaml
sed -n '12321,12345p' rebilly.yaml && echo "=== WebsiteId" && sed -n '2897,2915p' rebilly.yaml && echo "=== websites path?" && grep -n "^  /websites" rebilly.yaml
sed -n '37286,37300p' rebilly.yaml && echo "=== tokens post" && sed -n '34892,34960p' rebilly.yaml
grep -n "^    CompositeToken:\|^    PaymentCardToken:\|^    PaymentInstrumentToken:\|^    PaymentCardCreateToken\|^    PaymentCardPlain" rebilly.yaml
sed -n '17801,17830p' rebilly.yaml && echo "=== PaymentCardToken" && sed -n '17081,17200p' rebilly.yaml
sed -n '30460,30560p' rebilly.yaml
sed -n '30560,30620p' rebilly.yaml && echo "=== reqbody PaymentInstrument" && grep -n "^    PaymentInstrument:" rebilly.yaml && sed -n '20150,20200p' rebilly.yaml | grep -n "PaymentInstrument"
grep -n "PostPaymentInstrument:" rebilly.yaml
sed -n '20441,20456p' rebilly.yaml && echo "===" && grep -n "^    PaymentInstrumentToken:\|^    PaymentCardPlain:\|^    PaymentInstrumentCreateToken" rebilly.yaml
sed -n '10876,10940p' rebilly.yaml
sed -n '32660,32782p' rebilly.yaml && echo "=== websites tag" && grep -n "GetWebsiteCollection\|operationId: GetWebsite\|tags:$" rebilly.yaml | grep -i website
sed -n '32620,32662p' rebilly.yaml && echo "=== servers" && grep -n "url: https://api" rebilly.yaml | head -5 && echo "=== security schemes" && grep -n "SecretApiKey:\|PublishableApiKey:" rebilly.yaml | head
sed -n '160,245p' rebilly.yaml
grep -n "^    ContactObject:" rebilly.yaml
sed -n '3261,3290p' rebilly.yaml && echo "=== defaultPaymentInstrument in Customer" && grep -n "defaultPaymentInstrument" rebilly.yaml | head
sed -n '3540,3600p' rebilly.yaml
sed -n '28565,28630p' rebilly.yaml
sed -n '31085,31130p' rebilly.yaml && echo "=== collectionFilter" && grep -n "    collectionFilter:" rebilly.yaml
grep -n "    subscriptionExpand:" rebilly.yaml
sed -n '447,475p;281,300p' rebilly.yaml
```

{% /tab %}
{% tab label="Opus 5 · run 3 · tree" %}

```bash
ls && redocly tree --help
redocly tree rebilly.yaml --format=ai --find "subscription" | head -60
redocly tree rebilly.yaml --format=ai --operation=PostSubscription | head -60
redocly tree rebilly.yaml --format=ai --component=schemas --name=SubscriptionOrOneTimeSale | head -80
redocly tree rebilly.yaml --format=ai --component=schemas --name=Subscription | head -100
redocly tree rebilly.yaml --format=ai --component=schemas --name=SubscriptionOrOneTimeSaleItem | head -20; echo "=== WEBSITE ==="; redocly tree rebilly.yaml --format=ai --find "website" | head -20; echo "=== PLAN ==="; redocly tree rebilly.yaml --format=ai --find "plan" | head -20; echo "=== PRODUCT ==="; redocly tree rebilly.yaml --format=ai --find "product" | head -20
redocly tree rebilly.yaml --format=ai --component=schemas --name=WebsiteId|head -8; echo "=== PRODUCT ==="; redocly tree rebilly.yaml --format=ai --component=schemas --name=Product | head -10; echo "=== SUBPLAN ==="; redocly tree rebilly.yaml --format=ai --component=schemas --name=SubscriptionPlan | head -12
redocly tree rebilly.yaml --format=ai --operation=PostPlan|head -8; echo "=== OrigPlan ==="; redocly tree rebilly.yaml --format=ai --component=schemas --name=OriginalPlan|head -8; echo "=== FlexPlan ==="; redocly tree rebilly.yaml --format=ai --component=schemas --name=FlexiblePlan|head -8; echo "=== FixedFee ==="; redocly tree rebilly.yaml --format=ai --component=schemas --name=PlanFormulaFixedFee|head -8
redocly tree rebilly.yaml --format=ai --component=schemas --name=Plan|head -8; echo "=== PostProduct ==="; redocly tree rebilly.yaml --format=ai --operation=PostProduct|head -6; echo "=== INSTR ==="; redocly tree rebilly.yaml --format=ai --find "payment instrument" | head -30
redocly tree rebilly.yaml --format=ai --operation=PostToken|head -8; echo "=== PostPI ==="; redocly tree rebilly.yaml --format=ai --operation=PostPaymentInstrument|head -8; echo "=== PICreateToken ==="; redocly tree rebilly.yaml --format=ai --component=schemas --name=PaymentInstrumentCreateToken|head -8
redocly tree rebilly.yaml --format=ai --find "activation"|head -20; echo "=== PI ==="; redocly tree rebilly.yaml --format=ai --component=schemas --name=PaymentInstrument|head -6; echo "=== CompositeToken ==="; redocly tree rebilly.yaml --format=ai --component=schemas --name=CompositeToken|head -8
redocly tree rebilly.yaml --format=ai --component=schemas --name=PaymentCardToken|head -8; echo "=== INVOICES ==="; redocly tree rebilly.yaml --format=ai --find "invoice"|head -30
redocly tree rebilly.yaml --format=ai --find "payment"|grep -E "^(get|post|put) /payments|^post /payments"|head; echo "=== status desc ==="; sed -n '15288,15300p' rebilly.yaml
redocly tree rebilly.yaml --format=ai --path=/payments|head -20; echo "=== grep status ==="; awk 'NR>=15300 && NR<=15340' rebilly.yaml
redocly tree rebilly.yaml --operations|grep -iE "website|organization"|head; echo "=== CUSTOMER GET ==="; redocly tree rebilly.yaml --format=ai --operation=GetCustomer|head -5; echo "=== ContactObject ==="; redocly tree rebilly.yaml --format=ai --component=schemas --name=ContactObject|head -5
redocly tree rebilly.yaml --format=ai --component=schemas --name=PlanPriceFormula|head -6; echo "=== reqbody ==="; redocly tree rebilly.yaml --format=ai --component=requestBodies --name=Subscription|head -6; echo "=== PlanSetup ==="; redocly tree rebilly.yaml --format=ai --component=schemas --name=PlanSetup|head -5
redocly tree rebilly.yaml --format=ai|head -25
```

{% /tab %}
{% tab label="Opus 5 · run 4 · no tree" %}

```bash
ls -la rebilly.yaml && wc -l rebilly.yaml
grep -n "^  /" rebilly.yaml | head -200
sed -n '31374,31420p;31004,31060p' rebilly.yaml
grep -n "^    Product:\|^    Plan:\|^    Subscription:\|^    PaymentInstrument:\|^    Token:\|^    PlanRequest\|^    ProductRequest\|^    SubscriptionRequest\|^    PaymentCardToken" rebilly.yaml
sed -n '12201,12240p' rebilly.yaml && echo "=== Subscription ===" && sed -n '15233,15280p' rebilly.yaml && echo "=== PaymentInstrument ===" && sed -n '10722,10770p' rebilly.yaml
grep -n "websites\|Website:" rebilly.yaml | head -30
sed -n '37280,37300p' rebilly.yaml && echo "---gwaccounts---" && grep -n "^  /gateway-accounts" rebilly.yaml
sed -n '12215,12330p' rebilly.yaml
grep -n "^    SubscriptionPlan:\|^    OneTimeSalePlan:\|^    PlanBase\|^    RecurringInterval\|^    PricingPlan\|^    PlanPricing" rebilly.yaml
sed -n '11888,12201p' rebilly.yaml
grep -n "^    PlanPriceFormula:\|^    FlatRatePricing\|^    PlanSetup:\|^    PlanTrial:" rebilly.yaml
sed -n '11615,11650p' rebilly.yaml && echo "=== FixedFee etc ===" && grep -n "^    FixedFeePlanPrice\|^    FlatRatePlanPrice\|PlanPriceFormula" rebilly.yaml | head
grep -n "PlanFormulaFixedFee:" rebilly.yaml && awk 'NR>=1 && /^    PlanFormulaFixedFee:/{f=1} f{print NR": "$0} f&&/^    PlanFormulaFlatRate:/{exit}' rebilly.yaml | head -40
sed -n '15280,15600p' rebilly.yaml
grep -n "^    SubscriptionOrOneTimeSaleItem:" rebilly.yaml
sed -n '15099,15233p' rebilly.yaml && echo "=== OriginalPlan ===" && sed -n '12326,12400p' rebilly.yaml
sed -n '30460,30560p' rebilly.yaml
sed -n '30560,30700p' rebilly.yaml
grep -n "    PostPaymentInstrument:" rebilly.yaml && grep -n "^    PaymentCardPaymentInstrument\|^    PaymentCardRequest\|CreatePaymentCard" rebilly.yaml | head
sed -n '20441,20480p' rebilly.yaml
grep -n "^    PaymentInstrumentCreateToken:" rebilly.yaml
sed -n '10876,10960p' rebilly.yaml
sed -n '32640,32700p' rebilly.yaml
sed -n '1,60p' rebilly.yaml && echo "=== sec ===" && grep -n "SecretApiKey:" rebilly.yaml | head -3
sed -n '165,250p' rebilly.yaml
sed -n '28565,28627p' rebilly.yaml
sed -n '35330,35420p' rebilly.yaml
sed -n '35258,35332p' rebilly.yaml
grep -n "    TransactionRequest:" rebilly.yaml && grep -n "^    CreateTransaction\|^    TransactionCreate" rebilly.yaml | head
sed -n '20508,20525p' rebilly.yaml
sed -n '20525,20620p' rebilly.yaml
grep -n "^    PaymentInstruction:" rebilly.yaml
sed -n '18061,18140p' rebilly.yaml
grep -n "^    PaymentInstructionInstrument:" rebilly.yaml && sed -n "$(grep -n '^    PaymentInstructionInstrument:' rebilly.yaml | cut -d: -f1),+30p" rebilly.yaml
sed -n '34892,34960p' rebilly.yaml
sed -n '17081,17130p' rebilly.yaml && echo "=== anchor ===" && sed -n "$(grep -n '^    ServicePeriodAnchorInstruction:' rebilly.yaml | cut -d: -f1),+45p" rebilly.yaml
sed -n '17130,17230p' rebilly.yaml
sed -n "$(grep -n '^    ContactObject:' rebilly.yaml | cut -d: -f1),+40p" rebilly.yaml
awk '/^    Invoice:/{f=1} f&&/^      properties:/{p=1} p&&/^        [a-zA-Z]+:/{print NR": "$0} f&&/^    InvoiceItem:/{exit}' rebilly.yaml | head -50
```

{% /tab %}
{% tab label="Opus 5 · run 4 · tree" %}

```bash
ls && redocly tree --help
redocly tree rebilly.yaml --format=ai --find "subscription" | head -60
redocly tree rebilly.yaml --format=ai --operation=PostSubscription | head -80
redocly tree rebilly.yaml --format=ai --component=schemas --name=SubscriptionOrOneTimeSale | head -60; echo ====; redocly tree rebilly.yaml --format=ai --component=schemas --name=Subscription | head -80
redocly tree rebilly.yaml --format=ai --component=schemas --name=Subscription --with-deps | head -200
cd /Users/tora/bench-run/rebilly-tree-help-local-opus-r4
for f in website product plan "payment-instrument" "payment token"; do echo "=== $f"; redocly tree rebilly.yaml --format=ai --find "$f" | head -25; done
redocly tree rebilly.yaml --format=ai --component=schemas --name=WebsiteId|head -20
redocly tree rebilly.yaml --format=ai --component=schemas --name=Product|head -20
redocly tree rebilly.yaml --format=ai --find "customer"|head -12
redocly tree rebilly.yaml --format=ai --component=schemas --name=SubscriptionPlan|head -20
redocly tree rebilly.yaml --format=ai --component=schemas --name=SubscriptionOrOneTimeSaleItem|head -20
redocly tree rebilly.yaml --format=ai --component=schemas --name=Plan|head -8
redocly tree rebilly.yaml --format=ai --component=schemas --name=PlanFormulaFixedFee|head -8
redocly tree rebilly.yaml --format=ai --component=schemas --name=PlanPriceFormula|head -8
redocly tree rebilly.yaml --format=ai --operation=PostPlan|head -12
redocly tree rebilly.yaml --format=ai --operation=PostToken|head -12
redocly tree rebilly.yaml --format=ai --operation=PostPaymentInstrument|head -12
redocly tree rebilly.yaml --format=ai --pointer='#/components/requestBodies/PostPaymentInstrument'|head -12
redocly tree rebilly.yaml --format=ai --component=schemas --name=PaymentInstrumentCreateToken|head -10
redocly tree rebilly.yaml --format=ai --component=schemas --name=PaymentCardToken|head -10
redocly tree rebilly.yaml --format=ai --find "activate"|head -15
redocly tree rebilly.yaml --format=ai --find "invoice"|head -30
sed -n '15290,15330p' rebilly.yaml
redocly tree rebilly.yaml --format=ai --operations | grep -iE "website|organization|gateway|/tokens|customers$|^get /customers " | head -20
redocly tree rebilly.yaml --format=ai --operations | tail -3
redocly tree rebilly.yaml --format=ai --operation=GetCustomerCollection|head -8
redocly tree rebilly.yaml --format=ai --component=schemas --name=PaymentInstrument|head -6
redocly tree rebilly.yaml --format=ai --pointer='#/components/parameters/collectionFilter'|head -6
grep -n -A8 "^servers:" rebilly.yaml | head -20; grep -n -A5 "SecretApiKey:" rebilly.yaml | head -20
sed -n '166,200p' rebilly.yaml; sed -n '226,250p' rebilly.yaml
```

{% /tab %}
{% tab label="Opus 5 · run 5 · no tree" %}

```bash
ls -la rebilly.yaml && wc -l rebilly.yaml
grep -n "^  /" rebilly.yaml | head -200
sed -n '31374,31530p' rebilly.yaml
grep -n "^    Product:\|^    Plan:\|^    Subscription:\|^    PaymentInstrument:\|^    Customer:\|^    Token:\|^    PaymentCardToken\|^    SubscriptionOrder" rebilly.yaml
sed -n '12201,12240p' rebilly.yaml && echo "=== 15233 ===" && sed -n '15233,15290p' rebilly.yaml && echo "=== 20460 ===" && sed -n '20455,20500p' rebilly.yaml
grep -n "^  /" rebilly.yaml | sed -n '200,300p'
sed -n '37277,37295p' rebilly.yaml && echo "--- websites schema ---" && grep -n "websites:" rebilly.yaml | head -20
grep -n "websites" rebilly.yaml | head -30
grep -n "^    SubscriptionPlan:\|^    PlanRecurringFields\|^    OneTimeSalePlan:\|^    TrialOnlyPlan:\|^    PlanBase\|^    SubscriptionOrOneTimeSale:\|^    OrderItem\|^    SubscriptionItem" rebilly.yaml
sed -n '11888,12090p' rebilly.yaml
grep -n "^    PlanPriceFormula:\|^    ServicePeriodAnchorInstruction:\|^    PlanSetup:" rebilly.yaml
sed -n '11615,11650p' rebilly.yaml && echo "=== anchor ===" && sed -n '11743,11800p' rebilly.yaml && echo "=== FixedPriceFormula ===" && grep -n "FixedPriceFormula\|FlatRatePricing\|^    .*PriceFormula" rebilly.yaml | head
grep -n "PlanFormulaFixedFee:\|PlanFormulaFlatRate:" rebilly.yaml
sed -n '11168,11230p' rebilly.yaml
sed -n '15290,16060p' rebilly.yaml | grep -n "^        [a-zA-Z_]*:"
sed -n '15380,15420p;15494,15530p;15563,15580p' rebilly.yaml && echo "=== items+autopay ===" && sed -n '15564,15572p' rebilly.yaml
grep -n "    SubscriptionOrOneTimeSaleItem:" rebilly.yaml
sed -n '15099,15160p' rebilly.yaml && echo "=== 16038 SubscriptionOrOneTimeSale ===" && sed -n '16038,16060p' rebilly.yaml
grep -n "^    OriginalPlan:\|^    FlexiblePlan:" rebilly.yaml
sed -n '12321,12345p' rebilly.yaml
sed -n '34892,34990p' rebilly.yaml
grep -n "^    CompositeToken:" rebilly.yaml && sed -n '17081,17140p' rebilly.yaml
sed -n '17801,17830p' rebilly.yaml && echo "=== PI post ===" && sed -n '30460,30560p' rebilly.yaml
sed -n '30560,30600p' rebilly.yaml && echo "=== reqbody PaymentInstrument ===" && grep -n "^    PaymentInstrument:" rebilly.yaml && sed -n '20420,20462p' rebilly.yaml
grep -n "^    PaymentInstrumentCreateToken:" rebilly.yaml
sed -n '10876,10940p' rebilly.yaml
sed -n '17140,17250p' rebilly.yaml | grep -n "^        [a-zA-Z]*:" && echo "---" && awk 'NR>=17140 && NR<=17280 && /^        (token|id|expirationTime|isUsed|leadSource|billingAddress|customerId):/' rebilly.yaml
sed -n '17157,17165p' rebilly.yaml
sed -n '32660,32700p' rebilly.yaml && echo "=== status ===" && sed -n '15306,15330p' rebilly.yaml
grep -n "^servers:" rebilly.yaml && sed -n "$(grep -n '^servers:' rebilly.yaml | head -1 | cut -d: -f1),+25p" rebilly.yaml && echo "=== sec ===" && grep -n "^  securitySchemes:" rebilly.yaml && sed -n "$(grep -n '^  securitySchemes:' rebilly.yaml | cut -d: -f1),+30p" rebilly.yaml
sed -n '222,245p' rebilly.yaml && echo "=== customers GET id ===" && sed -n '25986,26010p' rebilly.yaml
grep -n "^    ContactObject:" rebilly.yaml && sed -n "$(grep -n '^    ContactObject:' rebilly.yaml | cut -d: -f1),+30p" rebilly.yaml && echo "=== initialInvoiceId ===" && sed -n '15546,15562p' rebilly.yaml
```

{% /tab %}
{% tab label="Opus 5 · run 5 · tree" %}

```bash
ls && redocly tree --help
redocly tree rebilly.yaml --format=ai --find "subscription"
redocly tree rebilly.yaml --format=ai --operation=PostSubscription --with-deps | head -300
redocly tree rebilly.yaml --format=ai --component=schemas --name=SubscriptionOrOneTimeSaleItem --with-deps | head -60
redocly tree rebilly.yaml --format=ai --find "plan product website" | head -60
redocly tree rebilly.yaml --format=ai --find "plan" | head -40; echo ===; redocly tree rebilly.yaml --format=ai --find "product" | head -20; echo ===; redocly tree rebilly.yaml --format=ai --find "website" | head -20
redocly tree rebilly.yaml --format=ai --find "products" | head -20; echo ---; redocly tree rebilly.yaml --format=ai --find "websites" | head -20; echo ---; redocly tree rebilly.yaml --format=ai --find "payment instrument" | head -40
redocly tree rebilly.yaml --format=ai --component=schemas --name=WebsiteId | head -20; echo ---; redocly tree rebilly.yaml --format=ai --operation=PostProduct --with-deps | head -40
redocly tree rebilly.yaml --format=ai --component=schemas --name=SubscriptionPlan --with-deps | head -60
redocly tree rebilly.yaml --format=ai --operation=PostToken --with-deps | head -50
redocly tree rebilly.yaml --format=ai --operation=PostPaymentInstrument --with-deps | head -50
redocly tree rebilly.yaml --format=ai --operations | grep -iE "website|organization" | head -20
redocly tree rebilly.yaml --format=ai --component=requestBodies --name=Subscription --with-deps | head -20
redocly tree rebilly.yaml --format=ai --component=schemas --name=Subscription | python3 -c "
import sys,json,re
t=sys.stdin.read()
s=t.split('--- json',1)[1].split('--- deps')[0]
d=json.loads(s)
p=d['properties']
for k in ['autopay','paymentInstrumentId','startTime','currency','websiteId','customerId','items','orderType','trial','delinquencyPeriod','billingStatus','status','poNumber','notes','billingAddress']:
if k in p: print(k, json.dumps(p[k])[:400]); print()
"
import sys,json
s=t.split('--- json',1)[1].strip().split('\n')[0]
print('required:',d.get('required'))
for k in ['autopay','paymentInstrumentId','startTime','currency','websiteId','customerId','items','orderType','trial','delinquencyPeriod','billingStatus','status','recurringInterval','inTrial']:
if k in p: print(k,'::', json.dumps(p[k])[:500]); print()
redocly tree rebilly.yaml --format=ai --find "activate instrument" | head -20; echo ---; redocly tree rebilly.yaml --format=ai --path=/customers/{id} | head; echo ---; redocly tree rebilly.yaml --format=ai --component=schemas --name=Customer | head -8
redocly tree rebilly.yaml --format=ai --component=schemas --name=VaultedInstrument|head -6; echo ---; redocly tree rebilly.yaml --format=ai --component=schemas --name=Plan|head -6; echo ---; redocly tree rebilly.yaml --format=ai --component=schemas --name=PlanFormulaFixedFee|head -6; echo ---; redocly tree rebilly.yaml --format=ai --component=schemas --name=PaymentCardToken|head -6
redocly tree rebilly.yaml --format=ai --operation=GetCustomerCollection|head -8; echo ---; redocly tree rebilly.yaml --format=ai --operation=PostPlan|head -8; echo ---; redocly tree rebilly.yaml --format=ai --component=parameters --name=subscriptionExpand|head -6
redocly tree rebilly.yaml --format=ai|head -20; echo ---; redocly tree rebilly.yaml --format=ai --component=parameters --name=collectionFilter|sed -n '3,4p'|head -c 1500
redocly tree rebilly.yaml --format=ai --operation=PutCustomer|sed -n '3p'|head -c 900; echo; echo ---; redocly tree rebilly.yaml --format=ai --component=requestBodies --name=Customer|head -5
```

{% /tab %}
{% /tabs %}

{% /tab %}
{% tab label="Haiku 4.5" %}

{% tabs %}
{% tab label="Haiku 4.5 · run 1 · no tree" %}

```bash
cat rebilly.yaml
grep "^  /subscriptions|^  /plans|^  /invoices|^  /customers" rebilly.yaml
grep "/(subscriptions|plans|customers).*?post:|get:|put:" rebilly.yaml | head -100
grep "^/[a-zA-Z].*subscriptions|^/[a-zA-Z].*plans" rebilly.yaml
grep "paths:|/subscriptions|/plans" rebilly.yaml | head -50
sed -n '31000,31500p' rebilly.yaml
sed -n '32539,32939p' rebilly.yaml
grep "components:.*schemas:.*Subscription:|SubscriptionOrOneTimeSale:" rebilly.yaml | head -20
sed -n '16038,16338p' rebilly.yaml
grep "^    Subscription:" rebilly.yaml
sed -n '15233,15733p' rebilly.yaml
grep "/payment-instruments|/payment-methods" rebilly.yaml
grep "requestBodies:.*Subscription" rebilly.yaml
grep "requestBodies:" rebilly.yaml | head -30
sed -n '20150,20350p' rebilly.yaml
grep -n "Subscription:" rebilly.yaml | grep requestBodies -A 10
grep -n "^    Subscription:" rebilly.yaml
sed -n '20470,20570p' rebilly.yaml
```

{% /tab %}
{% tab label="Haiku 4.5 · run 1 · tree" %}

```bash
redocly tree --help
redocly tree rebilly.yaml --format=ai --find="recurring"
redocly tree rebilly.yaml --format=ai --find="subscription"
redocly tree rebilly.yaml --format=ai --path=/subscriptions --operation=post --with-deps
redocly tree rebilly.yaml --format=ai --find="plan" | head -100
redocly tree rebilly.yaml --format=ai --component=schemas --name=Subscription
redocly tree rebilly.yaml --format=ai --component=schemas --name=SubscriptionOrOneTimeSaleItem
redocly tree rebilly.yaml --format=ai --component=schemas --name=OriginalPlan
redocly tree rebilly.yaml --format=ai --path=/plans --operation=post --with-deps | head -150
redocly tree rebilly.yaml --format=ai --component=schemas --name=SubscriptionPlan | head -200
redocly tree rebilly.yaml --format=ai --component=schemas --name=PlanPriceFormula
redocly tree rebilly.yaml --format=ai --component=schemas --name=PlanFormulaFixedFee
redocly tree rebilly.yaml --format=ai --find="payment instrument"
redocly tree rebilly.yaml --format=ai --find="product" | head -80
redocly tree rebilly.yaml --format=ai --component=schemas --name=Product
redocly tree rebilly.yaml --format=ai --find="website" | head -50
redocly tree rebilly.yaml --format=ai --component=schemas --name=WebsiteId
```

{% /tab %}
{% tab label="Haiku 4.5 · run 2 · no tree" %}

```bash
cat rebilly.yaml
grep "(subscription|plan|recurring|billing|paymentInstrument|customer)" rebilly.yaml
grep "^\\s*(post|get|patch|put):\\s*/.*subscription" rebilly.yaml
grep "/subscriptions|/plans" rebilly.yaml
sed -n '32539,32839p' rebilly.yaml
grep "/payment-instruments" rebilly.yaml | head -30
sed -n '31004,31254p' rebilly.yaml
sed -n '30460,30710p' rebilly.yaml
grep "Subscription.*schema|recurringPeriod|paymentInstrumentId" rebilly.yaml | head -40
grep "SubscriptionOrOneTimeSale|customerId.*type: string" rebilly.yaml | head -50
sed -n '16038,16438p' rebilly.yaml
grep "^    Subscription:\\s*$|description.*Subscription.*object" rebilly.yaml | head -30
sed -n '15233,15633p' rebilly.yaml
```

{% /tab %}
{% tab label="Haiku 4.5 · run 2 · tree" %}

```bash
redocly tree --help
redocly tree rebilly.yaml --format=ai --find recurring
redocly tree rebilly.yaml --format=ai --find subscription
redocly tree rebilly.yaml --format=ai --path=/subscriptions --operation=post --with-deps
redocly tree rebilly.yaml --format=ai --component=schemas --name=SubscriptionOrOneTimeSaleItem
redocly tree rebilly.yaml --format=ai --component=schemas --name=SubscriptionPlan
redocly tree rebilly.yaml --format=ai --find "plans"
redocly tree rebilly.yaml --format=ai --path=/plans --operation=post --with-deps
redocly tree rebilly.yaml --format=ai --component=requestBodies --name=Subscription
redocly tree rebilly.yaml --format=ai --component=schemas --name=Subscription --with-deps
```

{% /tab %}
{% tab label="Haiku 4.5 · run 3 · no tree" %}

```bash
cat rebilly.yaml
grep "plan|subscription|recurring|billing" rebilly.yaml | head -100
grep "^  /customers|^  /plans|^  /subscriptions" rebilly.yaml | head -50
sed -n '32539,32789p' rebilly.yaml
grep "requestBodies:.*Subscription" rebilly.yaml | head -30
grep "Subscription:" rebilly.yaml | head -20
sed -n '15233,15313p' rebilly.yaml
sed -n '15300,15450p' rebilly.yaml
sed -n '15450,15600p' rebilly.yaml
grep "SubscriptionOrOneTimeSaleItem:" rebilly.yaml
sed -n '15099,15199p' rebilly.yaml
sed -n '31004,31154p' rebilly.yaml
grep "OriginalPlan:|FlexiblePlan:" rebilly.yaml
sed -n '12321,12421p' rebilly.yaml
grep "payment-instrument|payment instrument" rebilly.yaml | head -30
grep -n "^  /payment-instruments" rebilly.yaml | head -5
sed -n '25753,25853p' rebilly.yaml
grep -n "/customers/{id}/payment-instruments" rebilly.yaml | head -5
sed -n '30460,30610p' rebilly.yaml
```

{% /tab %}
{% tab label="Haiku 4.5 · run 3 · tree" %}

```bash
redocly tree --help
redocly tree rebilly.yaml --find "recurring" --format=ai
redocly tree rebilly.yaml --find "subscription" --format=ai
redocly tree rebilly.yaml --find "plan" --format=ai
redocly tree rebilly.yaml --path=/subscriptions --operation=post --format=ai --with-deps
redocly tree rebilly.yaml --component=requestBodies --name=Subscription --format=ai --with-deps
redocly tree rebilly.yaml --component=schemas --name=SubscriptionOrOneTimeSaleItem --format=ai --with-deps
redocly tree rebilly.yaml --component=schemas --name=OriginalPlan --format=ai --with-deps
redocly tree rebilly.yaml --find "payment instrument" --format=ai
redocly tree rebilly.yaml --path=/customers --operation=get --format=ai
redocly tree rebilly.yaml --component=schemas --name=Subscription --format=ai
redocly tree rebilly.yaml --path=/plans --operation=post --format=ai --with-deps
redocly tree rebilly.yaml --component=schemas --name=SubscriptionPlan --format=ai
redocly tree rebilly.yaml --component=schemas --name=PlanPriceFormula --format=ai
redocly tree rebilly.yaml --component=schemas --name=PlanFormulaFixedFee --format=ai
redocly tree rebilly.yaml --component=schemas --name=Customer --format=ai
```

{% /tab %}
{% tab label="Haiku 4.5 · run 4 · no tree" %}

```bash
cat rebilly.yaml
grep "recurr|subscription|billing|plan|invoice" rebilly.yaml
grep "^  /.*subscription|^  /.*plan|^  /.*recurr" rebilly.yaml
sed -n '31004,31204p' rebilly.yaml
sed -n '32539,32789p' rebilly.yaml
grep "^  Plan:" rebilly.yaml | head -5
grep "Plan:" rebilly.yaml | head -3
sed -n '11888,12088p' rebilly.yaml
grep "^    SubscriptionOrder:" rebilly.yaml | head -1
grep "Subscription:" rebilly.yaml | head -10
sed -n '15233,15383p' rebilly.yaml
sed -n '15400,15500p' rebilly.yaml
grep "items:" rebilly.yaml | head -20
grep "OrderItem:" rebilly.yaml
sed -n '32645,32695p' rebilly.yaml
grep "requestBodies:" rebilly.yaml | head -5
sed -n '20150,20300p' rebilly.yaml
grep -n "Subscription:" rebilly.yaml | head -20
sed -n '20470,20670p' rebilly.yaml
grep -n "SubscriptionOrOneTimeSale:" rebilly.yaml
sed -n '16038,16188p' rebilly.yaml
sed -n '15500,15600p' rebilly.yaml
grep -n "SubscriptionOrOneTimeSaleItem:" rebilly.yaml
sed -n '15099,15249p' rebilly.yaml
grep -n "OriginalPlan:" rebilly.yaml
sed -n '12321,12371p' rebilly.yaml
```

{% /tab %}
{% tab label="Haiku 4.5 · run 4 · tree" %}

```bash
redocly tree --help
redocly tree rebilly.yaml --format=ai --find="recurring"
redocly tree rebilly.yaml --format=ai --find="subscription"
redocly tree rebilly.yaml --format=ai --find="plan" | head -100
redocly tree rebilly.yaml --format=ai --path="/subscriptions" --operation="post" --with-deps
redocly tree rebilly.yaml --format=ai --component="requestBodies" --name="Subscription" --with-deps
redocly tree rebilly.yaml --format=ai --component="schemas" --name="Subscription" --with-deps | head -200
redocly tree rebilly.yaml --format=ai --component="schemas" --name="SubscriptionOrOneTimeSaleItem" --with-deps
redocly tree rebilly.yaml --format=ai --path="/plans" --operation="get"
redocly tree rebilly.yaml --format=ai --find="customer" --path="/customers" | head -50
redocly tree rebilly.yaml --format=ai --path="/customers" --operation="get"
redocly tree rebilly.yaml --format=ai --find="customer" | head -100
redocly tree rebilly.yaml --format=ai --path="/customers" --operation="get" --with-deps | grep -A 5 "websiteId"
```

{% /tab %}
{% tab label="Haiku 4.5 · run 5 · no tree" %}

```bash
cat rebilly.yaml
grep "subscription|recurring|plan|invoice" rebilly.yaml | head -100
grep "^  /subscriptions|^  /plans|^  /customers" rebilly.yaml | head -150
sed -n '32539,32839p' rebilly.yaml
grep "^    Subscription:|^      customerId:|^      websiteId:|^      items:|^      planId:|billingPeriod" rebilly.yaml | head -100
sed -n '20470,20870p' rebilly.yaml
grep "^    SubscriptionOrOneTimeSale:" rebilly.yaml
grep -n "^    SubscriptionOrOneTimeSale:" rebilly.yaml
sed -n '16038,16638p' rebilly.yaml
grep -n "^    Subscription:" rebilly.yaml | head -1
sed -n '15233,16033p' rebilly.yaml
grep -n "^    SubscriptionOrOneTimeSaleItem:" rebilly.yaml
sed -n '15099,15299p' rebilly.yaml
grep -n "^    OriginalPlan:\|^    FlexiblePlan:" rebilly.yaml
sed -n '12321,12471p' rebilly.yaml
grep "^  /plans\\$|billingPeriod|recurring" rebilly.yaml | head -50
```

{% /tab %}
{% tab label="Haiku 4.5 · run 5 · tree" %}

```bash
redocly tree --help
cat /Users/tora/bench-run/rebilly-tree-help-local-haiku-r5
ls -la /Users/tora/bench-run/rebilly-tree-help-local-haiku-r5/ | head -20
redocly tree rebilly.yaml --format=ai --find="recurring" | head -100
redocly tree rebilly.yaml --format=ai --find="subscription" | head -150
redocly tree rebilly.yaml --format=ai --path=/subscriptions --operation=post --with-deps
redocly tree rebilly.yaml --format=ai --component=requestBodies --name=Subscription
redocly tree rebilly.yaml --format=ai --component=schemas --name=Subscription --with-deps | head -300
redocly tree rebilly.yaml --format=ai --component=schemas --name=SubscriptionOrOneTimeSaleItem --with-deps | head -200
redocly tree rebilly.yaml --format=ai --component=schemas --name=SubscriptionPlan | head -150
redocly tree rebilly.yaml --format=ai --find="plan" | head -100
redocly tree rebilly.yaml --format=ai --path=/plans --operation=post --with-deps | head -200
redocly tree rebilly.yaml --format=ai --component=schemas --name=PlanPriceFormula
redocly tree rebilly.yaml --format=ai --component=schemas --name=PlanFormulaFixedFee
redocly tree rebilly.yaml --format=ai --find="product" | head -80
redocly tree rebilly.yaml --format=ai --component=schemas --name=Product | head -100
redocly tree rebilly.yaml --format=ai --find="customer" | head -80
redocly tree rebilly.yaml --format=ai --find="website" | head -80
```

{% /tab %}
{% /tabs %}

{% /tab %}
{% /tabs %}

Opus 5 passes everything; the index nearly halves its price. Sonnet 5 never passes without the index and passes four of five runs with it, and Haiku 4.5 goes from none to two — on this description the failures were always the same missing key header, and the card's `auth:` line is where that answer now comes from.
The sign flips on context for Sonnet 5 (+84%) because its five cheap control runs all produced broken flows: the working answer costs more than the broken one it replaces.

{% /tab %}

{% tab label="Stripe" %}

**Description:** 6.07 MB in one file.

**Task:** a paid tier with a 14-day free trial, billed monthly on the customer's saved card.
Expected: `POST /v1/products` → `POST /v1/prices` → `POST /v1/subscriptions`.
Traps: the legacy `/v1/plans` sits next to `/v1/prices` and still works; the trial rides on `trial_period_days`; one tag covers 589 operations, so tags navigate nothing.

{% tabs %}
{% tab label="Prompt: no tree" %}

```text
We're launching a paid tier for our product: an existing customer should get a 14-day
free trial and then be billed monthly on their saved card, automatically. Work out what
our backend has to call to set that up, end to end.

API description: stripe.yaml

Give me a working flow as JSON in your reply: the steps in order, what each one calls, what it
needs, and what to carry from its response into the next step. It has to work as written.
```

{% /tab %}
{% tab label="Prompt: tree" %}

```text
We're launching a paid tier for our product: an existing customer should get a 14-day
free trial and then be billed monthly on their saved card, automatically. Work out what
our backend has to call to set that up, end to end.

API description: stripe.yaml

The Redocly CLI is installed and its `tree` command can search the description for you.
Start with `redocly tree --help` to see what it can select, then work with `--format=ai`:
redocly tree stripe.yaml --format=ai <flags>

Give me a working flow as JSON in your reply: the steps in order, what each one calls, what it
needs, and what to carry from its response into the next step. It has to work as written.
```

{% /tab %}
{% /tabs %}

Context the run added, and the tool calls it took (medians over the working runs):

| Model           |        no tree |          tree | Difference |
| --------------- | -------------: | ------------: | ---------: |
| Sonnet 5 (n=5)  | 18,215 / 16 ❌ | 18,908 / 7 ❌ |        +4% |
| Opus 5 (n=5)    |    24,339 / 25 |   33,751 / 17 |       +39% |
| Haiku 4.5 (n=5) | 35,056 / 14 ❌ | 19,929 / 9 ❌ |       −43% |

What those runs were billed:

| Model           |  no tree |     tree | Difference |
| --------------- | -------: | -------: | ---------: |
| Sonnet 5 (n=5)  | $0.59 ❌ | $0.35 ❌ |       −41% |
| Opus 5 (n=5)    |    $1.40 |    $1.16 |       −17% |
| Haiku 4.5 (n=5) | $0.17 ❌ | $0.12 ❌ |       −29% |

Whether each run produced a flow that would run:

| Run               | no tree                                        | tree                                           |
| ----------------- | ---------------------------------------------- | ---------------------------------------------- |
| Sonnet 5 · run 1  | no auth scheme                                 | no product call, no price call, no auth scheme |
| Sonnet 5 · run 2  | no product call, no price call, no auth scheme | no product call, no auth scheme                |
| Sonnet 5 · run 3  | no product call, no price call, no auth scheme | no product call, no auth scheme                |
| Sonnet 5 · run 4  | no product call, no price call, no auth scheme | no auth scheme                                 |
| Sonnet 5 · run 5  | no auth scheme                                 | no auth scheme                                 |
| Opus 5 · run 1    | works                                          | works                                          |
| Opus 5 · run 2    | works                                          | works                                          |
| Opus 5 · run 3    | works                                          | works                                          |
| Opus 5 · run 4    | works                                          | works                                          |
| Opus 5 · run 5    | no auth scheme                                 | works                                          |
| Haiku 4.5 · run 1 | no product call, no price call, no auth scheme | no product call, no price call                 |
| Haiku 4.5 · run 2 | no product call, no price call, no auth scheme | no product call, no price call, no auth scheme |
| Haiku 4.5 · run 3 | no product call, no price call, no auth scheme | no product call, no price call, no auth scheme |
| Haiku 4.5 · run 4 | no product call, no price call, no auth scheme | no product call, no price call, no auth scheme |
| Haiku 4.5 · run 5 | no product call, no price call, no auth scheme | no product call, no price call, no auth scheme |

A run works when its flow contains `POST /v1/products`, `POST /v1/prices` (the legacy `/v1/plans` also counts) and a subscription create — `POST /v1/subscriptions` or the customer-scoped `POST /v1/customers/{customer}/subscriptions` — naming `customer`, `items` and `trial_period_days`, authenticated with the secret key.
A flow that starts from "your price id" assumes a catalog the task says does not exist yet, and fails.

What each run ran:

{% tabs %}
{% tab label="Sonnet 5" %}

{% tabs %}
{% tab label="Sonnet 5 · run 1 · no tree" %}

```bash
cat stripe.yaml
grep "^  /v1/(customers|subscriptions|payment_methods|prices|products)\"" stripe.yaml
grep "^  /v1/[a-z_/{}\\.]+:" stripe.yaml
sed -n '147301,147551p' stripe.yaml
sed -n '127440,127590p' stripe.yaml
grep "^    post:\" -A2" stripe.yaml
grep -n "trial_period_days|trial_end|default_payment_method|off_session|collection_method|payment_behavior" stripe.yaml
sed -n '88700,89000p' stripe.yaml
sed -n '89600,89680p' stripe.yaml
grep -n "^                customer:|^                items:|required:$" stripe.yaml
sed -n '88600,88700p' stripe.yaml
grep -n "customer:$" stripe.yaml | head -10
grep -n "^  /v1/customers/\\{customer\\}/subscriptions" stripe.yaml
sed -n '147550,147800p' stripe.yaml
grep -n "^                customer:|^                items:|^                payment_behavior:|^              required:\" -A5" stripe.yaml
sed -n '148920,148950p' stripe.yaml
grep -n "customer:$" stripe.yaml
sed -n '147960,148020p' stripe.yaml
sed -n '148890,148905p' stripe.yaml
sed -n '89098,89138p' stripe.yaml
# write /private/tmp/claude-501/-Users-tora-bench-run-stripe-control-v3-sonnet-r1/df4af1a9-fbce-424a-a308-0cc983f14377/scratchpad/stripe_flow.json
```

{% /tab %}
{% tab label="Sonnet 5 · run 1 · tree" %}

```bash
ls && redocly tree --help
redocly tree stripe.yaml --format=ai --find "subscription" | head -100
redocly tree stripe.yaml --format=ai --path=/v1/subscriptions --operation=post --with-deps | head -250
redocly tree stripe.yaml --format=ai --path=/v1/customers/{customer} --operation=get --with-deps | head -60
redocly tree stripe.yaml --format=ai --find "payment_methods" | head -20
```

{% /tab %}
{% tab label="Sonnet 5 · run 2 · no tree" %}

```bash
cat stripe.yaml
grep "^  /v1/(customers|subscriptions|prices|products|payment_methods|invoices)(\"|/)" stripe.yaml
grep -n "^  /v1/(customers|subscriptions|prices|products|payment_methods|invoices)(\"|/[a-zA-Z_{}\\/]*)?:$" stripe.yaml
grep -n "^  /v1/customers/\\{customer\\}:$" stripe.yaml
sed -n '147301,147501p' stripe.yaml
grep -n "^    post:$" stripe.yaml
grep -n "operationId: PostSubscriptions$" stripe.yaml
sed -n '147586,147986p' stripe.yaml
sed -n '147986,148336p' stripe.yaml
grep -n "trial_period_days|trial_settings|trial_end" stripe.yaml
grep -n "trial_period_days:|trial_settings:|trial_end:" stripe.yaml
sed -n '148640,148710p' stripe.yaml
grep -n "operationId: GetCustomersCustomer$|operationId: GetPaymentMethods$" stripe.yaml
sed -n '127440,127520p' stripe.yaml
```

{% /tab %}
{% tab label="Sonnet 5 · run 2 · tree" %}

```bash
ls -la stripe.yaml; redocly tree --help | head -50
redocly tree stripe.yaml --format=ai --find="subscription" | head -100
redocly tree stripe.yaml --format=ai --path=/v1/subscriptions --operation=post --with-deps | head -300
redocly tree stripe.yaml --format=ai --component=schemas --name=invoice_setting_customer_setting | head -40
redocly tree stripe.yaml --format=ai --find="customer payment_methods" | head -30
redocly tree stripe.yaml --format=ai --path=/v1/customers/{customer} --operation=get | head -20
redocly tree stripe.yaml --format=ai --find="create a price" | head -20
redocly tree stripe.yaml --format=ai --path=/v1/customers/{customer} --operation=post | grep -o '"invoice_settings":{[^}]*}[^}]*}[^}]*}' | head -5
redocly tree stripe.yaml --format=ai --path=/v1/customers/{customer}/payment_methods --operation=get | head -20
```

{% /tab %}
{% tab label="Sonnet 5 · run 3 · no tree" %}

```bash
cat stripe.yaml
grep "^  /v1/(customers|subscriptions|payment_methods|invoices|prices|products)\"?:" stripe.yaml
grep "^  /v1/(customers/\\{customer\\}|payment_methods|subscriptions|subscriptions/\\{subscription_exposed_id\\}):" stripe.yaml
sed -n '127440,127600p' stripe.yaml
sed -n '147301,147341p' stripe.yaml
grep -n "operationId: PostSubscriptions$" stripe.yaml
grep -n "name: (customer|items|trial_period_days|default_payment_method|off_session|payment_behavior|collection_method|trial_settings|expand)$" stripe.yaml
sed -n '147586,147626p' stripe.yaml
grep "^        \\$ref:|schema:$" stripe.yaml | head -5
sed -n '147900,147960p' stripe.yaml
grep -n "^                (customer|items|trial_period_days|default_payment_method|payment_behavior|off_session|payment_settings|trial_from_plan|proration_behavior):$" stripe.yaml
sed -n '147977,148277p' stripe.yaml
sed -n '148660,148700p' stripe.yaml
grep -n "required:\\s*$" stripe.yaml | head -10
sed -n '148700,148740p' stripe.yaml
grep -n "operationId: GetCustomersCustomer$" stripe.yaml
```

{% /tab %}
{% tab label="Sonnet 5 · run 3 · tree" %}

```bash
redocly tree --help
redocly tree stripe.yaml --format=ai --find="subscription" | head -100
redocly tree stripe.yaml --format=ai --path=/v1/subscriptions --operation=post --with-deps | head -300
redocly tree stripe.yaml --format=ai --find="payment method" | head -60
redocly tree stripe.yaml --format=ai --path=/v1/customers/{customer}/payment_methods --operation=get | head -60
Artifact
```

{% /tab %}
{% tab label="Sonnet 5 · run 4 · no tree" %}

```bash
cat stripe.yaml
grep "^  /v1/(customers|subscriptions|prices|products|payment_methods|subscription_items)(/\\{[^}]+\\})?(/[a-z_]+)?:$" stripe.yaml
grep "^  /v1/(customers/\\{customer\\}|payment_methods/\\{payment_method\\}/attach|subscriptions/\\{subscription_exposed_id\\})" stripe.yaml
grep "^  /v1/(customers/|payment_methods/)" stripe.yaml
grep "^  /v1/customers/\\{" stripe.yaml
grep "customers/\\{customer\\}" stripe.yaml | head -20
sed -n '85051,85171p' stripe.yaml
grep "payment_methods/\\{payment_method\\}/attach" stripe.yaml
sed -n '128978,129048p' stripe.yaml
sed -n '147301,147341p' stripe.yaml
grep -n "^    post:" stripe.yaml
sed -n '147565,147605p' stripe.yaml
grep "^                (customer|items|trial_period_days|trial_end|default_payment_method|payment_behavior|collection_method|price|quantity):\" " stripe.yaml
sed -n '147900,148300p' stripe.yaml
grep "trial_period_days|trial_end|trial_settings\" -A3" stripe.yaml | head -40
sed -n '148900,148990p' stripe.yaml
grep -n "trial" stripe.yaml
grep -n "invoice_settings\" -A2" stripe.yaml | head -30
grep -n "invoice_settings:" stripe.yaml
sed -n '85451,85491p' stripe.yaml
sed -n '87677,87727p' stripe.yaml
sed -n '85088,85108p' stripe.yaml
```

{% /tab %}
{% tab label="Sonnet 5 · run 4 · tree" %}

```bash
ls && redocly tree --help
redocly tree stripe.yaml --format=ai --find="subscription" | head -100
redocly tree stripe.yaml --format=ai --path=/v1/subscriptions --operation=post --with-deps | head -300
redocly tree stripe.yaml --format=ai --find="payment_methods" | head -40
redocly tree stripe.yaml --format=ai --path=/v1/prices --operation=post | head -60
redocly tree stripe.yaml --format=ai --path=/v1/customers/{customer} --operation=get | head -30
redocly tree stripe.yaml --format=ai --component=schemas --name=invoice_setting_customer_setting | head -20
```

{% /tab %}
{% tab label="Sonnet 5 · run 5 · no tree" %}

```bash
wc -l stripe.yaml
Agent
```

{% /tab %}
{% tab label="Sonnet 5 · run 5 · tree" %}

```bash
redocly tree --help
redocly tree stripe.yaml --format=ai --find=subscription | head -100
redocly tree stripe.yaml --format=ai --path=/v1/subscriptions --operation=post --with-deps | head -300
redocly tree stripe.yaml --format=ai --path=/v1/customers/{customer} --operation=get --with-deps | head -60
redocly tree stripe.yaml --format=ai --path=/v1/prices --operation=post | head -60
redocly tree stripe.yaml --format=ai --find="list payment methods" | head -30
redocly tree stripe.yaml --format=ai --path=/v1/customers/{customer}/payment_methods --operation=get | head -30
```

{% /tab %}
{% /tabs %}

{% /tab %}
{% tab label="Opus 5" %}

{% tabs %}
{% tab label="Opus 5 · run 1 · no tree" %}

```bash
wc -l stripe.yaml; ls -la
grep -n "^  /v1/\(customers\|setup_intents\|subscriptions\|prices\|products\|payment_methods\|payment_intents\)[^:]*:" stripe.yaml | head -60
sed -n '132240,132420p' stripe.yaml
python3 -c "
import yaml,sys,json
d=yaml.safe_load(open('stripe.yaml'))
json.dump(d['paths'],open('/private/tmp/claude-501/-Users-tora-bench-run-stripe-control-v3-opus-r1/a6c314e8-1a88-4424-ac87-617b1e210cd3/scratchpad/paths.json','w'))
print('ok', len(d['paths']))
"
(pip3 install pyyaml -q | tail -2); python3 -c "import yaml; print('ok')"
python3 - <<'EOF'
import yaml, json, pickle
d = yaml.safe_load(open('stripe.yaml'))
pickle.dump(d, open('/private/tmp/claude-501/-Users-tora-bench-run-stripe-control-v3-opus-r1/a6c314e8-1a88-4424-ac87-617b1e210cd3/scratchpad/spec.pkl','wb'))
print(d.get('info'))
print(len(d['paths']))
EOF
cat > /private/tmp/claude-501/-Users-tora-bench-run-stripe-control-v3-opus-r1/a6c314e8-1a88-4424-ac87-617b1e210cd3/scratchpad/q.py <<'EOF'
import pickle, sys, json, textwrap
d = pickle.load(open('/private/tmp/claude-501/-Users-tora-bench-run-stripe-control-v3-opus-r1/a6c314e8-1a88-4424-ac87-617b1e210cd3/scratchpad/spec.pkl','rb'))
def body(path, method='post', depth=1):
op = d['paths'][path][method]
print('===', method.upper(), path, '|', op.get('operationId'))
print('DESC:', textwrap.shorten(str(op.get('description','')), 400))
rb = op.get('requestBody')
if not rb: print('(no body)'); return
sch = rb['content']['application/x-www-form-urlencoded']['schema']
req = set(sch.get('required') or [])
def walk(s, pre='', lvl=0):
for k,v in (s.get('properties') or {}).items():
r = '*' if k in (s.get('required') or []) else ' '
t = v.get('type') or ('anyOf' if 'anyOf' in v else '?')
en = v.get('enum')
print(f"{'  '*lvl}{r} {k}: {t}" + (f" enum={en}" if en else ''))
if lvl < depth:
sub = v
if 'anyOf' in v:
for a in v['anyOf']:
if a.get('type')=='object': sub=a
if sub.get('type')=='object' and sub.get('properties'):
walk(sub, lvl=lvl+1)
walk(sch)
if __name__ == '__main__':
for a in sys.argv[1:]:
p,_,m = a.partition('#')
body(p, m or 'post', depth=int(__import__('os').environ.get('DEPTH','1')))
python3 /private/tmp/claude-501/-Users-tora-bench-run-stripe-control-v3-opus-r1/a6c314e8-1a88-4424-ac87-617b1e210cd3/scratchpad/q.py /v1/subscriptions
import pickle, json
op=d['paths']['/v1/subscriptions']['post']
s=op['requestBody']['content']['application/x-www-form-urlencoded']['schema']
print('REQUIRED:', s.get('required'))
for k in ['customer','customer_account','items','trial_period_days','trial_end','trial_settings','payment_behavior','off_session','default_payment_method','collection_method','billing_mode']:
print('-----',k)
print(json.dumps(s['properties'][k], indent=1)[:2500])
DEPTH=0 python3 /private/tmp/claude-501/-Users-tora-bench-run-stripe-control-v3-opus-r1/a6c314e8-1a88-4424-ac87-617b1e210cd3/scratchpad/q.py /v1/products /v1/prices /v1/setup_intents | head -120
P=d['paths']
print([p for p in P if 'payment_method' in p or 'setup_intent' in p])
print()
s=P['/v1/prices']['post']['requestBody']['content']['application/x-www-form-urlencoded']['schema']
print('recurring:', json.dumps(s['properties']['recurring'], indent=1))
import pickle, json, textwrap
for path,m in [('/v1/customers/{customer}/payment_methods','get'),('/v1/payment_methods/{payment_method}/attach','post'),('/v1/customers/{customer}','post')]:
op=P[path][m]
print('===',m.upper(),path,op.get('operationId'))
print(textwrap.shorten(str(op.get('description')),300))
for p in op.get('parameters',[]):
print('  param',p['in'],p['name'],'req' if p.get('required') else '', p['schema'].get('enum') or p['schema'].get('type'))
rb=op.get('requestBody')
if rb:
s=rb['content']['application/x-www-form-urlencoded']['schema']
print('  body required:', s.get('required'))
print('   ', k, v.get('type') or 'anyOf', v.get('enum') or '')
P=d['paths']; C=d['components']['schemas']
s=P['/v1/customers/{customer}']['post']['requestBody']['content']['application/x-www-form-urlencoded']['schema']
print('invoice_settings:', json.dumps(s['properties']['invoice_settings'], indent=1)[:1200])
for name in ['subscription','setup_intent','payment_method']:
sch=C[name]
print('===',name,'props:', sorted(sch['properties'].keys()))
C=d['components']['schemas']
si=C['subscription_item']['properties']
print('sub_item props:', sorted(si.keys()))
print('status enum:', C['subscription']['properties']['status'].get('enum'))
print('latest_invoice:', json.dumps(C['subscription']['properties']['latest_invoice'])[:300])
inv=C['invoice']['properties']
print('invoice has confirmation_secret:', 'confirmation_secret' in inv, '| payment_intent:', 'payment_intent' in inv)
print('invoice props sample:', [k for k in sorted(inv) if 'pay' in k or 'confirm' in k or 'secret' in k])
print('si status:', C['setup_intent']['properties']['status'].get('enum'))
print('si usage:', C['setup_intent']['properties']['usage'])
print('invoice expandable:', C['invoice'].get('x-expandableFields'))
print('conf secret:', json.dumps(C['invoice']['properties']['confirmation_secret'], indent=1)[:600])
print('sub expandable:', C['subscription'].get('x-expandableFields'))
op=P['/v1/setup_intents/{intent}/confirm']['post']
print('confirm SI body:', list(s['properties'].keys()))
print(d.get('servers'))
print(json.dumps(d['components'].get('securitySchemes'), indent=1)[:600])
op=P['/v1/customers/{customer}'].get('get')
print('GET customer:', op.get('operationId'))
# check managed_payments (new?)
print(json.dumps(C['subscription']['properties']['managed_payments'])[:400])
s=d['paths']['/v1/webhook_endpoints']['post']['requestBody']['content']['application/x-www-form-urlencoded']['schema']
ev=s['properties']['enabled_events']['items'].get('enum')
print(len(ev) if ev else None)
want=[e for e in (ev or []) if e.startswith(('invoice.','customer.subscription','setup_intent.'))]
print(json.dumps(want, indent=0))
print('req:', s.get('required'))
print('props:', list(s['properties'].keys()))
```

{% /tab %}
{% tab label="Opus 5 · run 1 · tree" %}

```bash
ls -la && redocly tree --help
redocly tree stripe.yaml --format=ai --find "subscription" | head -80
redocly tree stripe.yaml --format=ai --operation=PostSubscriptions | head -150
cd /Users/tora/bench-run/stripe-tree-help-local-opus-r1
redocly tree stripe.yaml --format=ai --find "customer payment method" | head -30
redocly tree stripe.yaml --format=ai --find "price product" | head -30
redocly tree stripe.yaml --format=ai --path="/v1/products" --operation=post | head -20
echo
redocly tree stripe.yaml --format=ai --operation=PostPrices | head -20
redocly tree stripe.yaml --format=ai --operation=GetCustomersCustomerPaymentMethods | head -20
redocly tree stripe.yaml --format=ai --path="/v1/customers/{customer}" --operation=post | head -20
redocly tree stripe.yaml --format=ai --component=schemas --name=subscription | python3 -c "
import sys,json,re
t=sys.stdin.read()
m=re.search(r'--- json\n(.*?)\nrefs:',t,re.S) or re.search(r'--- json\n(.*)',t,re.S)
d=json.loads(m.group(1))
for k,v in d.get('properties',{}).items():
print(k, '|', str(v.get('description',''))[:110].replace('\n',' '))
print('REQUIRED:', d.get('required'))
"
redocly tree stripe.yaml --format=ai --webhooks | grep -iE "trial|invoice.payment|subscription" | head -30
redocly tree stripe.yaml --format=ai --component=schemas --name=subscription_item | python3 -c "
print(list(d.get('properties',{}).keys()))
redocly tree stripe.yaml --format=ai --webhooks | head -5
redocly tree stripe.yaml --format=ai --component=schemas --name=invoice | python3 -c "
redocly tree stripe.yaml --format=ai --component=schemas --name=setup_intent | python3 -c "
for k in ['payments','confirmation_secret','status','billing_reason','next_payment_attempt']:
print('##',k, json.dumps(d['properties'][k])[:600]);print()
redocly tree stripe.yaml --format=ai --component=schemas --name=invoice_payment | python3 -c "
print(json.dumps(d.get('properties',{}).get('payment'))[:800])
print('keys:',list(d.get('properties',{}).keys()))
redocly tree stripe.yaml --format=ai --operation=GetInvoices | python3 -c "
for p in d.get('parameters',[]): print(p['in'],p['name'],json.dumps(p.get('schema'))[:120])
redocly tree stripe.yaml --format=ai --component=schemas --name=invoices_payments_invoice_payment_associated_payment | tail -5
redocly tree stripe.yaml --format=ai --operation=PostSetupIntents | python3 -c "
s=d['requestBody']['content']['application/x-www-form-urlencoded']['schema']
for k in ['customer','payment_method','usage','confirm','payment_method_types','off_session','automatic_payment_methods','attach_to_self','flow_directions']:
if k in s['properties']: print('##',k,json.dumps(s['properties'][k])[:300])
print('required:',s.get('required'))
redocly tree stripe.yaml --format=ai --find "retrieve subscription" | grep -i "^get /v1/subscriptions"
head -40 stripe.yaml | grep -nA4 -iE "servers|security|title|version"
grep -c "Idempotency-Key" stripe.yaml
redocly tree stripe.yaml --format=ai | head -20
redocly tree stripe.yaml --format=ai --find "setup_intents" | grep "^get\|^post" | head
redocly tree stripe.yaml --format=ai --find "pay invoice" | grep "^post /v1/invoices" | head
redocly tree stripe.yaml --format=ai --path="/v1/invoices/{invoice}/pay" --operation=post | python3 -c "
m=re.search(r'--- json\n(.*?)\nrefs:',t,re.S)
print('opId',d['operationId'])
print(list(s['properties'].keys()))
```

{% /tab %}
{% tab label="Opus 5 · run 2 · no tree" %}

```bash
wc -l stripe.yaml && grep -n "^  /" stripe.yaml | head -100
sed -n '147301,147380p' stripe.yaml
awk 'NR>=147301 && NR<=148721' stripe.yaml | grep -n "    post:\|operationId:" | head
awk 'NR>=147586 && NR<=148721' stripe.yaml | grep -n "^                    [a-z_]*:" | head -80
awk 'NR>=147586 && NR<=148721' stripe.yaml | grep -n "^                  [a-z_]*:$"
awk 'NR>=147586 && NR<=148721' stripe.yaml | grep -n "^                [a-z_]*:"
A=147585; sed -n "$((A+393)),$((A+445))p;$((A+535)),$((A+560))p;$((A+1064)),$((A+1130))p" stripe.yaml
A=147585; sed -n "$((A+649)),$((A+700))p" stripe.yaml; echo ---; sed -n "$((A+1008+585)),$((A+1608+40))p" stripe.yaml | head -0
sed -n '127440,127520p' stripe.yaml
awk 'NR>=131359 && NR<=131911' stripe.yaml | grep -n "^                [a-z_]*:\|^              required:" ; echo "=== required block ==="; sed -n '131359,131911p' stripe.yaml | grep -n -A8 "^              required:"
B=131358; sed -n "$((B+417)),$((B+443))p;$((B+386)),$((B+417))p" stripe.yaml
grep -n "  /v1/customers/{customer}:" stripe.yaml
grep -n "^  /v1/customers/" stripe.yaml; echo ===; grep -n "^  /v1/payment_methods/\|^  /v1/setup_intents/" stripe.yaml
grep -n "{customer}\|{subscription}\|{intent}\|{payment_method}" stripe.yaml | head -40
sed -n '87677,87760p' stripe.yaml
C=85051; awk -v s=$C 'NR>=s && NR<=85622' stripe.yaml | grep -n "invoice_settings:" ; echo ===; sed -n '85350,85420p' stripe.yaml
sed -n "$((85051+401)),$((85051+440))p" stripe.yaml
sed -n '138252,138260p' stripe.yaml; echo "=== SI post params ==="; awk 'NR>=138252 && NR<=140077' stripe.yaml | grep -n "^                [a-z_]*:$" | head -40; echo "=== products required ==="; sed -n '132240,132685p' stripe.yaml | grep -n -A5 "^              required:"
D=138251; sed -n "$((D+1795)),$((D+1810))p" stripe.yaml; echo "=== sub response status enum ==="; grep -n "subscription_status\|      status:" stripe.yaml | head -5
grep -n "^    subscription:" stripe.yaml
awk 'NR>=53366 && NR<=54400' stripe.yaml | grep -n "^        [a-z_]*:" | head -60
sed -n "$((53365+384)),$((53365+400))p;$((53365+221)),$((53365+230))p" stripe.yaml
grep -n "confirmation_secret" stripe.yaml | head; echo ===; grep -n "^  /v1/webhook_endpoints" stripe.yaml; echo ===; grep -n "customer.subscription.trial_will_end\|invoice.payment_failed\|invoice.paid" stripe.yaml | head
grep -n "^  /v1/webhook_endpoints" stripe.yaml; sed -n '19170,19180p;21117,21140p' stripe.yaml; grep -c "payment_intent:" stripe.yaml
awk 'NR>=18800 && NR<=19800' stripe.yaml | grep -n "^        payment_intent:\|^        payments:\|^        status:"; echo "=== invoice schema start ==="; grep -n "^    invoice:" stripe.yaml
sed -n '19735,19750p' stripe.yaml
grep -in "idempotency" stripe.yaml | head -5; echo ===; grep -n "securitySchemes" -A 20 stripe.yaml | head -30
grep -n "securitySchemes" -A 25 stripe.yaml | head -35; echo "=== servers ==="; grep -n "^servers:" -A 4 stripe.yaml
sed -n '147850,147860p' stripe.yaml; grep -n "application/x-www-form-urlencoded" stripe.yaml | wc -l
sed -n '168832,169100p' stripe.yaml | grep -n "^                [a-z_]*:$\|^              required:" -A3 | head -40
awk 'NR>=168832 && NR<=169400' stripe.yaml | grep -n "enabled_events\|^              required:" -A4 | head -30
W=168831; sed -n "$((W+286)),$((W+300))p" stripe.yaml; grep -n "                    - customer.subscription.trial_will_end$\|                    - invoice.payment_failed$\|                    - invoice.paid$\|                    - customer.subscription.updated$\|                    - setup_intent.succeeded$" stripe.yaml | head
grep -n "                      - customer.subscription.trial_will_end$\|                      - invoice.payment_failed$\|                      - invoice.paid$\|                      - customer.subscription.updated$\|                      - customer.subscription.deleted$" stripe.yaml | head
awk 'NR>=169180 && NR<=169290' stripe.yaml | grep -n "trial_will_end\|subscription.updated\|invoice.paid\|invoice.payment_failed\|invoice.upcoming"
grep -n "'/v1/subscriptions/{subscription}':" stripe.yaml
grep -n "v1/subscriptions/{" stripe.yaml
```

{% /tab %}
{% tab label="Opus 5 · run 2 · tree" %}

```bash
ls && redocly tree --help
redocly tree stripe.yaml --format=ai --find="subscription" | head -80
redocly tree stripe.yaml --format=ai --path="/v1/subscriptions" --operation=post | head -150
cd /Users/tora/bench-run/stripe-tree-help-local-opus-r2
redocly tree stripe.yaml --format=ai --path="/v1/prices" --operation=post | head -20
redocly tree stripe.yaml --format=ai --path="/v1/products" --operation=post | head -20
redocly tree stripe.yaml --format=ai --find="payment method" | head -30
redocly tree stripe.yaml --format=ai --find="setup intent" | head -20
redocly tree stripe.yaml --format=ai --path="/v1/customers/{customer}/payment_methods" --operation=get | head -20
echo; echo "=== CUSTOMER UPDATE (invoice_settings) ==="
redocly tree stripe.yaml --format=ai --path="/v1/customers/{customer}" --operation=post | grep -o '"invoice_settings":{[^}]*}[^}]*}' | head -5
redocly tree stripe.yaml --format=ai --path="/v1/customers/{customer}" --operation=post | grep -o 'default_payment_method[^,]*' | head -3
echo; echo "=== setup_intents post params ==="
redocly tree stripe.yaml --format=ai --path="/v1/setup_intents" --operation=post | grep -oE '"(customer|payment_method|usage|confirm|automatic_payment_methods|attach_to_self|flow_directions|payment_method_types|return_url|use_stripe_sdk)":\{"description":"[^"]{0,180}' | head -20
redocly tree stripe.yaml --format=ai --component=schemas --name=subscription | grep -oE '"(id|status|trial_end|trial_start|latest_invoice|pending_setup_intent|current_period_end|default_payment_method|items|cancel_at_period_end|billing_cycle_anchor)":' | sort -u
echo; echo "--- status enum ---"
redocly tree stripe.yaml --format=ai --component=schemas --name=subscription | grep -oE '"status":\{"description":"[^"]{0,400}' | head -2
echo; echo "--- current_period_end present? ---"
redocly tree stripe.yaml --format=ai --component=schemas --name=subscription | grep -c 'current_period_end'
grep -n "current_period_end" stripe.yaml | head -20
echo; echo "=== subscription_item schema props ==="
redocly tree stripe.yaml --format=ai --component=schemas --name=subscription_item | grep -oE '"(id|current_period_end|current_period_start|price|quantity|subscription)":' | sort -u
awk 'NR>=53900 && NR<=53975' stripe.yaml | grep -nE "^    [a-z_]+:|current_period"
awk 'NR<=53961 && /^    [a-z_]+:$/ {last=NR": "$0} END{}' stripe.yaml
awk 'NR<=53961 && /^    [a-z_0-9]+:$/ {last=NR": "$0} END{print last}' stripe.yaml
awk 'NR>=53367 && NR<=53940' stripe.yaml | grep -n -A14 "^        status:" | head -25
echo; echo "=== relevant webhooks ==="
redocly tree stripe.yaml --format=ai --webhooks | grep -iE "trial|invoice\.(paid|payment_failed|payment_action_required|upcoming)|subscription\.(created|updated|deleted)|setup_intent" | head -25
redocly tree stripe.yaml --format=ai --webhooks | head -20
redocly tree stripe.yaml --format=ai --find="events" | grep -E "^(get|post) " | head -10
redocly tree stripe.yaml --format=ai --path="/v1/webhook_endpoints" --operation=post | grep -oE "(customer\.subscription\.[a-z_]+|invoice\.[a-z_]+|setup_intent\.[a-z_]+)" | sort -u | head -40
redocly tree stripe.yaml --format=ai --path="/v1/webhook_endpoints" --operation=post | grep -oE '"required":\[[^]]*\]' | head -3
echo; echo "=== Idempotency-Key documented? ==="
grep -c -i "idempotency" stripe.yaml
echo; echo "=== servers ==="
grep -n -A3 "^servers:" stripe.yaml | head -6
echo; echo "=== payment_method.allow_redisplay ==="
redocly tree stripe.yaml --format=ai --component=schemas --name=payment_method | grep -oE '"allow_redisplay":\{"description":"[^"]{0,200}' | head -2
redocly tree stripe.yaml --format=ai --path="/v1/setup_intents" --operation=post | grep -oE '"usage":\{"description":"[^"]*","enum":\[[^]]*\]|"usage":\{[^}]*enum[^]]*\]' | head -2
echo; echo "=== setup_intent schema key fields ==="
redocly tree stripe.yaml --format=ai --component=schemas --name=setup_intent | grep -oE '"(client_secret|status|payment_method|next_action|usage)":' | sort -u
echo; echo "=== setup_intent.status desc ==="
awk 'NR>=50488 && NR<=51000' stripe.yaml | grep -A6 "^        status:" | head -10
redocly tree stripe.yaml --format=ai --component=schemas --name=invoice | grep -oE '"(payment_intent|payments|status|amount_due|confirmation_secret)":' | sort -u
echo; echo "=== x-expandableFields on invoice (sample) ==="
redocly tree stripe.yaml --format=ai --component=schemas --name=invoice | grep -oE '"x-expandableFields":\[[^]]*\]' | head -1
redocly tree stripe.yaml --format=ai --component=schemas --name=invoice | grep -oE '"payments":\{[^{]*\{[^{]*\{[^}]*\}' | head -2
echo; echo "=== invoice_payment schema ==="
redocly tree stripe.yaml --format=ai --component=schemas --name=invoice_payment | grep -oE '"(payment|status|is_default|amount_paid)":' | sort -u
echo; echo "=== does /v1/invoices/{invoice}/pay exist? ==="
redocly tree stripe.yaml --format=ai --find="pay invoice" | grep -E "^post" | head -5
redocly tree stripe.yaml --format=ai --path="/v1/invoices/{invoice}/pay" --operation=post | grep -oE '"(off_session|payment_method|source|paid_out_of_band|forgive|mandate)":\{"description":"[^"]{0,120}' | head -8
```

{% /tab %}
{% tab label="Opus 5 · run 3 · no tree" %}

```bash
wc -l stripe.yaml; ls -la
cd /Users/tora/Desktop/Projects/tree-bench-kit-v2/specs; grep -n "^  /v1/\(setup_intents\|subscriptions\|customers\|payment_methods\|prices\|products\|payment_intents\)" stripe.yaml | head -60
cd /Users/tora/Desktop/Projects/tree-bench-kit-v2/specs; sed -n '138252,138600p' stripe.yaml
cd /Users/tora/Desktop/Projects/tree-bench-kit-v2/specs; awk 'NR>=147301 && NR<=148721' stripe.yaml | grep -n "^                [a-z_]*:" | head -80
cd /Users/tora/Desktop/Projects/tree-bench-kit-v2/specs; awk 'NR>=147301 && NR<=148721' stripe.yaml | sed -n '955,1420p' | grep -n "^                [a-z_]*:"
cd /Users/tora/Desktop/Projects/tree-bench-kit-v2/specs; awk 'NR>=147301 && NR<=148721' stripe.yaml | sed -n '654,730p;820,960p'
cd /Users/tora/Desktop/Projects/tree-bench-kit-v2/specs; awk 'NR>=147301 && NR<=148721' stripe.yaml | sed -n '960,1000p;1300,1420p'
cd /Users/tora/Desktop/Projects/tree-bench-kit-v2/specs; awk 'NR>=147301 && NR<=148721' stripe.yaml | grep -n "save_default_payment_method" -A12 | head -30; echo ====; grep -n "^  /v1/customers/{customer}:" stripe.yaml; grep -n "^  /v1/payment_methods/{payment_method}" stripe.yaml; grep -n "^  /v1/setup_intents/{intent}" stripe.yaml; grep -n "^  /v1/subscriptions/{subscription_exposed_id}" stripe.yaml; grep -n "^  /v1/invoices/{invoice}" stripe.yaml | head
cd /Users/tora/Desktop/Projects/tree-bench-kit-v2/specs; grep -n "^  /v1/customers/{customer}:\|^  /v1/payment_methods/{payment_method}\|^  /v1/setup_intents/{intent}\|^  /v1/subscriptions/{subscription_exposed_id}\|^  /v1/invoices" stripe.yaml
cd /Users/tora/Desktop/Projects/tree-bench-kit-v2/specs; grep -n "^  /v1/" stripe.yaml | wc -l; grep -n "^  /v1/" stripe.yaml | grep -i "customer\|payment_method\|setup_intent\|subscription\|price\|product\|invoice\|payment_intent"
cd /Users/tora/Desktop/Projects/tree-bench-kit-v2/specs; awk 'NR>=138252 && NR<=144897' stripe.yaml > /private/tmp/si.yaml; grep -n "^      [a-z]*:$\|^    [a-z]*:$" /private/tmp/si.yaml | head; echo "--- POST param names ---"; awk 'NR>420' /private/tmp/si.yaml | grep -n "^                [a-z_]*:$" | head -40
cd /Users/tora/Desktop/Projects/tree-bench-kit-v2/specs; grep -n "^  /v1/" stripe.yaml | sed -n '1,140p'
cd /Users/tora/Desktop/Projects/tree-bench-kit-v2/specs; sed -n '141660,141680p;141740,141760p' stripe.yaml; echo "=== all paths keys ==="; grep -nc "^  /" stripe.yaml; grep -n "^  /" stripe.yaml | grep -v "^\([0-9]*\):  /v1/" | head
cd /Users/tora/Desktop/Projects/tree-bench-kit-v2/specs; grep -n "^  '\?/v1/" stripe.yaml | grep -i "customer\|payment_method\|setup_intent\|subscription\|price\|product\|invoice"
cd /Users/tora/Desktop/Projects/tree-bench-kit-v2/specs; echo "=== customers/{customer}/payment_methods GET params ==="; sed -n '87677,87760p' stripe.yaml | grep -n "name:\|enum:" -A3 | head -50
cd /Users/tora/Desktop/Projects/tree-bench-kit-v2/specs; awk 'NR>=138426 && NR<=140077' stripe.yaml | grep -n "^                \(confirm\|customer\|usage\|off_session\|return_url\|payment_method\|payment_method_types\|expand\|metadata\|automatic_payment_methods\|description\|use_stripe_sdk\|mandate_data\|single_use\|flow_directions\|confirmation_token\|attach_to_self\|payment_method_data\|payment_method_configuration\|on_behalf_of\|excluded_payment_method_types\|allowed_payment_method_types\|payment_method_options\):"
cd /Users/tora/Desktop/Projects/tree-bench-kit-v2/specs; awk 'NR>=138426 && NR<=140077' stripe.yaml | sed -n '188,235p;1591,1640p'
cd /Users/tora/Desktop/Projects/tree-bench-kit-v2/specs; grep -n "^    subscription:" stripe.yaml
cd /Users/tora/Desktop/Projects/tree-bench-kit-v2/specs; awk 'NR>=53366 && NR<=54200' stripe.yaml | grep -n "^        [a-z_]*:$"; echo "=== current_period ==="; awk 'NR>=53366 && NR<=54200' stripe.yaml | grep -n "current_period"
cd /Users/tora/Desktop/Projects/tree-bench-kit-v2/specs; awk 'NR>=131359 && NR<=131911' stripe.yaml | grep -n "^                [a-z_]*:$\|^              required:" -A6 | grep -n "^\s*[0-9]*[:-]\s*\(required:\|- \|[a-z_]*:$\)" | head -40
cd /Users/tora/Desktop/Projects/tree-bench-kit-v2/specs; awk 'NR>=131359 && NR<=131900' stripe.yaml | grep -n "^                [a-z_]*:" ; echo "=== recurring block ==="; awk 'NR>=131359 && NR<=131900' stripe.yaml | sed -n '/^                recurring:/,/^                tax_behavior/p' | head -60
cd /Users/tora/Desktop/Projects/tree-bench-kit-v2/specs; awk 'NR>=85051 && NR<=85622' stripe.yaml | grep -n "invoice_settings:" -A20 | head -30; echo "=== webhook events ==="; awk 'NR>=168832 && NR<=169895' stripe.yaml | grep -n "customer.subscription.trial_will_end\|invoice.payment_failed\|invoice.paid\|customer.subscription.deleted\|invoice.payment_action_required" | head
cd /Users/tora/Desktop/Projects/tree-bench-kit-v2/specs; awk 'NR>=85051 && NR<=85622' stripe.yaml | sed -n '401,470p'; echo "=== webhook create required ==="; awk 'NR>=168832 && NR<=169895' stripe.yaml | grep -n "^              required:" -A5 | head -20
cd /Users/tora/Desktop/Projects/tree-bench-kit-v2/specs; grep -n "^    setup_intent:" stripe.yaml; grep -n "^    setup_intent:" stripe.yaml | cut -d: -f1 | while read l; do awk -v s=$l 'NR>=s && NR<=s+400' stripe.yaml | grep -n "requires_action\|succeeded\|client_secret:\|next_action:" | head; done; echo "=== sub status ==="; awk 'NR>=53366 && NR<=54200' stripe.yaml | sed -n '384,400p'
cd /Users/tora/Desktop/Projects/tree-bench-kit-v2/specs; awk 'NR>=101514 && NR<=101622' stripe.yaml | grep -n "^                [a-z_]*:"
```

{% /tab %}
{% tab label="Opus 5 · run 3 · tree" %}

```bash
ls && redocly tree --help | head -100
redocly tree stripe.yaml --format=ai --find "subscription" | head -60
redocly tree stripe.yaml --format=ai --operation=PostSubscriptions | head -150
redocly tree stripe.yaml --format=ai --find "payment_methods" | head -40; echo "=== SETUP ==="; redocly tree stripe.yaml --format=ai --find "setup_intent" | head -30; echo "=== PRICE ==="; redocly tree stripe.yaml --format=ai --find "price" | head -20
cd /Users/tora/bench-run/stripe-tree-help-local-opus-r3
t=sys.stdin.read()
print(t[:400])
m=re.search(r'--- json\n(.*)',t,re.S)
d=json.loads(m.group(1).split('\nrefs:')[0])
print(json.dumps(d.get('parameters'),indent=1)[:2500])
print('RESP',json.dumps(d.get('responses'))[:600])"
cat > /private/tmp/claude-501/-Users-tora-bench-run-stripe-tree-help-local-opus-r3/0f8dfb37-ae5d-4582-9479-c633414baba3/scratchpad/x.py <<'EOF'
import sys,json,re,subprocess
op=sys.argv[1]
keys=sys.argv[2:]
t=subprocess.run(["redocly","tree","stripe.yaml","--format=ai","--operation="+op],capture_output=True,text=True).stdout
rb=d.get('requestBody',{}).get('content',{})
for ct,v in rb.items():
props=v['schema'].get('properties',{})
print("CT",ct,"REQUIRED",v['schema'].get('required'))
print("PROPS:",", ".join(sorted(props)))
for k in keys:
if k in props: print("---",k,json.dumps(props[k])[:1200])
EOF
python3 /private/tmp/claude-501/-Users-tora-bench-run-stripe-tree-help-local-opus-r3/0f8dfb37-ae5d-4582-9479-c633414baba3/scratchpad/x.py PostSetupIntents customer usage payment_method payment_method_types automatic_payment_methods confirm
S=/private/tmp/claude-501/-Users-tora-bench-run-stripe-tree-help-local-opus-r3/0f8dfb37-ae5d-4582-9479-c633414baba3/scratchpad/x.py
import sys,json,re
t=sys.stdin.read(); m=re.search(r'--- json\n(.*)',t,re.S)
print(', '.join(sorted(d.get('properties',{}))))
for k in ['status','trial_end','latest_invoice','pending_setup_intent','default_payment_method','items','billing_cycle_anchor','trial_settings']:
if k in d['properties']: print('--',k,json.dumps(d['properties'][k])[:500])
"
redocly tree stripe.yaml --format=ai --webhooks | grep -Ei "subscription|invoice|setup_intent" | head -40
redocly tree stripe.yaml --format=ai --webhooks | head -20
python3 $S PostWebhookEndpoints enabled_events url | tr ',' '\n' | grep -Ei "trial_will_end|invoice.paid|invoice.payment_failed|subscription.deleted|subscription.updated|invoice.payment_action_required|setup_intent.succeeded|\"url\"|REQUIRED" | head -20
python3 $S PostWebhookEndpoints enabled_events url | python3 -c "
import sys,re
print(re.search(r'REQUIRED.*',t).group(0)[:200])
for w in ['customer.subscription.trial_will_end','invoice.paid','invoice.payment_failed','customer.subscription.updated','customer.subscription.deleted','invoice.payment_action_required','invoice.upcoming','setup_intent.succeeded']:
print(w, w in t)
sed -n '168938,169440p' stripe.yaml | grep -nE "trial_will_end|invoice\.paid|invoice\.payment_failed|customer\.subscription\.(updated|deleted)|payment_action_required|invoice\.upcoming|setup_intent\.succeeded" | head
t=sys.stdin.read(); d=json.loads(re.search(r'--- json\n(.*)',t,re.S).group(1).split('\nrefs:')[0])
print(', '.join(sorted(d['properties'])))
for k in ['client_secret','status','payment_method','next_action','usage']: print('--',k,json.dumps(d['properties'][k])[:300])
print(', '.join(sorted(d['properties'])))"
```

{% /tab %}
{% tab label="Opus 5 · run 4 · no tree" %}

```bash
wc -l stripe.yaml
grep -n "^  /v1/\(customers\|subscriptions\|setup_intents\|payment_methods\|prices\|products\)" stripe.yaml
grep -n "^  /v1/[a-z_]*customers" stripe.yaml; echo ---; grep -n "^  /v1/[a-z_{}/]*subscription" stripe.yaml; echo ---; grep -n "^  /v1/[a-z_{}/]*setup_intent" stripe.yaml; echo ---; grep -n "^  /v1/[a-z_{}/]*payment_method" stripe.yaml
grep -n "^  /v1/.*{" stripe.yaml | head -100
grep -n "^paths:" stripe.yaml; grep -c "^  /" stripe.yaml; grep -n "^  /v1/pay" stripe.yaml
sed -n '147301,147420p' stripe.yaml
awk 'NR>=147301 && NR<=148721 && /^    (get|post|delete):/ {print NR": "$0}' stripe.yaml
sed -n '147565,147640p' stripe.yaml; echo "=== keys ==="; awk 'NR>=147565 && NR<=148721' stripe.yaml | grep -n "^                    [a-z_]*:" | head -120
awk 'NR>=147565 && NR<=148721' stripe.yaml | grep -n "^                [a-z_]*:" | head -80
sed -n '147957,148010p;148677,148721p' stripe.yaml
sed -n '148120,148135p' stripe.yaml; echo "=== item props ==="; awk 'NR>=148120 && NR<=148218' stripe.yaml | grep -n "^                    [a-z_]*:"
awk 'NR>=148125 && NR<=148216' stripe.yaml | grep -n "^                      [a-z_]*:"
awk 'NR>=84329 && NR<=84934 && /^    (get|post):/{print NR": "$0} NR>=84329 && NR<=84934 && /^          name: /{print NR": "$0}' stripe.yaml | head -60
awk 'NR>=127440 && NR<=129110 && /^    (get|post):/{print NR": "$0} NR>=127440 && NR<=129110 && /^          name: /{print NR": "$0}' stripe.yaml; echo "=== search ==="; awk 'NR>=84934 && NR<=85200 && /^          name: /{print NR": "$0}' stripe.yaml
sed -n '128720,128730p;128770,128790p;128975,128985p;129055,129075p' stripe.yaml
grep -n "^  '\?/v1/\(customers\|subscriptions\|setup_intents\|prices\|products\|invoices\)" stripe.yaml
sed -n '85452,85500p' stripe.yaml
sed -n '131775,131802p' stripe.yaml; echo "== setup usage =="; sed -n '140046,140060p' stripe.yaml
sed -n '148593,148612p' stripe.yaml; echo "== sub schema fields =="; grep -n "^      pending_setup_intent:\|^      latest_invoice:\|^      trial_end:\|^      trial_start:" stripe.yaml | head; echo "== events =="; grep -n "customer.subscription.trial_will_end\|invoice.payment_action_required\|invoice.payment_failed$" stripe.yaml | head
grep -n "^    subscription:" stripe.yaml;
awk 'NR>=53366 && NR<=54400' stripe.yaml | grep -n "^        [a-z_]*:" | grep -v "description\|type:\|nullable\|maxLength" | head -60
sed -n '87752,87765p' stripe.yaml; echo "== status enum =="; awk 'NR>=53749 && NR<=53810' stripe.yaml | grep -n "\- [a-z_]*$" | head -20
grep -n "securitySchemes" -A 25 stripe.yaml | head -30; grep -n "^servers:" -A 3 stripe.yaml
```

{% /tab %}
{% tab label="Opus 5 · run 4 · tree" %}

```bash
ls && redocly tree --help
redocly tree stripe.yaml --format=ai --find subscription | head -80
redocly tree stripe.yaml --format=ai --path=/v1/subscriptions --operation=post | head -120
redocly tree stripe.yaml --format=ai --find "payment method" | head -40; echo ===; redocly tree stripe.yaml --format=ai --find "price product" | head -30
redocly tree stripe.yaml --format=ai --path=/v1/customers/{customer}/payment_methods --operation=get | head -30
redocly tree stripe.yaml --format=ai --operation=PostCustomersCustomer | head -20
redocly tree stripe.yaml --format=ai --operation=PostProducts | head -12
redocly tree stripe.yaml --format=ai --operation=PostPrices | head -12
redocly tree stripe.yaml --format=ai --webhooks | grep -iE "subscription|invoice|payment_intent" | head -40
redocly tree stripe.yaml --format=ai --webhooks | head -20
redocly tree stripe.yaml --format=ai --component=schemas --name=subscription --with-deps | head -6 | cut -c1-6000
redocly tree stripe.yaml --format=ai --component=schemas --name=subscription_item | head -3 | cut -c1-1500; echo "---INV---"; redocly tree stripe.yaml --format=ai --component=schemas --name=invoice | head -2 | cut -c1-3000
redocly tree stripe.yaml --format=ai --find setup_intent | head -20; echo "---EVENTS---"; redocly tree stripe.yaml --format=ai --find events | head -15; echo "---IDEM---"; grep -c "Idempotency-Key" stripe.yaml
redocly tree stripe.yaml --format=ai --operation=PostWebhookEndpoints | tr ',' '\n' | grep -oE '"(customer\.subscription|invoice)\.[a-z_.]+"' | sort -u | head -40
redocly tree stripe.yaml --format=ai --operation=PostWebhookEndpoints | tr ',' '\n' | grep -E '"required"|api_version|"url"|description.*URL' | head; echo ---; redocly tree stripe.yaml --format=ai --component=schemas --name=webhook_endpoint | head -2 | cut -c1-800
redocly tree stripe.yaml --format=ai --operation=PostPaymentMethodsPaymentMethodAttach | tr ',' '\n' | grep -E '"customer"|"required"|"name":"payment_method"' | head; echo "---SI---"; redocly tree stripe.yaml --format=ai --operation=PostSetupIntents | tr ',' '\n' | grep -E '"usage"|"confirm"|"payment_method"|"customer"|"off_session"|automatic_payment_methods' | head -20
redocly tree stripe.yaml --format=ai --path=/v1/subscriptions/{subscription_exposed_id} | head -8; echo ---; redocly tree stripe.yaml --format=ai --path=/v1/customers/{customer} | head -8; echo ---; redocly tree stripe.yaml --format=ai --path=/v1/invoices/{invoice} | head -8
redocly tree stripe.yaml --format=ai | head -20
```

{% /tab %}
{% tab label="Opus 5 · run 5 · no tree" %}

```bash
wc -l stripe.yaml && grep -c "" stripe.yaml
grep -n "^  /v1/\(subscriptions\|customers\|payment_methods\|setup_intents\|prices\|products\|payment_intents\|subscription_items\)" stripe.yaml | head -60
sed -n '147301,147460p' stripe.yaml
awk 'NR>=147301 && NR<=148721 && /^    (post|get):/ {print NR": "$0}' stripe.yaml
awk 'NR>=147565 && NR<=148721' stripe.yaml | grep -n "^                    [a-z_]*:" | head -80
awk 'NR>=147565 && NR<=148721 {print NR": "$0}' stripe.yaml | grep -E "^[0-9]+:                (properties|[a-z_]+):" | head -80
sed -n '147565,147680p' stripe.yaml
sed -n '147565,148721p' stripe.yaml | grep -nE "^                [a-z_]+:"
sed -n '147975,148000p;148245,148265p;148645,148720p' stripe.yaml
sed -n '148120,148220p' stripe.yaml
sed -n '148592,148615p' stripe.yaml && echo ---PRICES--- && sed -n '131359,131370p' stripe.yaml && awk 'NR>=131359 && NR<=131911 && /^    post:/{print NR}' stripe.yaml
sed -n '131565,131911p' stripe.yaml | grep -nE "^                [a-z_]+:|^              required:"
sed -n '131775,131810p;131893,131900p' stripe.yaml
grep -n "payment_methods" stripe.yaml | grep -E "^\s*[0-9]+:  /v1"
grep -nE "^  /v1/customers/" stripe.yaml && echo --- && grep -nE "^  /v1/payment_methods/" stripe.yaml
grep -nE "^  /v1/[a-z_{}/]+:$" stripe.yaml | grep -iE "customer|payment_method|setup_intent|subscription|product|price|invoice"
grep -cE "^  /v1/.*\{" stripe.yaml; grep -nE "^  /v1/.*\{" stripe.yaml | head -20
awk 'NR>=127440 && NR<=131359 && /^    (get|post):/{print NR": "$0}' stripe.yaml && echo "---GET PM query params---" && sed -n '127440,127560p' stripe.yaml | grep -nE "^          - description|name: [a-z_]+"
sed -n '127459,127475p;127525,127535p' stripe.yaml
sed -n '132412,132685p' stripe.yaml | grep -nE "^                [a-z_]+:|^              required:|^                - [a-z_]+" | tail -30
awk 'NR>=138252 && NR<=139000 && /^    post:/{print NR}' stripe.yaml
sed -n '138425,141200p' stripe.yaml | grep -nE "^                [a-z_]+:|^              required:" | grep -v "explode\|deepObject"
grep -n "^    subscription:" stripe.yaml
sed -n '53366,54400p' stripe.yaml | grep -nE "^        [a-z_]+:|^      required:" | head -70
sed -n '53705,53725p;53749,53770p' stripe.yaml
grep -nE "^  /v1/webhook" stripe.yaml; echo "=== prices GET ===" && sed -n '131360,131565p' stripe.yaml | grep -nE "name: [a-z_]+"; echo "=== products GET ===" && sed -n '132241,132412p' stripe.yaml | grep -nE "name: [a-z_]+"
awk 'NR>=168832 && NR<=169400 && /^    post:/{print NR}' stripe.yaml
sed -n '168937,169400p' stripe.yaml | grep -nE "^                [a-z_]+:|^              required:|^                - [a-z_]+" | grep -v "explode\|deepObject" ; echo "=== events sample ===" && sed -n '168937,169400p' stripe.yaml | grep -nE "customer.subscription.(trial_will_end|updated|created)|invoice.payment_failed|invoice.paid" | head
sed -n '169400,169460p' stripe.yaml | grep -nE "required:|- [a-z_]+|url:" | head -20
sed -n '169425,169500p' stripe.yaml
grep -nE "^  '?/v1/[^ ]*'?:$" stripe.yaml | grep -iE "customers|payment_methods|setup_intents|subscriptions|prices|products|invoices"
sed -n '85135,85622p' stripe.yaml | grep -nE "^                [a-z_]+:" | grep -v "explode\|deepObject"; echo "=== invoice_settings detail ==="; sed -n '85135,85622p' stripe.yaml | awk 'NR>=1 && /invoice_settings:/{f=NR} f && NR>=f && NR<=f+30{print NR": "$0}' | head -35
sed -n '85451,85500p' stripe.yaml
sed -n '138612,138622p;140044,140060p' stripe.yaml; echo "=== attach required ==="; sed -n '138978,139070p' /dev/null; sed -n '128978,129063p' stripe.yaml | grep -nE "name: |required:|- customer|customer:"
sed -n '148234,148245p' stripe.yaml; echo "=== setup_intent status enum ==="; grep -n "^    setup_intent:" stripe.yaml
sed -n '50487,51100p' stripe.yaml | grep -nE "^        (status|next_action|client_secret|payment_method|customer|id):" ; echo "---"; sed -n '50487,51100p' stripe.yaml | awk '/^        status:/{f=1} f&&NR<f+0{} f{print; c++} c>25{exit}'
sed -n '85051,85135p' stripe.yaml | grep -nE "name: |operationId"
sed -n '168937,169425p' stripe.yaml | grep -nE "customer\.subscription\.deleted|invoice\.payment_action_required|setup_intent\.succeeded|setup_intent\.setup_failed|invoice\.upcoming"
awk 'NR>=148838 && NR<=150235 && /^    post:/{print NR}' stripe.yaml | head -1
sed -n '148989,150235p' stripe.yaml | grep -nE "^                (default_payment_method|trial_end|items|cancel_at_period_end):"
```

{% /tab %}
{% tab label="Opus 5 · run 5 · tree" %}

```bash
ls && redocly tree --help
redocly tree stripe.yaml --format=ai --find "subscription" | head -100
redocly tree stripe.yaml --format=ai --operation=PostSubscriptions | head -200
redocly tree stripe.yaml --format=ai --find "payment method customer" | head -40; echo ===; redocly tree stripe.yaml --format=ai --find "price product" | head -30; echo ===; redocly tree stripe.yaml --format=ai --webhooks | grep -iE "invoice|subscription|setup" | head -40
redocly tree stripe.yaml --format=ai --find "price" | head -20; echo "---"; redocly tree stripe.yaml --format=ai --find "product" | head -12
for op in PostProducts PostPrices GetCustomersCustomerPaymentMethods PostSetupIntents; do echo "######## $op"; redocly tree stripe.yaml --format=ai --operation=$op | head -20 | cut -c1-4000; done
redocly tree stripe.yaml --format=ai --operation=PostPrices | grep -o '"recurring":{"description[^}]*}[^}]*}[^}]*}' | cut -c1-2000; echo "---CUST---"; redocly tree stripe.yaml --format=ai --operation=PostCustomersCustomer | grep -o '"invoice_settings":{[^€]\{0,1500\}' | cut -c1-1600
redocly tree stripe.yaml --format=ai --operation=PostCustomersCustomer > /private/tmp/claude-501/-Users-tora-bench-run-stripe-tree-help-local-opus-r5/81736b1e-7050-4eda-b2ad-8fcd15bd9f34/scratchpad/cust.txt; python3 -c "
import re
s=open('/private/tmp/claude-501/-Users-tora-bench-run-stripe-tree-help-local-opus-r5/81736b1e-7050-4eda-b2ad-8fcd15bd9f34/scratchpad/cust.txt').read()
i=s.find('\"invoice_settings\"')
print(s[i:i+1500])
print('====HEAD====')
print(s[:300])
"
python3 -c "
s=open('cust.txt').read()
i=s.find('\"invoice_settings\":{\"description')
print(s[i:i+1200])
redocly tree stripe.yaml --format=ai --component=schemas --name=subscription > /private/tmp/claude-501/-Users-tora-bench-run-stripe-tree-help-local-opus-r5/81736b1e-7050-4eda-b2ad-8fcd15bd9f34/scratchpad/sub.txt; python3 - <<'EOF'
import json,re
s=open('/private/tmp/claude-501/-Users-tora-bench-run-stripe-tree-help-local-opus-r5/81736b1e-7050-4eda-b2ad-8fcd15bd9f34/scratchpad/sub.txt').read()
print(s[:200])
i=s.find('{"description')
try:
d=json.loads(s[i:s.rindex('}')+1])
except Exception as e:
d=None; print('parse fail',e)
if d:
props=d.get('properties',{})
for k in props: print(k, '|', str(props[k].get('description',''))[:120])
EOF
redocly tree stripe.yaml --format=ai --component=schemas --name=subscription_item | head -6; echo "---WEBHOOKS---"; redocly tree stripe.yaml --format=ai --webhooks | grep -iE "invoice\.|subscription|setup_intent" | head -40
redocly tree stripe.yaml --format=ai --webhooks | head -20; echo "---EVENTTYPES---"; redocly tree stripe.yaml --format=ai --find "event" | head -20
redocly tree stripe.yaml --format=ai --operation=PostWebhookEndpoints > /private/tmp/claude-501/-Users-tora-bench-run-stripe-tree-help-local-opus-r5/81736b1e-7050-4eda-b2ad-8fcd15bd9f34/scratchpad/wh.txt; python3 - <<'EOF'
s=open('/private/tmp/claude-501/-Users-tora-bench-run-stripe-tree-help-local-opus-r5/81736b1e-7050-4eda-b2ad-8fcd15bd9f34/scratchpad/wh.txt').read()
ev=set(re.findall(r'"((?:invoice|customer\.subscription|setup_intent|payment_intent|invoiceitem)[a-z_.]*)"',s))
for e in sorted(ev): print(e)
cd /private/tmp/claude-501/-Users-tora-bench-run-stripe-tree-help-local-opus-r5/81736b1e-7050-4eda-b2ad-8fcd15bd9f34/scratchpad; python3 - <<'EOF'
s=open('wh.txt').read()
i=s.find('"url"')
print('WH url/params:', s[s.find('"enabled_events"'):s.find('"enabled_events"')+200])
redocly tree /Users/tora/bench-run/stripe-tree-help-local-opus-r5/stripe.yaml --format=ai --operation=PostSetupIntents | python3 -c "
import sys,re
s=sys.stdin.read()
for k in ['\"usage\"','\"payment_method\":','\"payment_method_types\"','\"single_use\"']:
i=s.find(k); print(k, s[i:i+320].replace(chr(10),' ') if i>0 else 'NOT FOUND'); print()
redocly tree /Users/tora/bench-run/stripe-tree-help-local-opus-r5/stripe.yaml --format=ai --operation=PostPaymentMethodsPaymentMethodAttach | cut -c1-1500 | tail -c 1200
echo; echo "---IDEMPOTENCY---"
grep -c "Idempotency-Key" /Users/tora/bench-run/stripe-tree-help-local-opus-r5/stripe.yaml
cd /Users/tora/bench-run/stripe-tree-help-local-opus-r5; head -20 stripe.yaml; echo "---INV---"; redocly tree stripe.yaml --format=ai --component=schemas --name=invoice | head -2
cd /Users/tora/bench-run/stripe-tree-help-local-opus-r5; grep -n "^servers:" -A4 stripe.yaml; grep -n "^  version:" -A2 stripe.yaml | head; redocly tree stripe.yaml --format=ai --component=schemas --name=invoices_resource_confirmation_secret | head -3
cd /Users/tora/bench-run/stripe-tree-help-local-opus-r5; redocly tree stripe.yaml --format=ai --path=/v1/subscriptions/{subscription_exposed_id} | head -8; redocly tree stripe.yaml --format=ai --path=/v1/setup_intents/{intent} | head -8; redocly tree stripe.yaml --format=ai --path=/v1/invoices/{invoice}/pay | head -6
```

{% /tab %}
{% /tabs %}

{% /tab %}
{% tab label="Haiku 4.5" %}

{% tabs %}
{% tab label="Haiku 4.5 · run 1 · no tree" %}

```bash
cat stripe.yaml
grep "subscription|trial|billing|invoice|customer|payment|card" stripe.yaml
grep "/customers|/subscriptions|/payment_methods|/invoice" stripe.yaml | head -100
grep "^  /v1/customers:|^  /v1/subscriptions:|^  /v1/payment_methods:|post:|POST" stripe.yaml | head -150
sed -n '84000,84300p' stripe.yaml
sed -n '84400,84800p' stripe.yaml
grep "'/v1/subscriptions':|operationId: PostSubscriptions" stripe.yaml | head -50
sed -n '147500,148000p' stripe.yaml
sed -n '147999,148599p' stripe.yaml
sed -n '148598,148998p' stripe.yaml
grep "'/v1/setup_intents':|'/v1/payment_methods':|operationId: PostSetupIntents" stripe.yaml | head -50
```

{% /tab %}
{% tab label="Haiku 4.5 · run 1 · tree" %}

```bash
redocly tree --help
redocly tree stripe.yaml --format=ai --find subscription
redocly tree stripe.yaml --format=ai --operation POST --path /v1/customers/{customer}/subscriptions
redocly tree stripe.yaml --format=ai --find "payment method" --path /v1/payment_methods
redocly tree stripe.yaml --format=ai --find "payment method"
redocly tree stripe.yaml --format=ai --operation POST --path /v1/payment_methods
redocly tree stripe.yaml --format=ai --operation POST --path /v1/payment_methods/{payment_method}/attach
redocly tree stripe.yaml --format=ai --operation GET --path /v1/customers/{customer}/payment_methods
```

{% /tab %}
{% tab label="Haiku 4.5 · run 2 · no tree" %}

```bash
cat stripe.yaml
grep "operationId|path:" stripe.yaml | head -100
grep "operationId.*[Ss]ubscription|operationId.*[Cc]ustomer|operationId.*[Pp]ayment" stripe.yaml | head -50
grep "operationId:.*(?:Subscription|Customer|PaymentIntent|PaymentMethod)" stripe.yaml | head -80
grep "operationId:.*Subscription[^I]" stripe.yaml | head -20
grep -n "operationId: Post\(Customers\|PaymentMethods\|SubscriptionSchedules\)" stripe.yaml | head -10
sed -n '84481,84531p' stripe.yaml
grep -n "operationId: PostCustomersCustomerSubscriptions\|operationId: PostSubscriptions\|operationId: PostPaymentMethods" stripe.yaml
sed -n '88686,88886p' stripe.yaml
sed -n '88900,89200p' stripe.yaml
sed -n '89200,89400p' stripe.yaml
grep -n "trial_" stripe.yaml | head -30
sed -n '89740,89790p' stripe.yaml
awk '/operationId: PostCustomersCustomerSubscriptions/,/trial_settings:/' stripe.yaml | tail -100 | head -50
grep -n "trial_settings:" stripe.yaml | head -5
sed -n '88740,88820p' stripe.yaml
awk '/operationId: PostCustomersCustomerSubscriptions/,/operationId:.*{/{if (/trial_end:/ || /trial_settings:/) {print NR": "$0; for(i=1; i<=30; i++) {getline; print NR": "$0}}}' stripe.yaml | head -80
sed -n '127656,127756p' stripe.yaml
sed -n '129012,129092p' stripe.yaml
```

{% /tab %}
{% tab label="Haiku 4.5 · run 2 · tree" %}

```bash
redocly tree --help
redocly tree stripe.yaml --format=ai --find subscription
redocly tree stripe.yaml --format=ai --operation=PostCustomersCustomerSubscriptions --with-deps
redocly tree stripe.yaml --format=ai --find "payment method" | head -50
redocly tree stripe.yaml --format=ai --operation=PostPaymentMethods --with-deps | head -100
redocly tree stripe.yaml --format=ai --operation=PostPaymentMethodsPaymentMethodAttach --with-deps
redocly tree stripe.yaml --format=ai --component=schemas --name=subscription | grep -A 5 -B 5 "trial_end\|billing_cycle"
```

{% /tab %}
{% tab label="Haiku 4.5 · run 3 · no tree" %}

```bash
cat stripe.yaml
grep "subscription|trial|billing|charge|invoice" stripe.yaml
grep "^  /.*:$|^    post:|operationId:|parameters:|responses:" stripe.yaml | head -100
grep "(/v1/.*subscriptions|operationId.*[Ss]ubscription)" stripe.yaml | head -80
sed -n '147301,147801p' stripe.yaml
sed -n '147800,148200p' stripe.yaml
sed -n '148200,148500p' stripe.yaml
grep "trial_settings|trial_end" stripe.yaml | head -50
sed -n '148649,148799p' stripe.yaml
grep "^  /v1/customers:|operationId: PostCustomers" stripe.yaml | head -50
grep "^  /v1/payment_methods:|operationId: PostPaymentMethods" stripe.yaml | head -30
grep "POST /v1/customers|operationId: PostCustomers" stripe.yaml | head -20
sed -n '84329,84529p' stripe.yaml
sed -n '84520,84670p' stripe.yaml
sed -n '127440,127740p' stripe.yaml
sed -n '127740,128040p' stripe.yaml
sed -n '128038,128238p' stripe.yaml
grep "PostPaymentMethodsPaymentMethodAttach" stripe.yaml | head -100
sed -n '129012,129112p' stripe.yaml
```

{% /tab %}
{% tab label="Haiku 4.5 · run 3 · tree" %}

```bash
redocly tree --help
redocly tree stripe.yaml --format=ai --find="subscription" 2>/dev/null | head -50
redocly tree stripe.yaml --format=ai --operation="PostCustomersCustomerSubscriptions" --with-deps 2>/dev/null
redocly tree stripe.yaml --format=ai --find="customer" --operation="post" 2>/dev/null | grep -E "post|Create" | head -20
redocly tree stripe.yaml --format=ai --find="customer" 2>/dev/null | head -80
redocly tree stripe.yaml --format=ai --find="payment method" 2>/dev/null | head -80
redocly tree stripe.yaml --format=ai --operation="PostCustomers" --with-deps 2>/dev/null | head -150
redocly tree stripe.yaml --format=ai --operation="PostPaymentMethods" --with-deps 2>/dev/null | head -200
cat /Users/tora/.claude/projects/-Users-tora-bench-run-stripe-tree-help-local-haiku-r3/5a91a89d-56ca-4086-abc8-79b3027f051e/tool-results/bo9kehdz3.txt
redocly tree stripe.yaml --format=ai --operation="PostPaymentMethodsPaymentMethodAttach" --with-deps 2>/dev/null | head -80
```

{% /tab %}
{% tab label="Haiku 4.5 · run 4 · no tree" %}

```bash
cat stripe.yaml
grep "subscription|trial|customer|payment" stripe.yaml
grep "subscription.*POST|/subscriptions|trial_end|trial_period|billing_cycle_anchor" stripe.yaml | head -100
grep "'/v1/customers/\\{customer\\}/subscriptions':|post:|paths:" stripe.yaml | head -50
sed -n '88550,88950p' stripe.yaml
sed -n '88950,89550p' stripe.yaml
sed -n '89620,89920p' stripe.yaml
grep "'/v1/customers':|payment_method|default_payment_method" stripe.yaml | head -50
grep -n "'/v1/customers'" stripe.yaml | head -20
grep "^  '/v1/customers':|PostCustomers|payment_methods.*attach" stripe.yaml | head -200
sed -n '128970,129270p' stripe.yaml
sed -n '84450,84850p' stripe.yaml
grep "'/v1/prices':|price_data|product" stripe.yaml | head -30
```

{% /tab %}
{% tab label="Haiku 4.5 · run 4 · tree" %}

```bash
redocly tree --help
cat /Users/tora/bench-run/stripe-tree-help-local-haiku-r4
find /Users/tora/bench-run/stripe-tree-help-local-haiku-r4 -name "stripe.yaml" -o -name "*.yaml" | head -20
redocly tree stripe.yaml --find="subscription" --format=ai
redocly tree stripe.yaml --find="trial" --format=ai
redocly tree stripe.yaml --path="/v1/subscriptions" --operation="post" --format=ai --with-deps
redocly tree stripe.yaml --component=schemas --name=subscription --with-deps 2>/dev/null | grep -A 50 "trial"
redocly tree stripe.yaml --find="customer" --format=ai | head -40
redocly tree stripe.yaml --path="/v1/customers/{customer}" --operation="get" --format=ai
redocly tree stripe.yaml --component=schemas --name=subscriptions_resource_trial_settings_trial_settings --format=ai
redocly tree stripe.yaml --component=schemas --name=subscriptions_resource_trial_settings_end_behavior --format=ai
redocly tree stripe.yaml --component=schemas --name=customer --format=ai 2>/dev/null | grep -A 30 "default_source\|sources"
redocly tree stripe.yaml --path="/v1/customers/{customer}/subscriptions" --operation="post" --format=ai 2>/dev/null | head -100
```

{% /tab %}
{% tab label="Haiku 4.5 · run 5 · no tree" %}

```bash
cat stripe.yaml
grep "(subscription|customer|trial|billing|product|price)" stripe.yaml
grep "^  /.*:$|post:|get:|path:|operationId:" stripe.yaml | head -100
grep "(/v1/customers|/v1/subscriptions|/v1/products|/v1/prices):" stripe.yaml | head -200
sed -n '84329,86329p' stripe.yaml
sed -n '147301,148801p' stripe.yaml
grep "/v1/payment_methods" stripe.yaml | head -20
```

{% /tab %}
{% tab label="Haiku 4.5 · run 5 · tree" %}

```bash
redocly tree --help
redocly tree stripe.yaml --find="trial" --format=ai
redocly tree stripe.yaml --find="subscription" --format=ai | head -50
redocly tree stripe.yaml --find="payment method" --format=ai
redocly tree stripe.yaml --find="customer" --format=ai | head -40
redocly tree stripe.yaml --path="/v1/customers/{customer}/subscriptions" --operation=post --format=ai --with-deps
redocly tree stripe.yaml --path="/v1/payment_methods/{payment_method}/attach" --operation=post --format=ai --with-deps
redocly tree stripe.yaml --find="price" --format=ai | head -30
redocly tree stripe.yaml --component=schemas --name="subscriptions_resource_trial_settings_trial_settings" --format=ai --with-deps
```

{% /tab %}
{% /tabs %}

{% /tab %}
{% /tabs %}

Only Opus 5 passes — every run with the index, four of five without, where one run left every call unauthenticated. Sonnet 5 and Haiku 4.5 fail every run the same way regardless of condition: they assume a price that already exists — "items[0][price]: your price id" — although the task launches the tier from nothing, and most never say how a call authenticates.
The index does not fix a plan that starts from the wrong premise; it just makes it cheaper.

{% /tab %}

{% tab label="Stripe Climate" %}

**Description:** 6.07 MB in one file — the same file as the previous tab.

**Task:** buy carbon removal — pick a product from what's on offer, order a set number of metric tons, and be able to cancel before delivery.
Expected: `GET /v1/climate/products` → `POST /v1/climate/orders` → `POST /v1/climate/orders/{order}/cancel`.
The point of this description: it is the same file as the previous tab, but a corner no tutorial covers — a model cannot answer it from memory, only from the description. Traps: the quantity rides on `metric_tons`, the cancel is its own `POST`, and payment comes off the merchant balance, so the payment-intent machinery a Stripe-trained prior reaches for has no place here.

{% tabs %}
{% tab label="Prompt: no tree" %}

```text
Our company committed to buying carbon removal. Pick a removal product from what's on
offer, place an order for a set number of metric tons, and be able to cancel that order
before delivery if finance rejects the spend. Work out what our backend has to call.

API description: climate.yaml

Give me a working flow as JSON in your reply: the steps in order, what each one calls, what it
needs, and what to carry from its response into the next step. It has to work as written.
```

{% /tab %}
{% tab label="Prompt: tree" %}

```text
Our company committed to buying carbon removal. Pick a removal product from what's on
offer, place an order for a set number of metric tons, and be able to cancel that order
before delivery if finance rejects the spend. Work out what our backend has to call.

API description: climate.yaml

The Redocly CLI is installed and its `tree` command can search the description for you.
Start with `redocly tree --help` to see what it can select, then work with `--format=ai`:
redocly tree climate.yaml --format=ai <flags>

Give me a working flow as JSON in your reply: the steps in order, what each one calls, what it
needs, and what to carry from its response into the next step. It has to work as written.
```

{% /tab %}
{% /tabs %}

Context the run added, and the tool calls it took (medians over the working runs):

| Model           |       no tree |       tree | Difference |
| --------------- | ------------: | ---------: | ---------: |
| Sonnet 5 (n=5)  |    14,297 / 8 |  8,417 / 7 |       −41% |
| Opus 5 (n=5)    |    14,761 / 8 |  9,888 / 8 |       −33% |
| Haiku 4.5 (n=5) | 14,305 / 8 ❌ | 9,823 / 12 |          — |

What those runs were billed:

| Model           |  no tree |  tree | Difference |
| --------------- | -------: | ----: | ---------: |
| Sonnet 5 (n=5)  |    $0.33 | $0.26 |       −21% |
| Opus 5 (n=5)    |    $0.57 | $0.47 |       −18% |
| Haiku 4.5 (n=5) | $0.10 ❌ | $0.10 |          — |

Whether each run produced a flow that would run:

| Run               | no tree        | tree  |
| ----------------- | -------------- | ----- |
| Sonnet 5 · run 1  | works          | works |
| Sonnet 5 · run 2  | works          | works |
| Sonnet 5 · run 3  | works          | works |
| Sonnet 5 · run 4  | no auth scheme | works |
| Sonnet 5 · run 5  | works          | works |
| Opus 5 · run 1    | works          | works |
| Opus 5 · run 2    | works          | works |
| Opus 5 · run 3    | works          | works |
| Opus 5 · run 4    | works          | works |
| Opus 5 · run 5    | works          | works |
| Haiku 4.5 · run 1 | no auth scheme | works |
| Haiku 4.5 · run 2 | no auth scheme | works |
| Haiku 4.5 · run 3 | no auth scheme | works |
| Haiku 4.5 · run 4 | no auth scheme | works |
| Haiku 4.5 · run 5 | no auth scheme | works |

A run works when its flow contains the product listing, the order create naming `product` and `metric_tons`, and the cancel call, authenticated with the secret key.

What each run ran:

{% tabs %}
{% tab label="Sonnet 5" %}

{% tabs %}
{% tab label="Sonnet 5 · run 1 · no tree" %}

```bash
cat climate.yaml
grep "^  /[a-zA-Z/{}._-]+:" climate.yaml
wc -l climate.yaml; head -c 500 climate.yaml
grep -n "climate/(orders|products|suppliers)" climate.yaml
sed -n '81864,81970p' climate.yaml
sed -n '81969,82019p' climate.yaml
sed -n '81470,81660p' climate.yaml
sed -n '81660,81810p' climate.yaml
sed -n '81808,81864p' climate.yaml
grep -n "^    climate\\.(order|product):" climate.yaml
sed -n '9345,9510p' climate.yaml
sed -n '9506,9576p' climate.yaml
Artifact
```

{% /tab %}
{% tab label="Sonnet 5 · run 1 · tree" %}

```bash
ls && redocly tree --help
redocly tree climate.yaml --format=ai --tag
redocly tree climate.yaml --format=ai --find=order
redocly tree climate.yaml --format=ai --find=product
redocly tree climate.yaml --format=ai --find=cancel
redocly tree climate.yaml --format=ai --path=/v1/climate/products --operation=get --with-deps
redocly tree climate.yaml --format=ai --path=/v1/climate/orders --operation=post --with-deps
redocly tree climate.yaml --format=ai --path=/v1/climate/orders/{order}/cancel --operation=post --with-deps
redocly tree climate.yaml --format=ai --path=/v1/climate/orders/{order} --operation=get --with-deps
```

{% /tab %}
{% tab label="Sonnet 5 · run 2 · no tree" %}

```bash
cat climate.yaml
grep "^  /[a-zA-Z].*:$" climate.yaml
sed -n '81470,81870p' climate.yaml
sed -n '81864,82024p' climate.yaml
grep -n "^    climate\\.(product|order):$" climate.yaml
grep -n "climate\\.(product|order):" climate.yaml
grep -n "climate\\.product:|climate\\.order:" climate.yaml
sed -n '9345,9605p' climate.yaml
```

{% /tab %}
{% tab label="Sonnet 5 · run 2 · tree" %}

```bash
ls -la *.yaml 2>/dev/null; redocly tree --help
redocly tree climate.yaml --format=ai --tag | head -100
redocly tree climate.yaml --format=ai --find "removal" | head -100
redocly tree climate.yaml --format=ai --find "climate" --operations | head -50
redocly tree climate.yaml --format=ai --path "/v1/climate/orders"
redocly tree climate.yaml --format=ai --path "/v1/climate/products"
redocly tree climate.yaml --format=ai --find "climate/orders"
redocly tree climate.yaml --format=ai --path "/v1/climate/products" --operation get --with-deps
redocly tree climate.yaml --format=ai --path "/v1/climate/orders" --operation post --with-deps
redocly tree climate.yaml --format=ai --path "/v1/climate/orders/{order}/cancel" --operation post --with-deps
```

{% /tab %}
{% tab label="Sonnet 5 · run 3 · no tree" %}

```bash
cat climate.yaml
grep "^  /" climate.yaml
sed -n '81470,81870p' climate.yaml
sed -n '81864,82014p' climate.yaml
grep -n "^    climate\\.(product|order):" climate.yaml
sed -n '9345,9605p' climate.yaml
true
```

{% /tab %}
{% tab label="Sonnet 5 · run 3 · tree" %}

```bash
redocly tree --help
redocly tree climate.yaml --format=ai --tag
redocly tree climate.yaml --format=ai --find=order
redocly tree climate.yaml --format=ai --find=removal
redocly tree climate.yaml --format=ai --find=product
redocly tree climate.yaml --format=ai --path=/v1/climate/products --operation=get --with-deps
redocly tree climate.yaml --format=ai --path=/v1/climate/orders --operation=post --with-deps
redocly tree climate.yaml --format=ai --path=/v1/climate/orders/{order}/cancel --operation=post --with-deps
```

{% /tab %}
{% tab label="Sonnet 5 · run 4 · no tree" %}

```bash
cat climate.yaml
grep "^  /" climate.yaml
sed -n '81470,81870p' climate.yaml
sed -n '81864,82024p' climate.yaml
grep -n "^    climate\\.(order|product):" climate.yaml
sed -n '9345,9595p' climate.yaml
Artifact
```

{% /tab %}
{% tab label="Sonnet 5 · run 4 · tree" %}

```bash
redocly tree --help
redocly tree climate.yaml --format=ai --tag
redocly tree climate.yaml --format=ai --find order | head -100
redocly tree climate.yaml --format=ai --find "climate product" | head -50
redocly tree climate.yaml --format=ai --path=/v1/climate/products --operation=get --with-deps | head -150
redocly tree climate.yaml --format=ai --path=/v1/climate/orders --operation=post --with-deps | head -200
redocly tree climate.yaml --format=ai --path=/v1/climate/orders/{order}/cancel --operation=post --with-deps | head -100
```

{% /tab %}
{% tab label="Sonnet 5 · run 5 · no tree" %}

```bash
cat climate.yaml
grep "^  /" climate.yaml
sed -n '81470,81870p' climate.yaml
sed -n '81864,82014p' climate.yaml
grep -n "^    climate\\.(product|order):" climate.yaml
grep -n "climate\\.product:|climate\\.order:" climate.yaml
grep -n "    climate\\.order:|    climate\\.product:" climate.yaml
sed -n '9345,9605p' climate.yaml
```

{% /tab %}
{% tab label="Sonnet 5 · run 5 · tree" %}

```bash
redocly tree --help
redocly tree climate.yaml --format=ai --operations
redocly tree climate.yaml --format=ai --find=climate
redocly tree climate.yaml --format=ai --path=/v1/climate/products --operation=get --with-deps
redocly tree climate.yaml --format=ai --path=/v1/climate/orders --operation=post --with-deps
redocly tree climate.yaml --format=ai --path=/v1/climate/orders/{order}/cancel --operation=post --with-deps
redocly tree climate.yaml --format=ai --path=/v1/climate/products --operation=get | head -5
```

{% /tab %}
{% /tabs %}

{% /tab %}
{% tab label="Opus 5" %}

{% tabs %}
{% tab label="Opus 5 · run 1 · no tree" %}

```bash
wc -l climate.yaml
grep -n "^  /[a-zA-Z0-9{}/_.-]*:" climate.yaml | head -300
grep -n "climate" climate.yaml | head -120
sed -n '81470,81870p' climate.yaml
sed -n '81864,82014p' climate.yaml
sed -n '9345,9745p' climate.yaml
grep -n -A6 "^servers:" climate.yaml; grep -n -A12 "securitySchemes:" climate.yaml | head -30
grep -c "Idempotency-Key" climate.yaml
```

{% /tab %}
{% tab label="Opus 5 · run 1 · tree" %}

```bash
ls && redocly tree --help
redocly tree climate.yaml --format=ai | head -100
redocly tree climate.yaml --format=ai --find=climate
redocly tree climate.yaml --format=ai --path=/v1/climate/products --operation=get --with-deps | head -120; echo "=====PRODUCT SCHEMA"; redocly tree climate.yaml --format=ai --component=schemas --name=climate.product --with-deps
for p in "/v1/climate/orders:post" "/v1/climate/orders/{order}:get" "/v1/climate/orders/{order}/cancel:post"; do path=${p%:*}; m=${p#*:}; echo "===== $m $path"; redocly tree climate.yaml --format=ai --path="$path" --operation=$m; done
redocly tree climate.yaml --format=ai --path="/v1/climate/orders" --operation=post
redocly tree climate.yaml --format=ai --path="/v1/climate/orders/{order}" --operation=get; echo ===; redocly tree climate.yaml --format=ai --path="/v1/climate/orders/{order}/cancel" --operation=post; echo ===ORDERSCHEMA; redocly tree climate.yaml --format=ai --component=schemas --name=climate.order
redocly tree climate.yaml --format=ai --path="/v1/climate/orders/{order}/cancel" --operation=post
redocly tree climate.yaml --format=ai --component=schemas --name=climate.order
```

{% /tab %}
{% tab label="Opus 5 · run 2 · no tree" %}

```bash
wc -l climate.yaml
head -40 climate.yaml && echo "=== PATHS ===" && grep -n "^  /" climate.yaml | head -100
grep -n "^  /v1/climate" climate.yaml && sed -n '81470,82212p' climate.yaml
grep -n "^    climate\.\(order\|product\|supplier\):" climate.yaml
sed -n '9345,9600p' climate.yaml
grep -n "climate_removals_products_price:" climate.yaml && sed -n "$(grep -n 'climate_removals_products_price:' climate.yaml | head -1 | cut -d: -f1),+35p" climate.yaml && echo "=== SERVERS/SEC ===" && grep -n "^servers:\|^security:\|^  - url:\|BasicAuth\|BearerAuth" climate.yaml | head -20
sed -n '169885,169895p' climate.yaml && grep -n "securitySchemes:" -A 12 climate.yaml | head -20
grep -c -i "idempotency" climate.yaml
grep -n -i "idempotency" climate.yaml
```

{% /tab %}
{% tab label="Opus 5 · run 2 · tree" %}

```bash
ls && redocly tree --help
redocly tree climate.yaml --format=ai | head -100
redocly tree climate.yaml --format=ai --find=climate | head -60
redocly tree climate.yaml --format=ai --path=/v1/climate/products --operation=get --with-deps | head -120; echo ===; redocly tree climate.yaml --format=ai --path=/v1/climate/orders --operation=post --with-deps | head -160
redocly tree climate.yaml --format=ai --path=/v1/climate/orders --operation=post --with-deps | head -80
redocly tree climate.yaml --format=ai --path=/v1/climate/orders/{order}/cancel --operation=post | head -40
redocly tree climate.yaml --format=ai --component=schemas --name=climate.product --with-deps | head -60
redocly tree climate.yaml --format=ai --path='/v1/climate/orders/{order}' --operation=get | head -30
```

{% /tab %}
{% tab label="Opus 5 · run 3 · no tree" %}

```bash
wc -l climate.yaml
grep -n "^paths:\|^components:\|^info:\|^servers:\|^tags:" climate.yaml; echo "---PATHS---"; grep -n "^  /" climate.yaml
grep -n "climate" climate.yaml | head -80
sed -n '81470,82030p' climate.yaml
sed -n '9345,9765p' climate.yaml
sed -n '169894,169900p' climate.yaml; echo "---SEC---"; grep -n "securitySchemes" -A 25 climate.yaml | head -40; echo "---INFO---"; sed -n '63422,63436p' climate.yaml
grep -in "idempotency" climate.yaml | head -5
```

{% /tab %}
{% tab label="Opus 5 · run 3 · tree" %}

```bash
ls && redocly tree --help
redocly tree climate.yaml --format=ai --operations
redocly tree climate.yaml --format=ai --find "climate"
redocly tree climate.yaml --format=ai --operation=GetClimateProducts --with-deps | head -150
redocly tree climate.yaml --format=ai --operation=PostClimateOrders --with-deps | head -80
redocly tree climate.yaml --format=ai --operation=PostClimateOrdersOrderCancel | head -40; echo "=== RETRIEVE ORDER ==="; redocly tree climate.yaml --format=ai --operation=GetClimateOrdersOrder | head -20
redocly tree climate.yaml --format=ai --component=schemas --name="climate.product" --with-deps | head -40
redocly tree climate.yaml --format=ai --component=schemas --name="climate.order" | head -20; echo "=== SERVERS/AUTH ==="; redocly tree climate.yaml --format=ai | head -30
```

{% /tab %}
{% tab label="Opus 5 · run 4 · no tree" %}

```bash
wc -l climate.yaml
grep -n "^  /" climate.yaml | head -200
sed -n '81470,82212p' climate.yaml
grep -n "^    climate\." climate.yaml
sed -n '9345,9660p' climate.yaml
grep -n -A14 "    climate_removals_products_price:" climate.yaml && echo "=== SERVERS/SECURITY ===" && grep -n -A12 "^servers:" climate.yaml && grep -n -A20 "  securitySchemes:" climate.yaml | head -30
```

{% /tab %}
{% tab label="Opus 5 · run 4 · tree" %}

```bash
ls && redocly tree --help
redocly tree climate.yaml --format=ai --operations
redocly tree climate.yaml --format=ai --find climate
redocly tree climate.yaml --format=ai --operation GetClimateProducts --with-deps | head -120
redocly tree climate.yaml --format=ai --operation PostClimateOrders --with-deps | head -60; echo "=====CANCEL"; redocly tree climate.yaml --format=ai --operation PostClimateOrdersOrderCancel --with-deps | head -40
redocly tree climate.yaml --format=ai --component schemas --name climate.product --with-deps | head -40; echo "=====SERVERS"; redocly tree climate.yaml --format=ai | head -20
redocly tree climate.yaml --format=ai --operation GetClimateOrdersOrder | head -6
```

{% /tab %}
{% tab label="Opus 5 · run 5 · no tree" %}

```bash
wc -l climate.yaml
grep -n "^  /" climate.yaml | head -100
head -60 climate.yaml
sed -n '81470,82215p' climate.yaml
grep -n "^    climate\.\(order\|product\|supplier\):" climate.yaml; grep -n "^servers:\|^  securitySchemes:\|^security:\|^  - basicAuth\|^openapi:\|^info:" climate.yaml
sed -n '9345,9640p' climate.yaml
sed -n '63408,63436p;169889,169895p' climate.yaml
grep -n "climate_removals_products_price:" -A 20 climate.yaml; grep -cn "Idempotency-Key" climate.yaml
```

{% /tab %}
{% tab label="Opus 5 · run 5 · tree" %}

```bash
ls -la && redocly tree --help
redocly tree climate.yaml --format=ai --tag | head -100
redocly tree climate.yaml --format=ai --find "removal" | head -80; echo "=== ORDER ==="; redocly tree climate.yaml --format=ai --find "order" | head -80
redocly tree climate.yaml --format=ai --find "climate" | head -40
redocly tree climate.yaml --format=ai | head -30; echo "=== UPDATE ==="; redocly tree climate.yaml --format=ai --operation PostClimateOrdersOrder | sed -n '4p' | head -c 1500
```

{% /tab %}
{% /tabs %}

{% /tab %}
{% tab label="Haiku 4.5" %}

{% tabs %}
{% tab label="Haiku 4.5 · run 1 · no tree" %}

```bash
cat climate.yaml
grep "^(paths|\\/|\\s+get:|post:|delete:)" climate.yaml | head -200
grep "product|order|removal|cancel" climate.yaml | head -150
grep "/v1/climate" climate.yaml | head -300
sed -n '81470,81570p' climate.yaml
sed -n '81569,81719p' climate.yaml
sed -n '81808,81908p' climate.yaml
sed -n '9345,9545p' climate.yaml
```

{% /tab %}
{% tab label="Haiku 4.5 · run 1 · tree" %}

```bash
redocly tree --help
redocly tree climate.yaml --operations --format=ai
redocly tree climate.yaml --find="removal|product|order|carbon" --format=ai
redocly tree climate.yaml --tag --format=ai
redocly tree climate.yaml --find="product" --format=ai
redocly tree climate.yaml --find="climate" --format=ai
redocly tree climate.yaml --path="/v1/climate/orders" --operation="post" --with-deps --format=ai
redocly tree climate.yaml --path="/v1/climate/orders/{order}/cancel" --operation="post" --with-deps --format=ai
redocly tree climate.yaml --path="/v1/climate/products" --operation="get" --with-deps --format=ai
```

{% /tab %}
{% tab label="Haiku 4.5 · run 2 · no tree" %}

```bash
Skill
cat climate.yaml
grep "(?i)(product|order|cancel|removal|removal.*product|list.*product)" climate.yaml | head -100
grep "^  /(.*climate.*?):" climate.yaml | head -50
sed -n '81470,81870p' climate.yaml
sed -n '81864,82064p' climate.yaml
sed -n '9506,9606p' climate.yaml
sed -n '9345,9505p' climate.yaml
```

{% /tab %}
{% tab label="Haiku 4.5 · run 2 · tree" %}

```bash
redocly tree --help
redocly tree climate.yaml --format=ai --operations
redocly tree climate.yaml --format=ai --find="carbon\|removal\|order\|product" | head -100
redocly tree climate.yaml --format=ai --tag
head -50 climate.yaml
ls -la *.yaml *.yml 2>/dev/null | head -20
find . -maxdepth 3 -name "*.yaml" -o -name "*.yml" 2>/dev/null
grep -i "climate\|carbon\|removal\|sustainability\|emission\|offset\|renewable" climate.yaml | head -20
redocly tree climate.yaml --format=ai --find="climate"
redocly tree climate.yaml --format=ai --operation="get" --path="/v1/climate/products"
redocly tree climate.yaml --format=ai --component=schemas --name=climate.product
redocly tree climate.yaml --format=ai --operation="post" --path="/v1/climate/orders"
redocly tree climate.yaml --format=ai --operation="post" --path="/v1/climate/orders/{order}/cancel"
redocly tree climate.yaml --format=ai --component=schemas --name=climate.order
redocly tree climate.yaml --format=ai --operation="get" --path="/v1/climate/orders/{order}"
```

{% /tab %}
{% tab label="Haiku 4.5 · run 3 · no tree" %}

```bash
cat climate.yaml
grep "product|order|removal|cancel" climate.yaml | head -100
grep "paths:.*climate|/climate" climate.yaml
sed -n '81864,82064p' climate.yaml
sed -n '9506,9606p' climate.yaml
sed -n '81470,81670p' climate.yaml
sed -n '9345,9545p' climate.yaml
sed -n '81808,81908p' climate.yaml
sed -n '81675,81825p' climate.yaml
```

{% /tab %}
{% tab label="Haiku 4.5 · run 3 · tree" %}

```bash
redocly tree --help
ls -la climate.yaml
redocly tree climate.yaml --format=ai --operations
redocly tree climate.yaml --format=ai --find "product"
redocly tree climate.yaml --format=ai --find "removal"
redocly tree climate.yaml --format=ai --find "order"
redocly tree climate.yaml --format=ai --path=/v1/climate/products --with-deps
redocly tree climate.yaml --format=ai --path=/v1/climate/orders --operation=post --with-deps
redocly tree climate.yaml --format=ai --path=/v1/climate/products --operation=get --with-deps
redocly tree climate.yaml --format=ai --path=/v1/climate/orders --operation=get --with-deps
redocly tree climate.yaml --format=ai --operation=GetClimateOrdersOrderCancel --with-deps
redocly tree climate.yaml --format=ai --find "cancel" | head -30
redocly tree climate.yaml --format=ai --path=/v1/climate/orders/{order}/cancel --operation=post --with-deps
redocly tree climate.yaml --format=ai --path=/v1/climate/orders/{order} --operation=get --with-deps
Artifact
```

{% /tab %}
{% tab label="Haiku 4.5 · run 4 · no tree" %}

```bash
cat climate.yaml
grep "^  /(.*?):|paths:|components:|Product|Order|Cancel|Delivery|carbon|removal" climate.yaml | head -100
grep "^paths:|/climate/orders|/climate/products|post:|get:|delete:" climate.yaml | head -150
sed -n '81470,81820p' climate.yaml
sed -n '81809,81959p' climate.yaml
grep "climate\\.order:|climate\\.product:|^    title: ClimateRemovalsOrders|^    title: ClimateRemovalsProducts" climate.yaml | head -20
sed -n '9345,9545p' climate.yaml
sed -n '9541,9641p' climate.yaml
```

{% /tab %}
{% tab label="Haiku 4.5 · run 4 · tree" %}

```bash
redocly tree --help
redocly tree climate.yaml --format=ai --find "product\|order\|remove\|cancel"
redocly tree climate.yaml --format=ai --operations
redocly tree climate.yaml --format=ai --tag
redocly tree climate.yaml --format=ai --find "removal"
redocly tree climate.yaml --format=ai --find "climate"
redocly tree climate.yaml --format=ai --operation GetClimateProducts --with-deps
redocly tree climate.yaml --format=ai --operation PostClimateOrders --with-deps
redocly tree climate.yaml --format=ai --operation PostClimateOrdersOrderCancel --with-deps
redocly tree climate.yaml --format=ai --operation GetClimateOrdersOrder --with-deps
redocly tree climate.yaml --format=ai --operation GetClimateProductsProduct --with-deps
redocly tree climate.yaml --format=ai --component schemas --name climate_removals_products_price
```

{% /tab %}
{% tab label="Haiku 4.5 · run 5 · no tree" %}

```bash
cat climate.yaml
grep "carbon|removal|product|order|cancel" climate.yaml | head -100
grep "paths:|/v1/climate|POST|GET" climate.yaml | head -150
sed -n '81470,81870p' climate.yaml
sed -n '81864,82064p' climate.yaml
sed -n '9506,9656p' climate.yaml
sed -n '9345,9545p' climate.yaml
```

{% /tab %}
{% tab label="Haiku 4.5 · run 5 · tree" %}

```bash
redocly tree --help
redocly tree climate.yaml --format=ai --operations
redocly tree climate.yaml --format=ai --find=product
redocly tree climate.yaml --format=ai --find=order
redocly tree climate.yaml --format=ai --path=/v1/climate/products
redocly tree climate.yaml --format=ai --operation=get --path=/v1/climate/products --with-deps
redocly tree climate.yaml --format=ai --operation=post --path=/v1/climate/orders --with-deps
redocly tree climate.yaml --format=ai --operation=post --path=/v1/climate/orders/{order}/cancel --with-deps
redocly tree climate.yaml --format=ai --operation=get --path=/v1/climate/orders/{order} --with-deps
```

{% /tab %}
{% /tabs %}

{% /tab %}
{% /tabs %}

The same file that defeats Sonnet 5 and Haiku 4.5 on the mainstream task is no obstacle here: every model finds the three calls, and the index cuts context by roughly a third for all of them.
Haiku 4.5 is the cleanest result in the whole grid — its five control runs all propose the right calls and all fail for the same missing authentication, and its five index runs all pass, quoting the `Authorization: Bearer` header the overview's `security:` line hands it.
Set against the previous tab, this is the prior-contamination experiment: same file, same models, and only the corner of the API changed. The mainstream failures were never about finding things — they were about not looking.

{% /tab %}

{% tab label="PayPal Orders" %}

**Description:** 0.93 MB in one file, JSON rather than YAML.

**Task:** take the buyer's payment for a cart, capture it once they approve, and file the shipment's tracking number against that payment.
Expected: `POST /v2/checkout/orders` → `POST /v2/checkout/orders/{id}/capture` → `POST /v2/checkout/orders/{id}/track`.
Traps: capture happens only after an approval step that is not an API call; the tracker binds to the `capture_id` from the capture response, not to the order; the OAuth2 token endpoint is not a path in this description.

{% tabs %}
{% tab label="Prompt: no tree" %}

```text
We sell physical goods online: take the buyer's payment for a cart, capture the money once
they approve, and file the shipment's tracking number against that payment so the buyer
sees it. Work out what our backend has to call, end to end.

API description: paypal.json

Give me a working flow as JSON in your reply: the steps in order, what each one calls, what it
needs, and what to carry from its response into the next step. It has to work as written.
```

{% /tab %}
{% tab label="Prompt: tree" %}

```text
We sell physical goods online: take the buyer's payment for a cart, capture the money once
they approve, and file the shipment's tracking number against that payment so the buyer
sees it. Work out what our backend has to call, end to end.

API description: paypal.json

The Redocly CLI is installed and its `tree` command can search the description for you.
Start with `redocly tree --help` to see what it can select, then work with `--format=ai`:
redocly tree paypal.json --format=ai <flags>

Give me a working flow as JSON in your reply: the steps in order, what each one calls, what it
needs, and what to carry from its response into the next step. It has to work as written.
```

{% /tab %}
{% /tabs %}

Context the run added, and the tool calls it took (medians over the working runs):

| Model           |     no tree |        tree | Difference |
| --------------- | ----------: | ----------: | ---------: |
| Sonnet 5 (n=5)  |  9,857 / 12 | 17,435 / 10 |       +77% |
| Opus 5 (n=5)    | 18,038 / 11 | 21,656 / 20 |       +20% |
| Haiku 4.5 (n=5) |  17,624 / 9 | 19,569 / 14 |       +11% |

What those runs were billed:

| Model           | no tree |  tree | Difference |
| --------------- | ------: | ----: | ---------: |
| Sonnet 5 (n=5)  |   $0.40 | $0.38 |        −5% |
| Opus 5 (n=5)    |   $0.71 | $0.93 |       +31% |
| Haiku 4.5 (n=5) |   $0.11 | $0.12 |        +9% |

Whether each run produced a flow that would run:

| Run               | no tree                          | tree                              |
| ----------------- | -------------------------------- | --------------------------------- |
| Sonnet 5 · run 1  | works                            | works                             |
| Sonnet 5 · run 2  | works                            | works                             |
| Sonnet 5 · run 3  | works                            | works                             |
| Sonnet 5 · run 4  | works                            | works                             |
| Sonnet 5 · run 5  | works                            | works                             |
| Opus 5 · run 1    | works                            | works                             |
| Opus 5 · run 2    | works                            | works                             |
| Opus 5 · run 3    | works                            | works                             |
| Opus 5 · run 4    | works                            | works                             |
| Opus 5 · run 5    | works                            | works                             |
| Haiku 4.5 · run 1 | no tracker call                  | no intent field, no carrier field |
| Haiku 4.5 · run 2 | no auth scheme                   | no intent field, no auth scheme   |
| Haiku 4.5 · run 3 | no intent field, no capture call | works                             |
| Haiku 4.5 · run 4 | works                            | works                             |
| Haiku 4.5 · run 5 | no tracker call, no auth scheme  | works                             |

A run works when its flow contains the order create naming `intent` and `purchase_units`, the capture, and the tracker call naming `capture_id`, `tracking_number` and `carrier`, with the OAuth2 access token named in any spelling.

What each run ran:

{% tabs %}
{% tab label="Sonnet 5" %}

{% tabs %}
{% tab label="Sonnet 5 · run 1 · no tree" %}

```bash
python3 -c "
import json
with open('paypal.json') as f:
spec = json.load(f)
print(list(spec.keys()))
print(spec.get('info'))
"
for p,v in spec['paths'].items():
print(p, list(v.keys()))
def show(path, method):
op = spec['paths'][path][method]
print('====', method.upper(), path, '====')
print('operationId:', op.get('operationId'))
print('summary:', op.get('summary'))
rb = op.get('requestBody')
if rb:
ref = rb.get('content',{}).get('application/json',{}).get('schema',{})
print('requestBody schema ref:', ref)
print('responses:', list(op.get('responses',{}).keys()))
for code in ['200','201']:
r = op.get('responses',{}).get(code)
if r:
c = r.get('content',{}).get('application/json',{}).get('schema',{})
print(code, 'response schema:', c)
print()
show('/v2/checkout/orders','post')
show('/v2/checkout/orders/{id}','get')
show('/v2/checkout/orders/{id}/capture','post')
show('/v2/checkout/orders/{id}/track','post')
schemas = spec['components']['schemas']
for name in ['order_request','order_capture_request','order_tracker_request','link_description','order']:
print('====', name, '====')
print(json.dumps(schemas.get(name,{}), indent=1)[:2000])
print('=== payments ===')
print(json.dumps(schemas.get('payments',{}), indent=1)[:1500])
print('=== capture (partial) ===')
c = schemas.get('capture',{})
print(list(c.get('properties',{}).keys()) if 'properties' in c else c.get('allOf'))
print('=== shipment_tracker ===')
print(json.dumps(schemas.get('shipment_tracker',{}), indent=1)[:1500])
mkdir -p /private/tmp/claude-501/-Users-tora-bench-run-paypal-control-v3-sonnet-r1/d3a744e3-22cb-4c60-8abd-219273cecb79/scratchpad
```

{% /tab %}
{% tab label="Sonnet 5 · run 1 · tree" %}

```bash
redocly tree --help
redocly tree paypal.json --format=ai --find="order create" | head -100
redocly tree paypal.json --format=ai --tag | head -100
redocly tree paypal.json --format=ai --path=/v2/checkout/orders --operation=post --with-deps | head -300
redocly tree paypal.json --format=ai --path=/v2/checkout/orders/{id}/capture --operation=post | head -150
redocly tree paypal.json --format=ai --path=/v2/checkout/orders/{id}/track --operation=post | head -200
redocly tree paypal.json --format=ai --find="approve" | head -30
redocly tree paypal.json --format=ai --component=schemas --name=order_capture_request | head -60
```

{% /tab %}
{% tab label="Sonnet 5 · run 2 · no tree" %}

```bash
wc -l paypal.json
python3 -c "
import json
spec = json.load(open('paypal.json'))
paths = spec.get('paths', {})
for p in paths:
if 'order' in p.lower() or 'track' in p.lower() or 'capture' in p.lower():
print(p, list(paths[p].keys()))
"
import sys
for p in ['/v2/checkout/orders']:
op = paths[p]['post']
print('OPERATION ID:', op.get('operationId'))
print('SUMMARY:', op.get('summary'))
print('REQUEST BODY REF:', json.dumps(op.get('requestBody',{}), indent=2)[:2000])
op = paths['/v2/checkout/orders']['post']
print(json.dumps(op.get('responses',{}).get('201',{}), indent=2)[:3000])
op = paths['/v2/checkout/orders/{id}/capture']['post']
print('PARAMS:', json.dumps(op.get('parameters',[]), indent=2)[:1000])
print('REQBODY:', json.dumps(op.get('requestBody',{}).get('content',{}).get('application/json',{}).get('schema',{}), indent=2)[:500])
print('RESP 201 desc:', op.get('responses',{}).get('201',{}).get('description'))
op = paths['/v2/checkout/orders/{id}/track']['post']
print('PARAMS:', json.dumps(op.get('parameters',[]), indent=2)[:800])
schema_ref = op.get('requestBody',{}).get('content',{}).get('application/json',{}).get('schema',{})
print('SCHEMA REF:', schema_ref)
ex = op.get('requestBody',{}).get('content',{}).get('application/json',{}).get('examples',{})
print('EXAMPLES:', json.dumps(ex, indent=2)[:2000])
schemas = spec['components']['schemas']
s = schemas['order_tracker_request']
print(json.dumps(s, indent=2)[:2000])
s = schemas['shipment_tracker']
print(json.dumps(s, indent=2)[:2500])
o = schemas['order']
print(list(o.get('properties',{}).keys()) if 'properties' in o else o.get('allOf'))
if 'token' in p.lower() or 'oauth' in p.lower():
print(json.dumps(spec.get('components',{}).get('securitySchemes',{}), indent=2)[:1000])
oc = schemas['order_capture_request']
print(json.dumps(oc, indent=2)[:800])
Artifact
rm -f /private/tmp/claude-501/-Users-tora-bench-run-paypal-control-v3-sonnet-r2/4386981e-3416-4cfd-9afd-9945a0a2dfd4/scratchpad/placeholder.md
```

{% /tab %}
{% tab label="Sonnet 5 · run 2 · tree" %}

```bash
redocly tree --help
redocly tree paypal.json --format=ai --find="order" | head -100
redocly tree paypal.json --format=ai --path="/v2/checkout/orders" --operation=post --with-deps | head -300
redocly tree paypal.json --format=ai --path="/v2/checkout/orders/{id}/capture" --operation=post | head -150
redocly tree paypal.json --format=ai --path="/v2/checkout/orders/{id}/capture" --operation=post | sed -n '150,260p'
redocly tree paypal.json --format=ai --path="/v2/checkout/orders/{id}/track" --operation=post | head -180
redocly tree paypal.json --format=ai --component=schemas --name=order_tracker_request | head -100
redocly tree paypal.json --format=ai --component=schemas --name=shipment_tracker | head -60
```

{% /tab %}
{% tab label="Sonnet 5 · run 3 · no tree" %}

```bash
python3 -c "
import json
data = json.load(open('paypal.json'))
paths = data.get('paths', {})
for p in paths:
if 'checkout' in p.lower() or 'track' in p.lower() or 'order' in p.lower():
print(p, list(paths[p].keys()))
"
def show(p, m):
op = paths[p][m]
print('====', m.upper(), p, '====')
print('summary:', op.get('summary'))
rb = op.get('requestBody')
if rb:
content = rb.get('content', {})
for ct, c in content.items():
schema = c.get('schema', {})
print('requestBody schema ref/keys:', schema)
for resp_code, resp in op.get('responses', {}).items():
print('response', resp_code, ':', json.dumps(resp)[:300])
print()
show('/v2/checkout/orders', 'post')
schemas = data['components']['schemas']
def brief_props(name, depth=0, seen=None):
if seen is None: seen=set()
s = schemas.get(name, {})
req = s.get('required', [])
props = s.get('properties', {})
print('  '*depth + f'{name} required={req}')
for k,v in props.items():
ref = v.get('\$ref') or (v.get('items',{}).get('\$ref') if v.get('type')=='array' else None)
print('  '*(depth+1) + f'{k}: ' + (ref if ref else v.get('type','?')))
brief_props('order_request')
def brief(name):
if not s:
print(name, 'NOT FOUND'); return
print(f'{name} required={req}')
print('  ' + f'{k}: ' + (ref if ref else v.get('type','?')))
for n in ['purchase_unit_request','amount_with_breakdown','item','order','purchase_unit','link_description','order_status']:
brief(n)
print(json.dumps(schemas['order']['properties'], indent=1)[:2000])
print(json.dumps(schemas['order'], indent=1)[:1500])
paths = data['paths']
op = paths['/v2/checkout/orders/{id}/capture']['post']
print('summary', op.get('summary'))
print('params', [p.get('name') for p in op.get('parameters',[])])
print('reqBody', op.get('requestBody'))
for code, r in op.get('responses',{}).items():
print(code, str(r)[:200])
if not s: print(name,'NOT FOUND'); return
def walk(node, depth=1):
if 'allOf' in node:
for sub in node['allOf']: walk(sub, depth)
return
req = node.get('required', [])
props = node.get('properties', {})
if req: print('  '*depth+'required='+str(req))
ref = v.get('\$ref')
if not ref and v.get('type')=='array':
ref = v.get('items',{}).get('\$ref')
print('  '*depth + f'{k}: ' + (ref if ref else v.get('type','?')))
print(f'== {name} ==')
walk(s)
for n in ['capture','purchase_unit','payment_collection','order_capture_request']:
op = paths['/v2/checkout/orders/{id}/track']['post']
print('description', op.get('description'))
print('params', [(p.get('name'), p.get('in'), p.get('required')) for p in op.get('parameters',[])])
rb = op['requestBody']
print('schema ref', rb['content']['application/json']['schema'])
enum = v.get('enum')
extra = f' enum={enum}' if enum else ''
print('  '*depth + f'{k}: ' + (ref if ref else v.get('type','?')) + extra)
for n in ['order_tracker_request','tracker_item']:
print(json.dumps(schemas['order_tracker_request'], indent=1))
print(json.dumps(schemas['shipment_tracker'], indent=1))
print(list(data.get('components',{}).get('securitySchemes',{}).keys()))
print(data.get('security'))
```

{% /tab %}
{% tab label="Sonnet 5 · run 3 · tree" %}

```bash
redocly tree --help
redocly tree paypal.json --format=ai --find=order | head -100
redocly tree paypal.json --format=ai --path=/v2/checkout/orders --operation=post --with-deps | head -200
redocly tree paypal.json --format=ai --path=/v2/checkout/orders --operation=post | grep -n "responses\|\"20\|\"id\"\|status\|links" | head -60
redocly tree paypal.json --format=ai --path=/v2/checkout/orders/{id}/capture --operation=post | head -120
redocly tree paypal.json --format=ai --path=/v2/checkout/orders/{id}/capture --operation=post | sed -n '120,260p'
redocly tree paypal.json --format=ai --path=/v2/checkout/orders/{id}/track --operation=post | head -160
redocly tree paypal.json --format=ai --component=schemas --name=order_tracker_request | head -100
redocly tree paypal.json --format=ai --component=schemas --name=shipment_tracker | head -80
redocly tree paypal.json --format=ai --find=token | head -30
redocly tree paypal.json --format=ai --path=/v2/checkout/orders --operation=post | grep -n "checkout_payment_intent\|\"intent\"" | head -10
```

{% /tab %}
{% tab label="Sonnet 5 · run 4 · no tree" %}

```bash
wc -l paypal.json
grep -n "\"\\/v2\\/(checkout\\/orders|payments\\/captures|orders)[^\"]*\"" paypal.json
grep -i -n "tracker" paypal.json
sed -n '32,152p' paypal.json
sed -n '2145,2265p' paypal.json
sed -n '2822,2962p' paypal.json
sed -n '14722,14792p' paypal.json
grep -n "\"/v1/oauth2/token\"|generate-client-token|\"grant_type\"" paypal.json | head -10
sed -n '15828,15873p' paypal.json
grep -n "\"00_orders_capture\"" paypal.json
sed -n '2417,2507p' paypal.json
# write /private/tmp/claude-501/-Users-tora-bench-run-paypal-control-v3-sonnet-r4/e92f2020-83e4-476e-afec-c23dd6f0dc17/scratchpad/paypal_flow.json
```

{% /tab %}
{% tab label="Sonnet 5 · run 4 · tree" %}

```bash
ls && redocly tree --help
redocly tree paypal.json --format=ai --tag | head -100
redocly tree paypal.json --format=ai --tag=orders
redocly tree paypal.json --format=ai --tag=trackers
redocly tree paypal.json --format=ai --path=/v2/checkout/orders --operation=post --with-deps | head -200
redocly tree paypal.json --format=ai --path=/v2/checkout/orders --operation=post --with-deps | sed -n '400,700p'
redocly tree paypal.json --format=ai --path=/v2/checkout/orders/{id}/capture --operation=post --with-deps | sed -n '1,50p'
redocly tree paypal.json --format=ai --path=/v2/checkout/orders/{id}/capture --operation=post --with-deps | grep -n "\"schema\"\|\$ref\|200\":\|201\":\|responses" | head -40
redocly tree paypal.json --format=ai --path=/v2/checkout/orders/{id}/track --operation=post --with-deps | sed -n '1,150p'
redocly tree paypal.json --format=ai --component=schemas --name=order_tracker_request --with-deps | sed -n '1,120p'
redocly tree paypal.json --format=ai --component=schemas --name=shipment_tracker --with-deps | sed -n '1,60p'
redocly tree paypal.json --format=ai --component=schemas --name=checkout_payment_intent
redocly tree paypal.json --format=ai --component=schemas --name=purchase_unit --with-deps | grep -n "payments\|captures" | head -20
```

{% /tab %}
{% tab label="Sonnet 5 · run 5 · no tree" %}

```bash
cat paypal.json
grep -n "\"/v2/checkout/orders|/v1/shipping/trackers|\"paths\"" paypal.json
sed -n '32,232p' paypal.json
sed -n '2145,2395p' paypal.json
sed -n '2822,3042p' paypal.json
sed -n '420,540p' paypal.json
mkdir -p /private/tmp/claude-501/-Users-tora-bench-run-paypal-control-v3-sonnet-r5/09d738a7-6fae-4a8e-afc7-6bc8716ed710/scratchpad
```

{% /tab %}
{% tab label="Sonnet 5 · run 5 · tree" %}

```bash
redocly tree --help
redocly tree paypal.json --format=ai --find="order" | head -100
redocly tree paypal.json --format=ai --path=/v2/checkout/orders --operation=post --with-deps | head -200
redocly tree paypal.json --format=ai --path=/v2/checkout/orders --operation=post | tail -150
redocly tree paypal.json --format=ai --pointer="#/paths/~1v2~1checkout~1orders/post/responses/201/content/application~1json/examples/orders_create_simple" | head -80
redocly tree paypal.json --format=ai --path=/v2/checkout/orders/{id}/capture --operation=post | head -150
redocly tree paypal.json --format=ai --pointer="#/paths/~1v2~1checkout~1orders~1{id}~1capture/post/responses/201/content/application~1json/examples/00_orders_capture" | head -150
redocly tree paypal.json --format=ai --path=/v2/checkout/orders/{id}/track --operation=post | sed -n '1,140p'
redocly tree paypal.json --format=ai --component=schemas --name=order_tracker_request | head -80
redocly tree paypal.json --format=ai --component=schemas --name=shipment_tracker | head -60
redocly tree paypal.json --format=ai --find="oauth token" | head -40
redocly tree paypal.json --format=ai --find="token" | head -30
redocly tree paypal.json --format=ai --component=securitySchemes | head -60
redocly tree paypal.json --format=ai --component=securitySchemes --name=Oauth2 --with-deps | head -30
```

{% /tab %}
{% /tabs %}

{% /tab %}
{% tab label="Opus 5" %}

{% tabs %}
{% tab label="Opus 5 · run 1 · no tree" %}

```bash
ls -la paypal.json && wc -c paypal.json
python3 -c "
import json
d=json.load(open('paypal.json'))
print(d.get('openapi'), d.get('swagger'))
print(json.dumps(d.get('info'),indent=1)[:800])
print('servers',d.get('servers'))
for p,ops in d['paths'].items():
print(p, [m for m in ops if m in ('get','post','patch','put','delete')])
"
print(json.dumps(d.get('components',{}).get('securitySchemes'),indent=1))
print('GLOBAL SEC',d.get('security'))
p=d['paths']['/v2/checkout/orders']['post']
print(json.dumps({k:v for k,v in p.items() if k!='responses'},indent=1)[:4000])
S=d['components']['schemas']
print('REQBODY REF', json.dumps(p['requestBody'])[:300])
r=S['order_request']
print('required',r.get('required'))
for k,v in r['properties'].items():
print(' -',k, v.get('\$ref') or v.get('type'), str(v.get('description'))[:100])
print('INTENT',S['checkout_payment_intent'])
pu=S['purchase_unit_request']
print('PU required',pu.get('required'))
for k,v in pu['properties'].items(): print('  pu.',k,v.get('\$ref') or v.get('type'))
am=S['amount_with_breakdown']
print('AMT req',am.get('required'), list(am['properties']))
ship=S.get('shipping_detail') or S.get('shipping_with_tracking_details')
print([k for k in S if 'shipping' in k][:20])
" | head -60
pu=S['purchase_unit_request']['properties']
print('AMOUNT', json.dumps(pu['amount'])[:400])
print('SHIPPING', json.dumps(pu['shipping'])[:300])
print('ITEMS', json.dumps(pu['items'])[:300])
print()
for n in ['amount_with_breakdown','money','item','shipping_detail']:
if n in S:
print(n,'req',S[n].get('required'),'props',list(S[n].get('properties',{})))
print(json.dumps(S['amount_with_breakdown'],indent=1)[:1500])
print('ITEM_REQ req',S['item_request'].get('required'),list(S['item_request'].get('properties',{})))
print('payment_source props',list(S['payment_source'].get('properties',{})))
pp=S['payment_source']['properties']['paypal']
print(json.dumps(pp)[:300])
n=[k for k in S if 'paypal_wallet' in k]
print(n)
w=S['paypal_wallet']
print('paypal_wallet req',w.get('required'),list(w.get('properties',{})))
ec=S['paypal_wallet_experience_context']
print('EC req',ec.get('required'))
for k,v in ec.get('properties',{}).items(): print('  ',k, v.get('type') or v.get('\$ref'), str(v.get('description'))[:80])
ec=S['paypal_wallet_experience_context']['properties']
for k in ['shipping_preference','user_action','return_url','cancel_url']:
print(k, json.dumps(ec[k])[:400])
print('order resp', list(S['order'].get('properties',{})) if 'order' in S else 'none')
print('link', S['link_description'].get('required'), list(S['link_description']['properties']))
print('order.status', json.dumps(S['order']['properties'].get('status'))[:600])
print(json.dumps(S['order'])[:800])
# capture op
cap=d['paths']['/v2/checkout/orders/{id}/capture']['post']
print('CAP params',[ (p.get('name') or p.get('\$ref')) for p in cap.get('parameters',[])])
print('CAP body',json.dumps(cap.get('requestBody'))[:200])
print('CAP resp',list(cap['responses'].keys()))
print('CAP 201 schema',json.dumps(cap['responses'].get('201',{}).get('content',{}).get('application/json',{}).get('schema'))[:200])
t=d['paths']['/v2/checkout/orders/{id}/track']['post']
print('TRACK params',[(p.get('name') or p.get('\$ref')) for p in t.get('parameters',[])])
print('TRACK body',json.dumps(t['requestBody'])[:200])
print('TRACK resp',list(t['responses']))
for c in ['200','201','202']:
if c in t['responses']: print(c, json.dumps(t['responses'][c].get('content',{}).get('application/json',{}).get('schema'))[:150])
n=[k for k in S if 'track' in k.lower()]
otr=S['order_tracker_request']
print(json.dumps(otr,indent=1)[:3000])
st=S['shipment_tracker']
print(json.dumps(st,indent=1)[:2500])
ex=p['requestBody']['content']['application/json']['examples']
print(list(ex)[:20])
print(json.dumps(ex['00_orders_create']['value'],indent=1)[:2000])
r=p['responses']
print('resp codes',list(r))
rex=r['200']['content']['application/json'].get('examples',{}) if '200' in r else {}
print('200 ex',list(rex)[:10])
print(json.dumps(p['responses']['200']['content']['application/json']['examples']['00_orders_create']['value'],indent=1)[:1500])
print('---200 ex 201:')
print(list(p['responses']['201']['content']['application/json'].get('examples',{})))
for code in ['200','201']:
exs=cap['responses'][code]['content']['application/json'].get('examples',{})
print(code,list(exs))
if exs:
k=list(exs)[0]
print(json.dumps(exs[k]['value'],indent=1)[:2500])
break
exs=t['requestBody']['content']['application/json']['examples']
print(list(exs))
for k in exs: print(k, json.dumps(exs[k]['value'],indent=1)[:800])
e=t['responses'][code]['content']['application/json'].get('examples',{})
print(code, list(e))
if e:
kk=list(e)[0]; print(json.dumps(e[kk]['value'],indent=1)[:1500])
c=S['shipment_carrier']
e=c.get('enum',[])
print('carrier enum count',len(e))
print([x for x in e if x in ('UPS','FEDEX','USPS','DHL','OTHER','FEDEX_UK','UPS_MI','DHL_GLOBAL_MAIL')])
print(json.dumps(d['components']['parameters'].get('authorization'),indent=1)[:600])
g=d['paths']['/v2/checkout/orders/{id}']['get']
print('GET params',[(p.get('name') or p.get('\$ref')) for p in g.get('parameters',[])])
print('order status enum', json.dumps([x for x in json.dumps(S['order']) .split() if False]))
o=S['order']['allOf'][1]['properties']
print(list(o))
print(json.dumps(o['status'])[:900])
print('order_capture_request', json.dumps(S['order_capture_request'])[:600])
print(json.dumps(S['order_status']))
tp=d['paths']['/v2/checkout/orders/{id}/trackers/{tracker_id}']['patch']
print('PATCH params',[(p.get('name') or p.get('\$ref')) for p in tp.get('parameters',[])])
print('body',json.dumps(tp['requestBody'])[:300])
print('resp',list(tp['responses']))
```

{% /tab %}
{% tab label="Opus 5 · run 1 · tree" %}

```bash
ls && redocly tree --help
redocly tree paypal.json --format=ai | head -100
redocly tree paypal.json --format=ai --operation=orders.create | head -80; echo ==========; redocly tree paypal.json --format=ai --operation=orders.capture | head -60
redocly tree paypal.json --format=ai --operation=orders.capture > /private/tmp/claude-501/-Users-tora-bench-run-paypal-tree-help-local-opus-r1/0f6cc94d-6d72-4752-a01e-21612cb51a5a/scratchpad/capture.txt; wc -l /private/tmp/claude-501/-Users-tora-bench-run-paypal-tree-help-local-opus-r1/0f6cc94d-6d72-4752-a01e-21612cb51a5a/scratchpad/capture.txt
cd /private/tmp/claude-501/-Users-tora-bench-run-paypal-tree-help-local-opus-r1/0f6cc94d-6d72-4752-a01e-21612cb51a5a/scratchpad; grep -n '"name"\|required\|\$ref\|"in"\|responses\|"20\|"4' capture.txt | head -60
redocly tree paypal.json --format=ai --operation=orders.track.create > /private/tmp/claude-501/-Users-tora-bench-run-paypal-tree-help-local-opus-r1/0f6cc94d-6d72-4752-a01e-21612cb51a5a/scratchpad/track.txt; sed -n '1,140p' /private/tmp/claude-501/-Users-tora-bench-run-paypal-tree-help-local-opus-r1/0f6cc94d-6d72-4752-a01e-21612cb51a5a/scratchpad/track.txt
cd /Users/tora/bench-run/paypal-tree-help-local-opus-r1; redocly tree paypal.json --format=ai --component=schemas --name=order_tracker_request --with-deps | head -120
cd /Users/tora/bench-run/paypal-tree-help-local-opus-r1; redocly tree paypal.json --format=ai --component=schemas --name=shipment_tracker | head -60; echo "=====ORDERREQ"; redocly tree paypal.json --format=ai --component=schemas --name=order_request | head -80
cd /Users/tora/bench-run/paypal-tree-help-local-opus-r1; for n in purchase_unit_request checkout_payment_intent; do redocly tree paypal.json --format=ai --component=schemas --name=$n | head -90; echo "==========="; done
cd /Users/tora/bench-run/paypal-tree-help-local-opus-r1; redocly tree paypal.json --format=ai --find="experience_context" | head -40; echo ====; redocly tree paypal.json --format=ai --component=schemas --name=amount_with_breakdown | head -30
cd /Users/tora/bench-run/paypal-tree-help-local-opus-r1; redocly tree paypal.json --format=ai --component=schemas --name=paypal_wallet_experience_context | head -50; redocly tree paypal.json --format=ai --component=schemas --name=experience_context_base | head -70
cd /Users/tora/bench-run/paypal-tree-help-local-opus-r1; redocly tree paypal.json --format=ai --component=securitySchemes | head -40; redocly tree paypal.json --format=ai --component=parameters|head -40
cd /Users/tora/bench-run/paypal-tree-help-local-opus-r1; redocly tree paypal.json --format=ai --component=securitySchemes --name=Oauth2|head -30; redocly tree paypal.json --format=ai --component=parameters --name=authorization|head -25
cd /Users/tora/bench-run/paypal-tree-help-local-opus-r1; redocly tree paypal.json --format=ai --component=schemas --name=order|head -80
cd /Users/tora/bench-run/paypal-tree-help-local-opus-r1; redocly tree paypal.json --format=ai --component=schemas --name=order_status|head -30; redocly tree paypal.json --format=ai --component=schemas --name=capture_status|head -30
cd /Users/tora/bench-run/paypal-tree-help-local-opus-r1; redocly tree paypal.json --format=ai --operation=orders.create > /private/tmp/claude-501/-Users-tora-bench-run-paypal-tree-help-local-opus-r1/0f6cc94d-6d72-4752-a01e-21612cb51a5a/scratchpad/create.txt; grep -n '"rel"\|"href"\|"status"' /private/tmp/claude-501/-Users-tora-bench-run-paypal-tree-help-local-opus-r1/0f6cc94d-6d72-4752-a01e-21612cb51a5a/scratchpad/create.txt | head -40
cd /private/tmp/claude-501/-Users-tora-bench-run-paypal-tree-help-local-opus-r1/0f6cc94d-6d72-4752-a01e-21612cb51a5a/scratchpad; sed -n '380,470p' capture.txt
cd /Users/tora/bench-run/paypal-tree-help-local-opus-r1; redocly tree paypal.json --format=ai --operation=orders.trackers.patch > /private/tmp/claude-501/-Users-tora-bench-run-paypal-tree-help-local-opus-r1/0f6cc94d-6d72-4752-a01e-21612cb51a5a/scratchpad/tpatch.txt; sed -n '1,120p' /private/tmp/claude-501/-Users-tora-bench-run-paypal-tree-help-local-opus-r1/0f6cc94d-6d72-4752-a01e-21612cb51a5a/scratchpad/tpatch.txt
cd /private/tmp/claude-501/-Users-tora-bench-run-paypal-tree-help-local-opus-r1/0f6cc94d-6d72-4752-a01e-21612cb51a5a/scratchpad; grep -n 'trackers\|"id"\|tracking_number\|"status"\|carrier' track.txt | head -40
cd /private/tmp/claude-501/-Users-tora-bench-run-paypal-tree-help-local-opus-r1/0f6cc94d-6d72-4752-a01e-21612cb51a5a/scratchpad; grep -n '^                    "[0-9]' track.txt; cd /Users/tora/bench-run/paypal-tree-help-local-opus-r1; redocly tree paypal.json --format=ai --component=schemas --name=shipment_carrier | sed -n '1,20p'; redocly tree paypal.json --format=ai --component=schemas --name=order_capture_request|head -25
cd /Users/tora/bench-run/paypal-tree-help-local-opus-r1; redocly tree paypal.json --format=ai --component=schemas --name=shipment_carrier | grep -oE '"(FEDEX|UPS|USPS|DHL|OTHER|FEDEX_UK|UPS_MI)"' | sort -u; echo ---; redocly tree paypal.json --format=ai --component=schemas --name=tracker_item|head -30
cd /Users/tora/bench-run/paypal-tree-help-local-opus-r1; redocly tree paypal.json --format=ai --component=schemas --name=item_request|grep -A8 '"required"'|head -20; echo ---; redocly tree paypal.json --format=ai --component=schemas --name=amount_with_breakdown|head -25
cd /Users/tora/bench-run/paypal-tree-help-local-opus-r1; redocly tree paypal.json --format=ai --component=schemas --name=money|head -14; redocly tree paypal.json --format=ai --operation=orders.get | grep -n '"name"\|"in"\|required' | head -20
```

{% /tab %}
{% tab label="Opus 5 · run 2 · no tree" %}

```bash
ls -la paypal.json && wc -c paypal.json
python3 -c "
import json
d=json.load(open('paypal.json'))
print(d.get('info',{}).get('title'), d.get('info',{}).get('version'))
print(list(d.keys()))
for p,v in d['paths'].items():
print(p, [m for m in v if m in ('get','post','put','patch','delete')])
"
print(json.dumps(d['servers'],indent=1))
print(json.dumps(d.get('components',{}).get('securitySchemes'),indent=1)[:2000])
p=d['paths']['/v2/checkout/orders']['post']
print('--- create order params')
for pr in p.get('parameters',[]): print(pr.get('name'),pr.get('in'),pr.get('required'),pr.get('schema',{}).get('type'), str(pr.get('description'))[:150])
print('--- body ref', json.dumps(p['requestBody'],indent=1)[:800])
print('--- responses', list(p['responses'].keys()))
for c,r in p['responses'].items():
print(c, json.dumps(r.get('content',{}).get('application/json',{}).get('schema',{}))[:200])
s=d['components']['schemas']
def show(n,depth=0,maxlen=1500):
sc=s[n]
print('==',n,'required:',sc.get('required'))
print(json.dumps({k:(v if not isinstance(v,dict) else {kk:(vv if not isinstance(vv,dict) else list(vv.items())[:0] or vv.get('\$ref') or vv.get('type')) for kk,vv in v.items()}) for k,v in sc.get('properties',{}).items()},indent=1)[:maxlen])
for n in ['order_request','purchase_unit_request','amount_with_breakdown','order']:
show(n)
print(json.dumps(s['amount_with_breakdown'])[:900]); print()
print(json.dumps(s['order'])[:2500]); print()
print('amount_ref:',json.dumps(s.get('amount'))[:600])
for path in ['/v2/checkout/orders/{id}/capture','/v2/checkout/orders/{id}/track','/v2/checkout/orders/{id}/trackers/{tracker_id}','/v2/checkout/orders/{id}']:
for m,op in d['paths'][path].items():
if m not in ('get','post','patch'): continue
print('#####',m.upper(),path)
for pr in op.get('parameters',[]):
print('  param:',pr.get('name'),pr.get('in'),'req=',pr.get('required'))
rb=op.get('requestBody')
if rb: print('  body req=',rb.get('required'),'schema=',json.dumps(rb['content']['application/json']['schema'])[:300])
print('  responses:',{c:json.dumps(r.get('content',{}).get('application/json',{}).get('schema',{}))[:120] for c,r in op['responses'].items()})
for n in ['order_tracker_request','order_capture_request','link_description','order_status','capture','purchase_unit','payment_collection','tracker','shipping_with_tracking_details']:
if n in s: print('==',n, json.dumps(s[n])[:1600],'\n')
else: print('== MISSING',n)
print('== shipment_tracker', json.dumps(s['shipment_tracker'])[:2500])
print()
print('== money', json.dumps(s['money'])[:900])
print('== intent', json.dumps(s['checkout_payment_intent'])[:400])
print('== tracker_status', json.dumps(s.get('tracker_status'))[:300])
print('== carrier sample', json.dumps(s.get('shipment_carrier',{}))[:300])
op=d['paths']['/v2/checkout/orders/{id}/track']['post']
print(json.dumps(op.get('requestBody',{}).get('content',{}).get('application/json',{}).get('examples',{}))[:1500])
print('--- resp examples')
print(json.dumps(op['responses']['200'].get('content',{}).get('application/json',{}).get('examples',{}))[:2500])
print(json.dumps(op['responses']['201'].get('content',{}).get('application/json',{}).get('examples',{}))[:2500])
print('--- prefer desc')
cap=d['paths']['/v2/checkout/orders/{id}/capture']['post']
for pr in cap.get('parameters',[]):
if pr.get('name')=='Prefer': print(pr['description'][:600])
import json,re
op=d['paths']['/v2/checkout/orders']['post']
for code in ['200','201']:
ex=op['responses'][code].get('content',{}).get('application/json',{}).get('examples',{})
for k,v in ex.items():
val=v.get('value',{})
print(code,k,'status=',val.get('status'),'links=',[(l.get('rel'),l.get('method')) for l in val.get('links',[])])
op=d['paths']['/v2/checkout/orders/{id}/trackers/{tracker_id}']['patch']
print(op.get('description','')[:800])
print(json.dumps(op['requestBody']['content']['application/json'].get('examples',{}))[:800])
```

{% /tab %}
{% tab label="Opus 5 · run 2 · tree" %}

```bash
ls -la && redocly tree --help
redocly tree paypal.json --format=ai --tag | head -60
redocly tree paypal.json --format=ai --operations | head -40
redocly tree paypal.json --format=ai --operation orders.create | head -80
redocly tree paypal.json --format=ai --operation orders.create | sed -n '80,200p'
redocly tree paypal.json --format=ai --component schemas --name order_request | head -60; echo "=== TRACK ==="; redocly tree paypal.json --format=ai --operation orders.track.create | head -120
redocly tree paypal.json --format=ai --component schemas --name order_tracker_request | head -70; echo "=== AUTHZ PARAM ==="; redocly tree paypal.json --format=ai --component parameters --name authorization | head -30; echo "=== SECURITY SCHEME ==="; redocly tree paypal.json --format=ai --component securitySchemes | head -40
redocly tree paypal.json --format=ai --component securitySchemes --name Oauth2 --with-deps | head -40; echo "=== shipment_tracker ==="; redocly tree paypal.json --format=ai --component schemas --name shipment_tracker | head -40
redocly tree paypal.json --format=ai --operation orders.capture | grep -n '"responses"\|"20[01]"\|\$ref\|"description"\|"Prefer"\|"name":' | head -50
redocly tree paypal.json --format=ai --operation orders.capture | sed -n '120,130p'; echo "=== capture req schema ==="; redocly tree paypal.json --format=ai --component schemas --name order_capture_request | head -30; echo "=== 201 example ==="; redocly tree paypal.json --format=ai --operation orders.capture | sed -n '276,370p'
redocly tree paypal.json --format=ai --component schemas --name checkout_payment_intent | head -20; echo "=== servers ==="; python3 -c "
import json;d=json.load(open('paypal.json'));print(json.dumps(d.get('servers'),indent=1));print(d['info']['version'], d['info']['title'])"
redocly tree paypal.json --format=ai --operation orders.create | grep -n '"rel"\|"status"\|"responses"\|"20[0-9]"' | head -30; echo "=== track resp ==="; redocly tree paypal.json --format=ai --operation orders.track.create | sed -n '120,220p'
redocly tree paypal.json --format=ai --component schemas --name purchase_unit_request | grep -n '"required"' -A6 | head -20; echo "=== carrier ==="; python3 -c "
import json;d=json.load(open('paypal.json'));s=d['components']['schemas']['shipment_carrier'];print(s.get('type'),s.get('description','')[:200]);e=s.get('enum',[]);print(len(e), e[:12])"; echo "=== create 200 ex ==="; redocly tree paypal.json --format=ai --operation orders.create | sed -n '261,295p'
redocly tree paypal.json --format=ai --operation orders.trackers.patch | grep -n '"value"\|"op"\|"path"\|"tracker_id"\|"description"' | head -25
```

{% /tab %}
{% tab label="Opus 5 · run 3 · no tree" %}

```bash
ls -la paypal.json && wc -c paypal.json
python3 -c "
import json
s=json.load(open('paypal.json'))
print(s.get('openapi'), s.get('info',{}).get('title'), s.get('info',{}).get('version'))
print('servers', s.get('servers'))
for p,ops in s['paths'].items():
print(p, [m for m in ops if m in ('get','post','put','patch','delete')])
"
print(json.dumps(s.get('components',{}).get('securitySchemes'),indent=1))
print('top security', s.get('security'))
for p in ['/v2/checkout/orders','/v2/checkout/orders/{id}/capture','/v2/checkout/orders/{id}/track']:
for m,op in s['paths'][p].items():
if m not in ('get','post','patch'): continue
print('===',m.upper(),p, op.get('operationId'))
print(' security', op.get('security'))
print(' params', [(pr.get('name'),pr.get('in'),pr.get('required'),pr.get('schema',{}).get('type'), (pr.get('description') or '')[:120]) for pr in op.get('parameters',[])])
rb=op.get('requestBody')
if rb: print(' body req', rb.get('required'), list(rb.get('content',{}).keys()), rb['content'].get('application/json',{}).get('schema'))
print(' responses', list(op.get('responses',{}).keys()))
C=s['components']['schemas']
def show(n,d=0,seen=None):
sc=C[n]
print(json.dumps({k:v for k,v in sc.items() if k!='properties'},indent=1)[:800])
for k,v in (sc.get('properties') or {}).items():
print('  -',k, v.get('type') or v.get('\$ref'), '|', (v.get('description') or '')[:100].replace(chr(10),' '))
for n in ['order_request','purchase_unit_request','amount_with_breakdown','order_application_context','payment_source','order_tracker_request']:
print('=====',n); show(n)
print('== shipment_tracker'); print(json.dumps(C['shipment_tracker'],indent=1)[:2500])
print('== checkout_payment_intent'); print(json.dumps(C['checkout_payment_intent'],indent=1)[:600])
print('== order_tracker_response keys'); print(json.dumps(C.get('order_tracker_response'),indent=1)[:1200])
P=s['paths']
for p,m in [('/v2/checkout/orders','post'),('/v2/checkout/orders/{id}/capture','post'),('/v2/checkout/orders/{id}/track','post')]:
op=P[p][m]
for code,r in op['responses'].items():
if code[0] in '23':
sc=(r.get('content') or {}).get('application/json',{}).get('schema')
print(p,code,r.get('description','')[:80],'->',sc)
def props(n):
sc=C[n]; print('==',n, sc.get('required'))
for part in ([sc]+sc.get('allOf',[])):
for k,v in (part.get('properties') or {}).items():
print('  -',k,v.get('type') or v.get('\$ref'),'|',(v.get('description') or '')[:90].replace(chr(10),' '))
for n in ['order','purchase_unit','payment_collection','capture','link_description','order_status']:
try: props(n)
except KeyError as e: print('missing',n)
print(json.dumps(C.get('order_status'),indent=1)[:800])
print(json.dumps(C['capture'],indent=1)[:1500])
print('--- shipping_with_tracking_details / trackers')
for n in C:
if 'track' in n.lower(): print('SCHEMA:',n)
print(json.dumps(C['shipping_with_tracking_details'],indent=1)[:1200])
print('== tracker'); print(json.dumps(C['tracker'],indent=1)[:1500])
print('== capture_status'); print(json.dumps(C['capture_status'],indent=1)[:900])
print('== carrier sample'); e=C['shipment_carrier'].get('enum',[]); print(len(e), e[:15], [x for x in e if 'FEDEX' in x or 'UPS' in x][:10])
print(json.dumps(C['payment_source']['properties']['paypal'],indent=1)[:600])
if 'experience_context' in n: print('SCHEMA',n)
for n in ['paypal_wallet_experience_context','experience_context_base']:
print('==',n, json.dumps({k:v for k,v in C[n].items() if k!='properties'})[:300])
for part in [C[n]]+C[n].get('allOf',[]):
for k,v in (part.get('properties') or {}).items(): print('  -',k, v.get('type') or v.get('\$ref'), (v.get('enum') or ''), (v.get('description') or '')[:70].replace(chr(10),' '))
print('== shipping_detail')
sd=C['shipping_detail']
for part in [sd]+sd.get('allOf',[]):
for k,v in (part.get('properties') or {}).items(): print('  -',k, v.get('type') or v.get('\$ref'))
op=s['paths']['/v2/checkout/orders/{id}/trackers/{tracker_id}']['patch']
print(op.get('operationId'),[ (p.get('name'),p.get('in'),p.get('required')) for p in op.get('parameters',[])])
print(json.dumps(op['requestBody'],indent=1)[:400], list(op['responses']))
print(json.dumps(s['components']['schemas']['patch'],indent=1)[:700])
g=s['paths']['/v2/checkout/orders/{id}']['get']; print('GET',g.get('operationId'),[(p.get('name'),p.get('in'),p.get('required')) for p in g.get('parameters',[])])
```

{% /tab %}
{% tab label="Opus 5 · run 3 · tree" %}

```bash
ls -la && redocly tree --help
redocly tree paypal.json --format=ai | head -60
redocly tree paypal.json --format=ai --operation=orders.create | head -80
redocly tree paypal.json --format=ai --operation=orders.create | sed -n '80,220p'
redocly tree paypal.json --format=ai --component=schemas --name=order_request --with-deps | head -100; echo "=====PARAMS"; redocly tree paypal.json --format=ai --component=parameters | head -20
redocly tree paypal.json --format=ai --component=schemas --name=checkout_payment_intent | head -20
redocly tree paypal.json --format=ai --path=/v2/checkout/orders/{id}/capture --operation=post | grep -v '"summary"\|"description"\|"value"' | head -70
redocly tree paypal.json --format=ai --path=/v2/checkout/orders/{id}/capture --operation=post | sed -n '70,200p' | grep -v '"description"\|"image_url"\|"url"' | head -90
redocly tree paypal.json --format=ai --operation=orders.track.create | grep -v '"image_url"' | sed -n '1,120p'
redocly tree paypal.json --format=ai --component=schemas --name=order_tracker_request | head -80
redocly tree paypal.json --format=ai --component=schemas --name=shipment_tracker --with-deps | head -70
redocly tree paypal.json --format=ai --component=schemas --name=shipment_carrier | grep -oE '"(UPS|FEDEX|USPS|DHL|UPS_[A-Z]*)"' | sort -u | head; echo "=== ORDER"; redocly tree paypal.json --format=ai --component=schemas --name=order | head -60
redocly tree paypal.json --format=ai --component=schemas --name=order | sed -n '60,130p'; echo "=== STATUS"; redocly tree paypal.json --format=ai --component=schemas --name=order_status|head -40
redocly tree paypal.json --format=ai --component=schemas --name=purchase_unit | grep -n 'payments\|captures\|payment_collection' | head -20
redocly tree paypal.json --format=ai --component=schemas --name=payment_collection | head -50
redocly tree paypal.json --format=ai --component=schemas --name=capture | grep -n '"id"\|status\|capture_status' | head -20
redocly tree paypal.json --format=ai --component=schemas --name=capture_status | sed -n '1,30p'
redocly tree paypal.json --format=ai --component=securitySchemes --name=Oauth2 | head -30
redocly tree paypal.json --format=ai --operation=orders.create | grep -n '"responses"'
redocly tree paypal.json --format=ai --operation=orders.create | awk '/"responses"/,0' | grep -E '"(200|201|400|401|403|404|422|500)"|\$ref|"rel"|"href"|"status"|schema' | head -40
redocly tree paypal.json --format=ai --operation=orders.track.create | awk '/"responses"/,0' | grep -E '"(200|201|400|403|422)"|\$ref|"rel"|"href"|"id"|tracker' | head -30
redocly tree paypal.json --format=ai --operation=orders.trackers.patch | grep -E '"name"|"in"|required|\$ref|"op"|"path"|"value"|"(200|204|400)"' | head -40
redocly tree paypal.json --format=ai --component=parameters --name=authorization | head -25
redocly tree paypal.json --format=ai --component=schemas --name=purchase_unit_request | grep -E 'required|"(amount|items|shipping|reference_id|invoice_id|custom_id)"' -A2 | head -40
for n in item amount_with_breakdown tracker_item money; do echo "=== $n"; redocly tree paypal.json --format=ai --component=schemas --name=$n | grep -E '"required"' -A6 | head -14; done
redocly tree paypal.json --format=ai --component=schemas --name=amount_with_breakdown | head -40
redocly tree paypal.json --format=ai --component=schemas --name=purchase_unit_request --with-deps | grep -A3 '"shipping"' | head -20
redocly tree paypal.json --format=ai --path='/v2/checkout/orders/{id}/capture' --operation=post | awk '/"responses"/,0' | grep -E '"(status|id)":|payments|captures|purchase_units|"201"|"200"' | head -25
```

{% /tab %}
{% tab label="Opus 5 · run 4 · no tree" %}

```bash
ls -la paypal.json && python3 -c "
import json
d=json.load(open('paypal.json'))
print(d.get('openapi'), d.get('info',{}).get('title'), d.get('info',{}).get('version'))
print([s.get('url') for s in d.get('servers',[])])
for p,ops in d['paths'].items():
print(p, [m.upper() for m in ops if m in ('get','post','put','patch','delete')])
"
python3 - <<'EOF'
print("SECURITY:", json.dumps(d.get('security'), indent=1))
print("SCHEMES:", json.dumps(d.get('components',{}).get('securitySchemes'), indent=1)[:2000])
for p in ['/v2/checkout/orders','/v2/checkout/orders/{id}/capture','/v2/checkout/orders/{id}/track']:
for m,op in d['paths'][p].items():
if m not in ('get','post','patch'): continue
print("="*70)
print(m.upper(), p, "| opId:", op.get('operationId'))
print("params:", [(pa.get('name'),pa.get('in'),pa.get('required'),pa.get('schema',{}).get('$ref') or pa.get('schema',{}).get('type')) for pa in op.get('parameters',[])])
rb=op.get('requestBody',{})
print("body required:", rb.get('required'), "content:", list(rb.get('content',{}).keys()))
for ct,c in rb.get('content',{}).items():
print("  schema:", json.dumps(c.get('schema'))[:300])
print("responses:", {k:(v.get('content',{}).get('application/json',{}).get('schema',{}).get('$ref') or list(v.get('content',{}).keys()) if v.get('content') else v.get('description')[:40]) for k,v in op.get('responses',{}).items()})
EOF
S=d['components']['schemas']
def resolve(r): return S[r.split('/')[-1]]
for p in ['/v2/checkout/orders','/v2/checkout/orders/{id}','/v2/checkout/orders/{id}/capture','/v2/checkout/orders/{id}/track','/v2/checkout/orders/{id}/trackers/{tracker_id}']:
print("="*70); print(m.upper(), p, "| opId:", op.get('operationId'))
for pa in op.get('parameters',[]):
if '$ref' in pa:
pa=d['components']['parameters'][pa['$ref'].split('/')[-1]] if 'parameters' in d['components'] else pa
print("  param:", pa.get('name'), pa.get('in'), 'required' if pa.get('required') else 'optional', json.dumps(pa.get('schema'))[:120])
if rb: print("  body required:", rb.get('required'), json.dumps(list(rb.get('content',{}).values())[0].get('schema'))[:200])
for k,v in op.get('responses',{}).items():
v = d['components']['responses'][v['$ref'].split('/')[-1]] if '$ref' in v else v
ct=v.get('content') or {}
print("  resp",k, (v.get('description') or '')[:50], json.dumps({c:s.get('schema') for c,s in ct.items()})[:200])
print("  security:", op.get('security'))
def show(n, depth=0, maxd=1, seen=None):
s=S.get(n)
if s is None: print("MISSING",n); return
print("### ",n, "req:", s.get('required'), "type:",s.get('type'))
for k,v in (s.get('properties') or {}).items():
t=v.get('$ref','') or v.get('type','')
extra=''
if v.get('type')=='array': extra=' items='+str(v.get('items',{}).get('$ref') or v.get('items',{}).get('type'))
if v.get('enum'): extra=' enum='+str(v['enum'])[:200]
print("   -",k, t.split('/')[-1], extra, ('readOnly' if v.get('readOnly') else ''), (v.get('description') or '')[:90].replace('\n',' '))
for n in ['order_request','purchase_unit_request','amount_with_breakdown','order_tracker_request','order_capture_request','order','purchase_unit','payment_collection','capture','link_description','checkout_payment_intent','payment_source','shipment_carrier','order_tracker_status','item']:
show(n); print()
for n in ['order_tracker_request','order','checkout_payment_intent','order_capture_request','amount_with_breakdown','purchase_unit_request']:
print("="*30,n); print(json.dumps(S[n])[:2600]); print()
for n in ['shipment_tracker','money','order_status','capture','capture_status','tracker_item','order_application_context','shipping_preference']:
print("="*30,n, "(missing)" if s is None else "")
if s: print(json.dumps(s)[:2200]); print()
print([k for k in S if 'experience' in k or 'application_context' in k])
print([k for k in S if 'carrier' in k])
print("shipment_carrier:", json.dumps(S['shipment_carrier'])[:600])
print()
print("paypal_wallet_experience_context:", json.dumps(S['paypal_wallet_experience_context'])[:1800])
ps=S['payment_source']['properties']['paypal']
print("payment_source.paypal:", json.dumps(ps)[:400])
print("paypal_wallet keys:", list(S.get('paypal_wallet',{}).get('properties',{}).keys()) if 'paypal_wallet' in S else [k for k in S if 'paypal_wallet' in k])
print("trackers patch desc:", json.dumps(d['paths']['/v2/checkout/orders/{id}/trackers/{tracker_id}']['patch'].get('description'))[:1200])
print("track desc:", json.dumps(d['paths']['/v2/checkout/orders/{id}/track']['post'].get('description'))[:800])
tp=[p for p in d['paths']['/v2/checkout/orders/{id}/trackers/{tracker_id}']['patch']['parameters'] if p.get('name')=='tracker_id']
print("tracker_id param:", json.dumps(tp))
sw=S['purchase_unit']['properties']['shipping']
print("pu.shipping:", json.dumps(sw)[:300])
for n in S:
if 'shipping_with_tracking' in n or n=='shipping_detail':
print(n, list(S[n].get('properties',{}).keys()), json.dumps(S[n])[:200])
print("tracker schema:", json.dumps(S.get('tracker'))[:1200])
print([k for k in S if 'track' in k.lower()])
import json,re
raw=open('paypal.json').read()
for r in set(re.findall(r'"rel"\s*:\s*"([a-z-]+)"', raw)): print("rel:",r)
print(json.dumps(S['shipping_with_tracking_details'])[:900])
# find examples for create order request/response
op=d['paths']['/v2/checkout/orders']['post']
ex=op['requestBody']['content']['application/json'].get('examples')
print("req examples:", list(ex.keys()) if ex else None)
resp=op['responses']['201']['content']['application/json']
print("resp examples:", list((resp.get('examples') or {}).keys()))
if resp.get('examples'):
k=list(resp['examples'])[0]
print(json.dumps(resp['examples'][k])[:1500])
python3 -c "
import json;S=json.load(open('paypal.json'))['components']['schemas']
p=S['paypal_wallet_experience_context']['properties']
print(list(p.keys()));print(json.dumps(p.get('user_action'))[:400])
print(json.dumps(S['tracker_status'])[:300])
print([e for e in S['shipment_carrier']['enum'] if e in ('UPS','FEDEX','USPS','DHL','OTHER')])
print(json.dumps(S['patch_request'])[:500])
```

{% /tab %}
{% tab label="Opus 5 · run 4 · tree" %}

```bash
ls -la && redocly tree --help
redocly tree paypal.json --format=ai --tag | head -60
redocly tree paypal.json --format=ai --tag orders | head -40; echo "=== TRACKERS ==="; redocly tree paypal.json --format=ai --tag trackers | head -20
redocly tree paypal.json --format=ai --operation orders.create | head -80
redocly tree paypal.json --format=ai --operation orders.create | sed -n '80,220p'
redocly tree paypal.json --format=ai --component schemas --name order_request | head -80
redocly tree paypal.json --format=ai --component schemas --name checkout_payment_intent | head -30; echo "=== CAPTURE ==="; redocly tree paypal.json --format=ai --operation orders.capture | head -60
redocly tree paypal.json --format=ai --operation orders.track.create | head -120
redocly tree paypal.json --format=ai --component schemas --name order_tracker_request | head -70
redocly tree paypal.json --format=ai --component schemas --name shipment_tracker | head -50
redocly tree paypal.json --format=ai --component securitySchemes | head -40; echo "=== SERVERS ==="; python3 -c "
import json
d=json.load(open('paypal.json'))
print(json.dumps(d.get('servers'),indent=1))
print(d['info']['title'], d['info']['version'])
"
redocly tree paypal.json --format=ai --component securitySchemes --name Oauth2 | head -40
redocly tree paypal.json --format=ai --operation orders.capture | grep -n '"responses"' ; redocly tree paypal.json --format=ai --operation orders.capture | sed -n '/"responses"/,/"400"/p' | head -40
redocly tree paypal.json --format=ai --operation orders.capture | sed -n '/"captures": \[/,/\]/p' | head -40
redocly tree paypal.json --format=ai --operation orders.capture | sed -n '/"201"/,/"400"/p' | head -60
redocly tree paypal.json --format=ai --operation orders.create | grep -n '"rel"' | head; echo "---"; redocly tree paypal.json --format=ai --operation orders.create | grep -n -B3 -A6 '"payer-action"' | head -40
redocly tree paypal.json --format=ai --operation orders.create | sed -n '265,295p;440,470p'
redocly tree paypal.json --format=ai --operation orders.track.create | sed -n '/"responses"/,$p' | grep -n -A12 '"trackers"' | head -40
python3 -c "
e=d['components']['schemas']['shipment_carrier']['enum']
print(len(e)); print([x for x in e if x in ('UPS','FEDEX','USPS','DHL','OTHER')])
"; echo "=== authorization param ==="; redocly tree paypal.json --format=ai --component parameters --name authorization | head -25
redocly tree paypal.json --format=ai --operation orders.trackers.patch | sed -n '1,60p' | grep -v '^ *"description"' | head -50
```

{% /tab %}
{% tab label="Opus 5 · run 5 · no tree" %}

```bash
ls -la paypal.json && python3 -c "
import json
d=json.load(open('paypal.json'))
print(d.get('info'))
print(list(d.keys()))
for p,v in d['paths'].items():
print(p, list(v.keys()))
"
python3 -c "
def op(p,m):
o=d['paths'][p][m]
print('===',m.upper(),p)
print('summary:',o.get('summary'))
print('opid:',o.get('operationId'))
print('params:',json.dumps(o.get('parameters',[]),indent=1)[:3000])
rb=o.get('requestBody')
if rb: print('body:',json.dumps(rb,indent=1)[:1500])
print('responses:',list(o.get('responses',{}).keys()))
for p,m in [('/v2/checkout/orders','post'),('/v2/checkout/orders/{id}/capture','post'),('/v2/checkout/orders/{id}/track','post')]:
op(p,m)
c=d['components']['schemas']
print('servers',d['servers'])
print('sec',json.dumps(d.get('security'),indent=1))
print('secschemes',json.dumps(d['components'].get('securitySchemes'),indent=1)[:800])
for n in ['order_request','order_tracker_request','purchase_unit_request','order','order_capture_request']:
s=c[n]
print('---',n,'required:',s.get('required'),'props:',list(s.get('properties',{}).keys()))
print(json.dumps(c['order_tracker_request'])[:2500])
print('=== order')
print(json.dumps(c['order'])[:1200])
print('=== tracker keys?', [k for k in c if 'track' in k])
print(json.dumps(c['shipment_tracker'],indent=1)[:2500])
print('=== tracker resp')
print(json.dumps(c['tracker'],indent=1)[:1500])
carr=c['shipment_carrier']
print('carrier type', carr.get('type'), 'enum sample', (carr.get('enum') or [])[:1], len(carr.get('enum') or []))
for v in ['FEDEX','UPS','USPS','DHL']: print(v, v in (carr.get('enum') or []))
print('--- track patch params')
print(json.dumps(d['paths']['/v2/checkout/orders/{id}/trackers/{tracker_id}']['patch'].get('parameters'),indent=1)[:2000])
r=d['paths']['/v2/checkout/orders']['post']['responses']['200']
print(json.dumps(r,indent=1)[:2500])
for code in ['200','201']:
r=d['paths']['/v2/checkout/orders/{id}/capture']['post']['responses'][code]
ex=r['content']['application/json'].get('examples',{})
for k,v in list(ex.items())[:2]:
print('==',code,k, v.get('summary'))
print(json.dumps(v['value'],indent=1)[:2000])
p=d['components']['parameters']
print(json.dumps({k:p[k] for k in ['authorization'] if k in p},indent=1)[:900])
print(json.dumps(d['components']['schemas']['tracker_item'].get('required')))
print(json.dumps(d['paths']['/v2/checkout/orders/{id}/track']['post']['responses']['201'],indent=1)[:900])
v=d['paths']['/v2/checkout/orders/{id}/track']['post']['responses']['201']['content']['application/json']['examples']['orders_track_create_complete_request']['value']
print(json.dumps(v['purchase_units'][0].get('shipping'),indent=1)[:1200])
print('status', v.get('status'))
```

{% /tab %}
{% tab label="Opus 5 · run 5 · tree" %}

```bash
ls -la && redocly tree --help
redocly tree paypal.json --format=ai | head -60
redocly tree paypal.json --format=ai --operation=orders.create | head -80
redocly tree paypal.json --format=ai --operation=orders.capture | head -60; echo ===; redocly tree paypal.json --format=ai --operation=orders.track.create | head -60
redocly tree paypal.json --format=ai --operation=orders.track.create | head -100
redocly tree paypal.json --format=ai --component=schemas --name=order_tracker_request | head -60
redocly tree paypal.json --format=ai --component=schemas --name=shipment_tracker | head -60; echo "=== SEC ==="; redocly tree paypal.json --format=ai --component=securitySchemes | head -40
redocly tree paypal.json --format=ai --component=schemas --name=order_request | head -80
redocly tree paypal.json --format=ai --component=securitySchemes --name=Oauth2 | head -40; echo "=== PU ==="; redocly tree paypal.json --format=ai --component=schemas --name=purchase_unit_request | head -70
redocly tree paypal.json --format=ai --component=schemas --name=order | head -70
redocly tree paypal.json --format=ai --component=schemas --name=payment_collection | head -40; echo "=== capture schema ==="; redocly tree paypal.json --format=ai --component=schemas --name=capture | head -40; echo "=== intent ==="; redocly tree paypal.json --format=ai --component=schemas --name=checkout_payment_intent | head -20
python3 -c "
import json
d=json.load(open('paypal.json'))
op=d['paths']['/v2/checkout/orders']['post']
print(json.dumps({k:v for k,v in op['responses'].items()},)[:400])
ex=op['responses']['200']['content']['application/json'].get('examples',{})
print(list(ex)[:10])
for k in list(ex)[:2]:
print(k, json.dumps(ex[k]['value'])[:900])
"
print('CREATE responses:', list(op['responses']))
r=op['responses'].get('201',{}).get('content',{}).get('application/json',{})
print('schema', r.get('schema'))
ex=r.get('examples',{})
for k in list(ex)[:3]:
print('--',k, json.dumps(ex[k]['value'])[:700])
print()
cap=d['paths']['/v2/checkout/orders/{id}/capture']['post']
print('CAPTURE responses:', list(cap['responses']))
print('CAPTURE body required:', cap['requestBody'].get('required'), cap['requestBody']['content']['application/json']['schema'])
c=cap['responses']['201']['content']['application/json']
print('cap schema', c.get('schema'))
ce=c.get('examples',{})
print(list(ce)[:6])
for k in list(ce)[:1]:
print(json.dumps(ce[k]['value'])[:1500])
t=d['paths']['/v2/checkout/orders/{id}/track']['post']
print('TRACK responses:', list(t['responses']))
for code in ['200','201']:
if code in t['responses']:
c=t['responses'][code].get('content',{}).get('application/json',{})
print(code, c.get('schema'))
ex=c.get('examples',{})
for k in list(ex)[:1]:
print(json.dumps(ex[k]['value'])[:1200])
print('PARAMS auth:', json.dumps(d['components']['parameters'])[:800])
print('CARRIER:', json.dumps(d['components']['schemas']['shipment_carrier'])[:300])
c=d['components']['schemas']['shipment_carrier']['enum']
print(len(c), [x for x in c if x in ('UPS','FEDEX','USPS','DHL','OTHER','UPS_MI','FEDEX_GROUND')])
g=d['paths']['/v2/checkout/orders/{id}']['get']
print([ (p.get('name') or p.get('\$ref')) for p in g['parameters']])
print('order status enum:', json.dumps(d['components']['schemas']['order']['allOf'][1]['properties'].get('status'))[:400])
print('capture req:', json.dumps(d['components']['schemas']['order_capture_request'])[:400])
import json;d=json.load(open('paypal.json'));print(d['components']['schemas']['order_status']['enum']);print(d['components']['schemas']['capture_status']['properties']['status']['enum'] if 'properties' in d['components']['schemas']['capture_status'] else d['components']['schemas']['capture_status'])" | head -20
```

{% /tab %}
{% /tabs %}

{% /tab %}
{% tab label="Haiku 4.5" %}

{% tabs %}
{% tab label="Haiku 4.5 · run 1 · no tree" %}

```bash
cat paypal.json
grep "^.*\"(path|method|operationId)\".*$" paypal.json | head -100
sed -n '1,401p' paypal.json
sed -n '2147,2447p' paypal.json
sed -n '2824,3074p' paypal.json
```

{% /tab %}
{% tab label="Haiku 4.5 · run 1 · tree" %}

```bash
redocly tree --help
redocly tree paypal.json --format=ai --find=order
redocly tree paypal.json --format=ai --operation=post --path=/v2/checkout/orders --with-deps
redocly tree paypal.json --format=ai --operation=post --path=/v2/checkout/orders/{id}/confirm-payment-source --with-deps
redocly tree paypal.json --format=ai --operation=post --path=/v2/checkout/orders/{id}/capture --with-deps
redocly tree paypal.json --format=ai --operation=post --path=/v2/checkout/orders/{id}/track --with-deps
cat /Users/tora/.claude/projects/-Users-tora-bench-run-paypal-tree-help-local-haiku-r1/81ed3915-20b8-4168-bb8a-ea17dfd281bf/tool-results/b6l3ruodk.txt
cat /Users/tora/.claude/projects/-Users-tora-bench-run-paypal-tree-help-local-haiku-r1/81ed3915-20b8-4168-bb8a-ea17dfd281bf/tool-results/bwhcyvwdp.txt
cat /Users/tora/.claude/projects/-Users-tora-bench-run-paypal-tree-help-local-haiku-r1/81ed3915-20b8-4168-bb8a-ea17dfd281bf/tool-results/b0m59pda9.txt
```

{% /tab %}
{% tab label="Haiku 4.5 · run 2 · no tree" %}

```bash
cat paypal.json
grep "(create.*order|approve|capture|track|payment)" paypal.json | head -100
grep "\"/v2/checkout/orders.*capture|/v2/trackers\"" paypal.json | head -50
sed -n '2145,2445p' paypal.json
grep "\"/v2/trackers\" \\{" paypal.json
grep -n "trackers" paypal.json | head -20
sed -n '2700,3100p' paypal.json
sed -n '400,800p' paypal.json
```

{% /tab %}
{% tab label="Haiku 4.5 · run 2 · tree" %}

```bash
redocly tree --help
redocly tree paypal.json --format=ai --find order
redocly tree paypal.json --format=ai --operation=post --path=/v2/checkout/orders --with-deps
redocly tree paypal.json --format=ai --operation=post --path=/v2/checkout/orders/{id}/capture
cat /Users/tora/.claude/projects/-Users-tora-bench-run-paypal-tree-help-local-haiku-r2/7cb17fa1-c89b-4d8e-a9fb-a9317232b0f5/tool-results/b0jtzsnjc.txt
redocly tree paypal.json --format=ai --operation=post --path=/v2/checkout/orders/{id}/track 2>/dev/null | head -200
redocly tree paypal.json --format=ai --find capture 2>/dev/null | head -100
```

{% /tab %}
{% tab label="Haiku 4.5 · run 3 · no tree" %}

```bash
cat paypal.json
grep "\"(path|operationId|summary)\"" paypal.json
grep "operationId" paypal.json | head -50
sed -n '1,101p' paypal.json
grep "orders.create" paypal.json
sed -n '289,439p' paypal.json
sed -n '2147,2347p' paypal.json
sed -n '2824,3024p' paypal.json
```

{% /tab %}
{% tab label="Haiku 4.5 · run 3 · tree" %}

```bash
ls -la paypal.json
redocly tree --help
redocly tree paypal.json --format=ai --find="order" | head -100
redocly tree paypal.json --format=ai --operation=orders.create
cat /Users/tora/.claude/projects/-Users-tora-bench-run-paypal-tree-help-local-haiku-r3/3afa143a-5f27-443b-9bf6-33eae4517af1/tool-results/bd48jcdc5.txt
redocly tree paypal.json --format=ai --operation=orders.authorize --with-deps | grep -A 30 "requestBody\|responses" | head -60
redocly tree paypal.json --format=ai --operation=orders.capture --with-deps | grep -A 20 "requestBody\|responses" | head -50
redocly tree paypal.json --format=ai --operation=orders.track.create --with-deps | grep -A 30 "requestBody\|responses" | head -70
redocly tree paypal.json --format=ai --component=schemas --name="order_request" | head -80
redocly tree paypal.json --format=ai --component=schemas --name="order_capture_request"
redocly tree paypal.json --format=ai --component=schemas --name="order" | grep -A 100 "properties:" | head -120
redocly tree paypal.json --format=ai --find="capture" | grep -E "schemas|components" | head -20
redocly tree paypal.json --format=ai --component=schemas --name="capture"
redocly tree paypal.json --format=ai --component=schemas --name="purchase_unit" | head -150
redocly tree paypal.json --format=ai --component=schemas --name="payment_collection"
redocly tree paypal.json --format=ai --component=schemas --name="order_tracker_request"
redocly tree paypal.json --format=ai --component=schemas --name="shipment_tracker"
redocly tree paypal.json --format=ai --component=schemas --name="order_authorize_response"
redocly tree paypal.json --format=ai --component=schemas --name="checkout_payment_intent"
```

{% /tab %}
{% tab label="Haiku 4.5 · run 4 · no tree" %}

```bash
cat paypal.json
grep "POST|GET|PATCH|orderId|captureId|tracking|authorize|capture" paypal.json
grep -n '"/{order_id}' paypal.json | head -20
grep -E '"/v2[^"]*":\s*{' paypal.json | head -20
grep -n "authorize\|capture\|track" paypal.json | grep '"operationId"' | head -20
sed -n '1500,1700p' paypal.json
sed -n '2140,2340p' paypal.json
sed -n '2810,3060p' paypal.json
```

{% /tab %}
{% tab label="Haiku 4.5 · run 4 · tree" %}

```bash
redocly tree --help
ls -la paypal.json
redocly tree paypal.json --find payment --format=ai
redocly tree paypal.json --find order --format=ai
redocly tree paypal.json --operation=orders.create --with-deps --format=ai
redocly tree paypal.json --operation=orders.capture --with-deps --format=ai
redocly tree paypal.json --operation=orders.track.create --with-deps --format=ai
cat /Users/tora/.claude/projects/-Users-tora-bench-run-paypal-tree-help-local-haiku-r4/8cc9d755-fe30-476d-bdb6-fed1e73d34c5/tool-results/bj5zjqsg0.txt
cat /Users/tora/.claude/projects/-Users-tora-bench-run-paypal-tree-help-local-haiku-r4/8cc9d755-fe30-476d-bdb6-fed1e73d34c5/tool-results/bs0pcrvmo.txt
cat /Users/tora/.claude/projects/-Users-tora-bench-run-paypal-tree-help-local-haiku-r4/8cc9d755-fe30-476d-bdb6-fed1e73d34c5/tool-results/bcx7xz7dr.txt
```

{% /tab %}
{% tab label="Haiku 4.5 · run 5 · no tree" %}

```bash
cat paypal.json
grep "POST|GET|PATCH|PUT" paypal.json | head -100
grep "\"path\":|\"summary\":|\"operationId\":" paypal.json | head -80
grep "tracker|tracking|shipment" paypal.json | head -80
grep "\"intent\"" paypal.json | head -40
sed -n '8890,8940p' paypal.json
grep "checkout_payment_intent" paypal.json | head -30
sed -n '4175,4205p' paypal.json
grep "\"order_tracker_request\"" paypal.json | head -20
sed -n '14750,14830p' paypal.json
grep "\"shipment_tracker\":" paypal.json | head -10
sed -n '14722,14782p' paypal.json
grep "\"shipment_carrier\":" paypal.json | head -10
sed -n '13302,13342p' paypal.json
grep "USPS|FEDEX|UPS|DHL" paypal.json | head -20
grep "\"purchase_unit\":|\"captures\"" paypal.json | head -60
sed -n '2339,2379p' paypal.json
sed -n '1515,1565p' paypal.json
sed -n '2147,2197p' paypal.json
```

{% /tab %}
{% tab label="Haiku 4.5 · run 5 · tree" %}

```bash
redocly tree --help
redocly tree paypal.json --format=ai --find "order" 2>/dev/null
redocly tree paypal.json --format=ai --operation=post --path=/v2/checkout/orders --with-deps 2>/dev/null
redocly tree paypal.json --format=ai --operation=post --path=/v2/checkout/orders/{id}/capture 2>/dev/null
redocly tree paypal.json --format=ai --operation=post --path=/v2/checkout/orders/{id}/track 2>/dev/null
cat /Users/tora/.claude/projects/-Users-tora-bench-run-paypal-tree-help-local-haiku-r5/6ec3bd3e-9f26-4330-8eb7-3bc742ef8460/tool-results/b67m1or60.txt
cat /Users/tora/.claude/projects/-Users-tora-bench-run-paypal-tree-help-local-haiku-r5/6ec3bd3e-9f26-4330-8eb7-3bc742ef8460/tool-results/bjqjyfo8p.txt
cat /Users/tora/.claude/projects/-Users-tora-bench-run-paypal-tree-help-local-haiku-r5/6ec3bd3e-9f26-4330-8eb7-3bc742ef8460/tool-results/b1uo0lbqy.txt
redocly tree paypal.json --format=ai --component=schemas --name=order_capture_request 2>/dev/null | head -50
redocly tree paypal.json --format=ai --component=schemas --name=order 2>/dev/null | head -80
redocly tree paypal.json --format=ai --find "capture" 2>/dev/null | grep -A 5 "capture_id"
redocly tree paypal.json --format=ai --component=schemas --name=purchase_unit 2>/dev/null | head -120
redocly tree paypal.json --format=ai --component=schemas --name=payment_collection 2>/dev/null | head -80
redocly tree paypal.json --format=ai --component=schemas --name=capture 2>/dev/null | head -80
```

{% /tab %}
{% /tabs %}

{% /tab %}
{% /tabs %}

Sonnet 5 and Opus 5 pass every run on both sides, and both pay more context through the index — +77% for Sonnet 5 — because nine operations barely need finding, while the cards arrive heavy with PayPal's deep schemas.
Haiku 4.5 goes from one working run to three: what it gains from the cards is the tracker call's `capture_id` chain, which its control runs kept missing.

{% /tab %}

{% tab label="DigitalOcean" %}

**Description:** 2.62 MB across 2,909 files.

**Task:** one server in its own private network, an extra storage volume attached, and a firewall that lets in only SSH and HTTPS.
Expected: `POST /v2/vpcs` → `POST /v2/droplets` → `POST /v2/volumes` → the volume attach action → `POST /v2/firewalls`.
Traps: the droplet joins the VPC by `vpc_uuid` in its body, the attach is a separate `/v2/volumes/{volume_id}/actions` call, and the firewall still has to name `droplet_ids`.

{% tabs %}
{% tab label="Prompt: no tree" %}

```text
We're standing up a small web service: one server in its own private network, an extra
storage volume attached to it, and a firewall that lets in only SSH and HTTPS. Nothing
is set up yet. Work out what our deploy script has to call, in order.

API description: digitalocean/DigitalOcean-public.v2.yaml

Give me a working flow as JSON in your reply: the steps in order, what each one calls, what it
needs, and what to carry from its response into the next step. It has to work as written.
```

{% /tab %}
{% tab label="Prompt: tree" %}

```text
We're standing up a small web service: one server in its own private network, an extra
storage volume attached to it, and a firewall that lets in only SSH and HTTPS. Nothing
is set up yet. Work out what our deploy script has to call, in order.

API description: digitalocean/DigitalOcean-public.v2.yaml

The Redocly CLI is installed and its `tree` command can search the description for you.
Start with `redocly tree --help` to see what it can select, then work with `--format=ai`:
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai <flags>

Give me a working flow as JSON in your reply: the steps in order, what each one calls, what it
needs, and what to carry from its response into the next step. It has to work as written.
```

{% /tab %}
{% /tabs %}

Context the run added, and the tool calls it took (medians over the working runs):

| Model           |        no tree |        tree | Difference |
| --------------- | -------------: | ----------: | ---------: |
| Sonnet 5 (n=5)  | 17,177 / 13 ❌ | 20,377 / 16 |          — |
| Opus 5 (n=5)    |    23,324 / 14 | 26,045 / 19 |       +12% |
| Haiku 4.5 (n=5) |    24,968 / 19 | 19,839 / 21 |       −21% |

What those runs were billed:

| Model           |  no tree |  tree | Difference |
| --------------- | -------: | ----: | ---------: |
| Sonnet 5 (n=5)  | $0.41 ❌ | $0.47 |          — |
| Opus 5 (n=5)    |    $0.78 | $0.78 |        −0% |
| Haiku 4.5 (n=5) |    $0.19 | $0.18 |        −5% |

Whether each run produced a flow that would run:

| Run               | no tree        | tree                                                                                      |
| ----------------- | -------------- | ----------------------------------------------------------------------------------------- |
| Sonnet 5 · run 1  | no auth scheme | works                                                                                     |
| Sonnet 5 · run 2  | no auth scheme | works                                                                                     |
| Sonnet 5 · run 3  | no auth scheme | no auth scheme                                                                            |
| Sonnet 5 · run 4  | no auth scheme | works                                                                                     |
| Sonnet 5 · run 5  | no auth scheme | works                                                                                     |
| Opus 5 · run 1    | works          | works                                                                                     |
| Opus 5 · run 2    | works          | works                                                                                     |
| Opus 5 · run 3    | works          | works                                                                                     |
| Opus 5 · run 4    | works          | works                                                                                     |
| Opus 5 · run 5    | works          | works                                                                                     |
| Haiku 4.5 · run 1 | no auth scheme | no vpc call, no droplet call, no volume call, no attach, no firewall call, no auth scheme |
| Haiku 4.5 · run 2 | works          | works                                                                                     |
| Haiku 4.5 · run 3 | no attach      | no auth scheme                                                                            |
| Haiku 4.5 · run 4 | no auth scheme | no auth scheme                                                                            |
| Haiku 4.5 · run 5 | no auth scheme | no auth scheme                                                                            |

A run works when its flow contains `POST /v2/vpcs`, `POST /v2/droplets` with `vpc_uuid`, `POST /v2/volumes`, the attach — either the separate action with `droplet_id`, or a `volumes` array on the droplet create, which the description documents as attaching at creation — and `POST /v2/firewalls` with `inbound_rules` and `droplet_ids`, under `bearer_auth`.

What each run ran:

{% tabs %}
{% tab label="Sonnet 5" %}

{% tabs %}
{% tab label="Sonnet 5 · run 1 · no tree" %}

```bash
grep "^  /v2/(vpcs|droplets|volumes|firewalls)" digitalocean/DigitalOcean-public.v2.yaml
sed -n '2493,2523p' digitalocean/DigitalOcean-public.v2.yaml
SPEC_DIR=digitalocean; ls $SPEC_DIR/resources/vpcs/ $SPEC_DIR/resources/droplets/ $SPEC_DIR/resources/volumes/ $SPEC_DIR/resources/firewalls/ | head -100
cat digitalocean/resources/vpcs/vpcs_create.yml
cat digitalocean/resources/droplets/droplets_create.yml
cat digitalocean/resources/volumes/volumes_create.yml
cat digitalocean/resources/volumes/volumeActions_post.yml
cat digitalocean/resources/firewalls/firewalls_create.yml
SPEC_DIR=digitalocean
cat $SPEC_DIR/resources/vpcs/models/vpc.yml | head -80
cat $SPEC_DIR/resources/droplets/models/droplet_single_create.yml
cat $SPEC_DIR/resources/droplets/models/droplet_create.yml
cat $SPEC_DIR/resources/volumes/models/volumes_ext4.yml
sed -n '1,80p' $SPEC_DIR/resources/firewalls/models/firewall.yml
cat $SPEC_DIR/resources/volumes/models/volume_base.yml | head -20
grep -n "^  id:" -A3 $SPEC_DIR/resources/droplets/models/*.yml 2>/dev/null | head -20
# write /private/tmp/claude-501/-Users-tora-bench-run-digitalocean-control-nfsv3-sonnet-r1/470a6260-baf2-4cfe-8b62-1cdcb54fb197/scratchpad/deploy_flow.json
```

{% /tab %}
{% tab label="Sonnet 5 · run 1 · tree" %}

```bash
redocly tree --help | head -100
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --find="vpc" | head -100
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --find="firewall" | head -100
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --find="droplet create" | head -40
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --find="volume" | head -60
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --path=/v2/vpcs --operation=post --with-deps | head -150
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --path=/v2/droplets --operation=post --with-deps | head -200
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --component=schemas --name="droplet_create" | head -100
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --pointer="digitalocean/resources/droplets/models/droplet_create.yml" | head -100
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --path=/v2/volumes --operation=post --with-deps | head -150
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --pointer="digitalocean/resources/volumes/models/volume_base.yml" | head -60
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --path=/v2/volumes/{volume_id}/actions --operation=post --with-deps | head -150
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --path=/v2/firewalls --operation=post --with-deps | head -150
find . -path "*digitalocean/resources/droplets/models/droplet_create.yml" 2>/dev/null
cat /Users/tora/bench-run/digitalocean-tree-help-nfsfix-sonnet-r1/digitalocean/resources/droplets/models/droplet_create.yml
cat /Users/tora/bench-run/digitalocean-tree-help-nfsfix-sonnet-r1/digitalocean/resources/firewalls/models/firewall_rule.yml
```

{% /tab %}
{% tab label="Sonnet 5 · run 2 · no tree" %}

```bash
wc -l digitalocean/DigitalOcean-public.v2.yaml
grep "^  /v2/(vpcs|droplets|volumes|firewalls)" digitalocean/DigitalOcean-public.v2.yaml
sed -n '2493,2500p' DigitalOcean-public.v2.yaml
ls resources/vpcs/ resources/droplets/ 2>/dev/null; find . -iname "*vpcs_create*" -o -iname "*droplets_create*" -o -iname "*volumes_create*" -o -iname "*firewalls_create*" -o -iname "*volume_actions*"
cat digitalocean/resources/vpcs/vpcs_create.yml
cat digitalocean/resources/droplets/droplets_create.yml
cat digitalocean/resources/volumes/volumes_create.yml
cat digitalocean/resources/firewalls/firewalls_create.yml
cat resources/droplets/models/droplet_single_create.yml 2>/dev/null | head -80; echo ---; find resources/volumes -iname "*action*"
cat resources/firewalls/models/firewall.yml | head -60
mkdir -p /private/tmp/claude-501/-Users-tora-bench-run-digitalocean-control-nfsv3-sonnet-r2/2643aa8a-ab2e-426d-acd2-0f76cbef042c/scratchpad
```

{% /tab %}
{% tab label="Sonnet 5 · run 2 · tree" %}

```bash
redocly tree --help
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --find="vpc" | head -100
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --path=/v2/vpcs --operation=post --with-deps
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --component=schemas --name=vpc | head -60
cat digitalocean/resources/vpcs/models/vpc.yml 2>/dev/null | head -80
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --find="droplet create" | head -40
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --path=/v2/droplets --operation=post --with-deps
cat digitalocean/resources/droplets/models/droplet_create.yml 2>/dev/null
cat digitalocean/resources/droplets/responses/droplet_create.yml 2>/dev/null
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --path=/v2/volumes --operation=post --with-deps
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --find="firewall create" | head -20
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --path=/v2/firewalls --operation=post --with-deps
cat digitalocean/resources/firewalls/models/firewall_rule.yml 2>/dev/null
```

{% /tab %}
{% tab label="Sonnet 5 · run 3 · no tree" %}

```bash
grep -n "^  /v2/vpcs" -A 3 digitalocean/DigitalOcean-public.v2.yaml | head -50
grep -n "operationId:" digitalocean/DigitalOcean-public.v2.yaml | grep -iE "vpc|droplet|volume|firewall"
SPECDIR=digitalocean
find $SPECDIR/resources/vpcs -iname "*create*"
find $SPECDIR/resources/droplets -iname "*create*"
find $SPECDIR/resources/volumes -maxdepth 1
find $SPECDIR/resources/firewalls -maxdepth 1
cat digitalocean/resources/vpcs/vpcs_create.yml
cat digitalocean/resources/droplets/droplets_create.yml
cat digitalocean/resources/volumes/volumes_create.yml
cat digitalocean/resources/volumes/volumeActions_post.yml
cat digitalocean/resources/firewalls/firewalls_create.yml
cat digitalocean/resources/droplets/models/droplet_single_create.yml
find digitalocean/resources/droplets/models -iname "*droplet_create*"
cat digitalocean/resources/droplets/models/droplet_create.yml
cat digitalocean/resources/volumes/responses/volume.yml 2>/dev/null | head -30
sed -n '1,80p' digitalocean/resources/firewalls/models/firewall.yml
cat digitalocean/resources/vpcs/responses/existing_vpc.yml
```

{% /tab %}
{% tab label="Sonnet 5 · run 3 · tree" %}

```bash
redocly tree --help | head -100
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --find=vpc | head -100
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --path=/v2/vpcs --operation=post --with-deps | head -150
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --pointer='digitalocean/resources/vpcs/models/vpc.yml' | head -150
cat digitalocean/resources/vpcs/models/vpc.yml | head -100
cat digitalocean/resources/vpcs/responses/existing_vpc.yml | head -60
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --find=droplet | head -60
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --path=/v2/droplets --operation=post --with-deps | head -60
cat digitalocean/resources/droplets/models/droplet_create.yml
cat digitalocean/resources/droplets/models/droplet_single_create.yml
cat digitalocean/resources/droplets/responses/droplet_create.yml | head -60
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --find=volume | head -40
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --path=/v2/volumes --operation=post --with-deps | head -60
cat digitalocean/resources/volumes/models/volume_base.yml
cat digitalocean/resources/volumes/models/volume_full.yml | head -30
cat digitalocean/resources/volumes/volumeActions_post_byId.yml 2>/dev/null | head -40
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --find=firewall | head -30
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --path=/v2/firewalls --operation=post --with-deps | head -60
cat digitalocean/resources/firewalls/models/firewall_rule.yml
# write /private/tmp/claude-501/-Users-tora-bench-run-digitalocean-tree-help-nfsfix-sonnet-r3/4034511f-a927-4c93-85ce-35a170df92ae/scratchpad/deploy_flow.json
```

{% /tab %}
{% tab label="Sonnet 5 · run 4 · no tree" %}

```bash
wc -l digitalocean/DigitalOcean-public.v2.yaml
grep "^  /v2/(vpcs|droplets|volumes|firewalls)" digitalocean/DigitalOcean-public.v2.yaml
grep "^  /v2/" digitalocean/DigitalOcean-public.v2.yaml
grep "^  /v2/(vpcs|volumes)" digitalocean/DigitalOcean-public.v2.yaml
sed -n '2453,2528p' digitalocean/DigitalOcean-public.v2.yaml
SPECDIR=digitalocean
cat "$SPECDIR/resources/vpcs/vpcs_create.yml" 2>/dev/null | head -100
cat "$SPECDIR/resources/vpcs/models/vpc.yml" 2>/dev/null
cat "$SPECDIR/resources/vpcs/responses/existing_vpc.yml" 2>/dev/null
cat "$SPECDIR/resources/firewalls/firewalls_create.yml" 2>/dev/null
cat "$SPECDIR/resources/firewalls/models/firewall.yml" 2>/dev/null
cat "$SPECDIR/resources/droplets/droplets_create.yml" 2>/dev/null
cat "$SPECDIR/resources/droplets/models/droplet_single_create.yml" 2>/dev/null
echo
cat "$SPECDIR/resources/droplets/responses/droplet_create.yml" 2>/dev/null
cat "$SPECDIR/resources/droplets/models/droplet_create.yml" 2>/dev/null
cat "$SPECDIR/resources/volumes/volumes_create.yml" 2>/dev/null
cat "$SPECDIR/resources/volumes/models/volumes_ext4.yml" 2>/dev/null
ls "$SPECDIR/resources/volumes/models/"
cat "$SPECDIR/resources/volumes/responses/volume.yml" 2>/dev/null
cat "$SPECDIR/resources/firewalls/responses/create_firewall_response.yml" 2>/dev/null
cat "$SPECDIR/resources/firewalls/models/firewall_rule.yml" 2>/dev/null | head -80
# write /private/tmp/claude-501/-Users-tora-bench-run-digitalocean-control-nfsv3-sonnet-r4/94b93667-304a-47e6-aeb3-a337fa9aace5/scratchpad/deploy_flow.json
```

{% /tab %}
{% tab label="Sonnet 5 · run 4 · tree" %}

```bash
redocly tree --help
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --tag | grep -iE "vpc|droplet|volume|firewall"
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --tag "VPCs"
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --path /v2/vpcs --operation post --with-deps
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --file digitalocean/resources/vpcs/models/vpc.yml
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --pointer "digitalocean/resources/vpcs/models/vpc.yml#/vpc_create"
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --pointer "digitalocean/resources/vpcs/responses/existing_vpc.yml"
find . -path "*resources/vpcs/models/vpc.yml" 2>/dev/null
find . -path "*resources/vpcs/responses/existing_vpc.yml" 2>/dev/null
cat /Users/tora/bench-run/digitalocean-tree-help-nfsfix-sonnet-r4/digitalocean/resources/vpcs/models/vpc.yml
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --tag "Droplets"
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --path /v2/droplets --operation post --with-deps
cat /Users/tora/bench-run/digitalocean-tree-help-nfsfix-sonnet-r4/digitalocean/resources/droplets/models/droplet_create.yml
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --tag "Block Storage"
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --tag "Block Storage Actions"
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --path /v2/volumes --operation post --with-deps
cat /Users/tora/bench-run/digitalocean-tree-help-nfsfix-sonnet-r4/digitalocean/resources/volumes/models/volume_base.yml
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --tag "Firewalls"
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --path /v2/firewalls --operation post --with-deps
cat /Users/tora/bench-run/digitalocean-tree-help-nfsfix-sonnet-r4/digitalocean/resources/firewalls/models/firewall_rule.yml
find . -path "*resources/droplets/responses/droplet_create.yml"
cat ./digitalocean/resources/droplets/responses/droplet_create.yml 2>/dev/null | head -60
grep -n "^id:" -A2 ./digitalocean/resources/volumes/responses/volume.yml | head -20
```

{% /tab %}
{% tab label="Sonnet 5 · run 5 · no tree" %}

```bash
wc -l digitalocean/DigitalOcean-public.v2.yaml
grep "^  /v2/(vpcs|droplets|volumes|firewalls)[^/]*:" digitalocean/DigitalOcean-public.v2.yaml
sed -n '1301,1501p' digitalocean/DigitalOcean-public.v2.yaml
cd digitalocean; ls resources/vpcs/ resources/volumes/ 2>/dev/null; echo ---; find . -iname "*volume*action*"
cat digitalocean/resources/vpcs/vpcs_create.yml
cd digitalocean; cat resources/vpcs/models/vpc.yml 2>/dev/null | head -60; echo "---RESPONSE---"; cat resources/vpcs/responses/existing_vpc.yml 2>/dev/null
cat digitalocean/resources/droplets/droplets_create.yml
cat digitalocean/resources/droplets/models/droplet_single_create.yml
cat digitalocean/resources/droplets/models/droplet_create.yml
cat digitalocean/resources/volumes/volumes_create.yml
cat digitalocean/resources/firewalls/firewalls_create.yml
cd digitalocean; cat resources/droplets/responses/droplet_create.yml; echo "---volume resp---"; cat resources/volumes/responses/volume.yml
cd digitalocean; cat resources/firewalls/responses/create_firewall_response.yml 2>/dev/null | head -30
# write /private/tmp/claude-501/-Users-tora-bench-run-digitalocean-control-nfsv3-sonnet-r5/a3861758-0add-4238-9f5b-a1fa7d21e978/scratchpad/deploy_flow.json
```

{% /tab %}
{% tab label="Sonnet 5 · run 5 · tree" %}

```bash
redocly tree --help
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --find "vpc" | head -100
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --operation=vpcs_create --path /v2/vpcs --with-deps | head -150
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --path /v2/vpcs --operation=post --with-deps | head -200
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --pointer digitalocean/resources/vpcs/models/vpc.yml | head -100
cat /Users/tora/bench-run/digitalocean-tree-help-nfsfix-sonnet-r5/digitalocean/resources/vpcs/models/vpc.yml
cat /Users/tora/bench-run/digitalocean-tree-help-nfsfix-sonnet-r5/digitalocean/resources/vpcs/responses/existing_vpc.yml
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --find "droplet create" | head -40
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --find "volume" | head -40
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --find "firewall" | head -40
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --path /v2/droplets --operation=post --with-deps | head -100
cat /Users/tora/bench-run/digitalocean-tree-help-nfsfix-sonnet-r5/digitalocean/resources/droplets/models/droplet_create.yml
cat /Users/tora/bench-run/digitalocean-tree-help-nfsfix-sonnet-r5/digitalocean/resources/droplets/models/droplet_single_create.yml
cat /Users/tora/bench-run/digitalocean-tree-help-nfsfix-sonnet-r5/digitalocean/resources/droplets/responses/droplet_create.yml
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --path /v2/volumes --operation=post --with-deps | head -60
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --path /v2/firewalls --operation=post --with-deps | head -60
cat /Users/tora/bench-run/digitalocean-tree-help-nfsfix-sonnet-r5/digitalocean/resources/firewalls/models/firewall_rule.yml
cat /Users/tora/bench-run/digitalocean-tree-help-nfsfix-sonnet-r5/digitalocean/resources/firewalls/responses/create_firewall_response.yml
```

{% /tab %}
{% /tabs %}

{% /tab %}
{% tab label="Opus 5" %}

{% tabs %}
{% tab label="Opus 5 · run 1 · no tree" %}

```bash
ls -la digitalocean/ && wc -l digitalocean/DigitalOcean-public.v2.yaml
grep "^  /v2/(vpcs|droplets|volumes|firewalls|actions)[^:]*:" digitalocean/DigitalOcean-public.v2.yaml
ls vpcs droplets volumes firewalls 2>/dev/null
sed -n '2453,2540p;1301,1320p;1410,1445p;2493,2530p' DigitalOcean-public.v2.yaml
cat vpcs/vpcs_create.yml && echo "=====MODELS" && ls vpcs/models vpcs/attributes && echo "=====" && cat vpcs/models/*.yml | head -100
cat volumes/volumes_create.yml && echo "=====" && ls volumes/models && echo "===ATTACH" && cat volumes/volumeActions_post.yml volumes/volumeActions_post_byId.yml
ls droplets/models && echo "===CREATE" && sed -n '1,80p' droplets/droplets_create.yml && echo "===SINGLE" && cat droplets/models/droplet_single_create.yml 2>/dev/null | head -60
cat volumes/models/volumes_ext4.yml volumes/models/volume_base.yml && echo "===FWCREATE" && cat firewalls/firewalls_create.yml && ls firewalls/models
cat droplets/models/droplet_create.yml
cat firewalls/models/firewall.yml firewalls/models/firewall_rule.yml
grep -n "account/keys\|/v2/regions\|/v2/sizes\|/v2/images" DigitalOcean-public.v2.yaml | head -20 && echo "===ACTIONS" && cat resources/actions/actions_get.yml && echo "===DROPLETRESP" && cat resources/droplets/responses/droplet_create.yml
cat resources/volumes/responses/volumeAction.yml resources/volumes/models/volume_action_post_attach.yml resources/volumes/models/volumeAction.yml resources/volumes/models/volume_action_post_base.yml 2>/dev/null
cat resources/actions/models/action.yml && sed -n '743,760p' DigitalOcean-public.v2.yaml && grep -rn "status" resources/droplets/models/droplet.yml | head
cat resources/ssh_keys/sshKeys_list.yml 2>/dev/null | head -30; ls resources/ssh_keys 2>/dev/null; cat resources/volumes/parameters.yml resources/actions/parameters.yml
```

{% /tab %}
{% tab label="Opus 5 · run 1 · tree" %}

```bash
redocly tree --help | head -100
ls && ls digitalocean | head
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --find vpc | head -60
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --find firewall | head -60
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --find volume | head -80
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --operation=vpcs_create --with-deps | head -120
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --operation=volumes_create --with-deps | head -200
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --file=digitalocean/resources/vpcs/models/vpc.yml | head -60; echo ====; redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --file=digitalocean/resources/volumes/models/volume_base.yml | head -60
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --operation=droplets_create --with-deps | head -80
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --operation=volumeActions_post_byId --with-deps | head -80
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --operation=firewalls_create --with-deps | head -80
for p in "digitalocean/resources/droplets/models/droplet_create.yml" "digitalocean/resources/firewalls/models/firewall_rule.yml" "digitalocean/resources/volumes/models/volume_base.yml" "digitalocean/resources/volumes/models/volume_action_post_base.yml"; do echo "=== $p"; redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --pointer="$p" | head -50; done
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --pointer="digitalocean/resources/vpcs/models/vpc.yml#/vpc_create"|head -30; echo "=== updatable"; redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --pointer="digitalocean/resources/vpcs/models/vpc.yml#/vpc_updatable"|head -30; echo "=== actions find"; redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --find="action"|head -40
cd /Users/tora/bench-run/digitalocean-tree-help-nfsfix-opus-r1/digitalocean/resources; for f in vpcs/models/vpc.yml volumes/models/volume_base.yml volumes/models/volume_action_post_base.yml volumes/models/volume_action_post_attach.yml; do echo "##### $f"; cat "$f"; done
cd /Users/tora/bench-run/digitalocean-tree-help-nfsfix-opus-r1/digitalocean/resources; echo "##### droplet_create"; cat droplets/models/droplet_create.yml; echo "##### firewall_rule"; cat firewalls/models/firewall_rule.yml
cd /Users/tora/bench-run/digitalocean-tree-help-nfsfix-opus-r1/digitalocean; sed -n 1,60p resources/droplets/responses/droplet_create.yml; echo "##### action model"; sed -n 1,60p resources/actions/models/action.yml; echo "##### volumeAction resp"; cat resources/volumes/responses/volumeAction.yml
cd /Users/tora/bench-run/digitalocean-tree-help-nfsfix-opus-r1/digitalocean; echo "### action_link"; cat shared/models/action_link.yml; echo "### firewalls_assign_droplets"; cat resources/firewalls/firewalls_assign_droplets.yml | head -60
cd /Users/tora/bench-run/digitalocean-tree-help-nfsfix-opus-r1/digitalocean; grep -n -A8 "^  status:" resources/droplets/models/droplet.yml | head -20; echo "### vpc resp"; grep -n "vpc" resources/vpcs/responses/existing_vpc.yml; echo "### vol resp"; grep -n "volume" resources/volumes/responses/volume.yml | head; echo "### fw resp"; grep -n "firewall" resources/firewalls/responses/create_firewall_response.yml | head
```

{% /tab %}
{% tab label="Opus 5 · run 2 · no tree" %}

```bash
ls -la digitalocean/ && wc -l digitalocean/DigitalOcean-public.v2.yaml
grep -nE "^  /(vpcs|droplets|volumes|firewalls|regions|images|account/keys|sizes)" DigitalOcean-public.v2.yaml | head -60 && ls resources
grep -nE "^  /v2/(vpcs|droplets|volumes|firewalls|regions|images|account/keys|sizes|actions)" DigitalOcean-public.v2.yaml | head -80
sed -n '2493,2520p;2453,2492p;1410,1445p' DigitalOcean-public.v2.yaml && ls resources/vpcs resources/volumes resources/firewalls resources/droplets
cat vpcs/vpcs_create.yml && echo "=== VPC MODELS ===" && ls vpcs/models vpcs/attributes && cat vpcs/models/*.yml
sed -n '1,60p' droplets/droplets_create.yml && echo "=== SINGLE CREATE MODEL ===" && ls droplets/models && sed -n '1,140p' droplets/models/droplet_single_create.yml 2>/dev/null
cat droplets/models/droplet_create.yml
cat volumes/volumes_create.yml && echo "=== MODELS ===" && ls volumes/models && cat volumes/models/volumes_ext4.yml volumes/models/volume.yml 2>/dev/null | head -120
cat volumes/models/volume_base.yml volumes/models/volume_action_post_attach.yml volumes/models/volume_action_post_base.yml && echo "=== ACTION POST ===" && cat volumes/volumeActions_post_byId.yml
cat firewalls/firewalls_create.yml | head -50 && echo "=== MODELS ===" && ls firewalls/models && cat firewalls/models/firewall.yml firewalls/models/firewall_rule.yml 2>/dev/null
cat resources/droplets/responses/droplet_create.yml && echo "=== ACTION MODEL ===" && cat shared/models/action.yml 2>/dev/null | head -60 && echo "=== VOL RESP ===" && cat resources/volumes/responses/volume.yml resources/volumes/responses/volumeAction.yml
cat resources/actions/actions_get.yml 2>/dev/null | head -30; ls shared/models/ && sed -n '1,50p' shared/models/action.yml 2>/dev/null; sed -n '1,30p' shared/models/action_link.yml
grep -n "status" resources/actions/models/action.yml | head; sed -n '1,40p' resources/actions/models/action.yml; echo "=== SSHKEYS ==="; ls resources/ssh_keys; grep -n "fingerprint\|  id:" resources/ssh_keys/models/*.yml | head -20
sed -n '50,100p' resources/firewalls/firewalls_create.yml && cat resources/firewalls/responses/*.yml | grep -n "description:\|firewall:" | head -20 && ls resources/firewalls/responses
```

{% /tab %}
{% tab label="Opus 5 · run 2 · tree" %}

```bash
redocly tree --help | head -60
ls /Users/tora/bench-run/digitalocean-tree-help-nfsfix-opus-r2/digitalocean/ | head
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --find "vpc" | head -60
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --find "firewall" | head -60
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --operation vpcs_create --with-deps | head -120
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --find "volume" | head -40
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --pointer "digitalocean/resources/vpcs/models/vpc.yml#/vpc_create" --with-deps | head -60; echo ===; redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --pointer "digitalocean/resources/vpcs/models/vpc.yml#/vpc_updatable" --with-deps | head -40
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --operation volumes_create --with-deps | head -60
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --file digitalocean/resources/vpcs/models/vpc.yml --with-deps | head -80
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --file digitalocean/resources/volumes/models/volume_base.yml --with-deps | head -60
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --file digitalocean/resources/vpcs/models/vpc.yml | head -60
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --file digitalocean/resources/volumes/models/volumes_ext4.yml | head -60
cat /Users/tora/bench-run/digitalocean-tree-help-nfsfix-opus-r2/digitalocean/resources/vpcs/models/vpc.yml
cat /Users/tora/bench-run/digitalocean-tree-help-nfsfix-opus-r2/digitalocean/resources/volumes/models/volumes_ext4.yml
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --operation droplets_create --with-deps | head -80
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --operation firewalls_create --with-deps | head -80
cat /Users/tora/bench-run/digitalocean-tree-help-nfsfix-opus-r2/digitalocean/resources/droplets/models/droplet_create.yml
cat /Users/tora/bench-run/digitalocean-tree-help-nfsfix-opus-r2/digitalocean/resources/firewalls/models/firewall_rule.yml
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --operation volumeActions_post_byId --with-deps | head -40
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --find "actions" | head -40
cat /Users/tora/bench-run/digitalocean-tree-help-nfsfix-opus-r2/digitalocean/resources/volumes/models/volume_action_post_base.yml
cat /Users/tora/bench-run/digitalocean-tree-help-nfsfix-opus-r2/digitalocean/resources/droplets/responses/droplet_create.yml
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --find "ssh key" | head -12; echo "=== sizes"; redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --find "sizes" | head -8
cat /Users/tora/bench-run/digitalocean-tree-help-nfsfix-opus-r2/digitalocean/resources/firewalls/models/firewall.yml
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --operation dropletActions_get | head -20; echo "=== action model"; sed -n 1,60p digitalocean/resources/actions/models/action.yml
sed -n 1,40p digitalocean/shared/models/action_link.yml; echo "=== droplet single create"; cat digitalocean/resources/droplets/models/droplet_single_create.yml; echo "=== volume base"; cat digitalocean/resources/volumes/models/volume_base.yml
cat digitalocean/shared/attributes/region_slug.yml
```

{% /tab %}
{% tab label="Opus 5 · run 3 · no tree" %}

```bash
ls -la digitalocean/ && wc -l digitalocean/DigitalOcean-public.v2.yaml
ls resources && ls shared
ls resources/vpcs resources/droplets resources/volumes resources/firewalls resources/actions
cat vpcs/vpcs_create.yml && echo "=====VPC MODELS" && ls vpcs/models && cat vpcs/models/*.yml | head -120
cat droplets/droplets_create.yml && echo "=====MODELS" && ls droplets/models && echo "=====RESP" && ls droplets/responses && cat droplets/responses/droplet_create.yml 2>/dev/null | head -60
cat droplets/models/droplet_single_create.yml && echo "=====CREATE" && cat droplets/models/droplet_create.yml
cat volumes/volumes_create.yml && echo "=====MODELS"; ls volumes/models; echo "---"; cat volumes/models/volume*.yml | head -200
cat volumes/models/volumes_ext4.yml && echo "==== ACTIONS POST" && cat volumes/volumeActions_post_byId.yml && echo "==== PARAMS" && cat volumes/parameters.yml
cat firewalls/firewalls_create.yml && echo "==== MODELS"; ls firewalls/models; echo "----"; cat firewalls/models/firewall.yml firewalls/models/firewall_rule.yml 2>/dev/null
cat resources/actions/models/action.yml && echo "==== ACTIONS GET" && cat resources/actions/actions_get.yml | head -40 && echo "=== SSH" && ls resources/ssh_keys && echo "=== PATHS" && grep -n "v2/vpcs\|v2/droplets\|v2/volumes\|v2/firewalls\|v2/actions\|v2/account/keys\|v2/sizes\|v2/images" shared/pages.yml | head -60
grep -n "vpcs\|/droplets\|/volumes\|/firewalls\|/actions\|account/keys" DigitalOcean-public.v2.yaml | grep -n "^\s*[0-9]*:\s*'\?/" | head -60
sed -n '2490,2530p' DigitalOcean-public.v2.yaml && echo "=== VPCS" && grep -n "/v2/vpcs" DigitalOcean-public.v2.yaml && sed -n '743,770p' DigitalOcean-public.v2.yaml && echo "=== servers/base" && sed -n '1,40p' DigitalOcean-public.v2.yaml
cat volumes/responses/volume.yml volumes/responses/volumeAction.yml firewalls/responses/create_firewall_response.yml vpcs/responses/existing_vpc.yml 2>/dev/null | head -80 && echo "=== SSHLIST" && cat ssh_keys/sshKeys_list.yml | head -30 && ls ssh_keys/responses && cat ssh_keys/responses/*.yml | head -40
grep -n -A12 "  status:" droplets/models/droplet.yml | head -25 && echo "=== action_link" && cat ../shared/models/action_link.yml && echo "=== fw param" && cat firewalls/parameters.yml | head -20
```

{% /tab %}
{% tab label="Opus 5 · run 3 · tree" %}

```bash
redocly tree --help | head -60; echo "---"; ls
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --find "vpc" | head -40
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --find "volume" | head -50
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --operation=vpcs_create --with-deps | head -120
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --find "firewall" | head -30
sed -n '1,80p' digitalocean/resources/vpcs/models/vpc.yml
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --operation=volumes_create --with-deps | head -60
cat digitalocean/resources/volumes/models/volume_base.yml; echo ===; cat digitalocean/resources/volumes/models/volumes_ext4.yml
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --operation=volumeActions_post_byId --with-deps | head -40
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --operation=droplets_create --with-deps | head -50
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --operation=firewalls_create --with-deps | head -50
grep -n "^  [a-z_]*:\|required\|vpc_uuid\|readOnly" digitalocean/resources/droplets/models/droplet_create.yml | head -40; echo "=== single"; cat digitalocean/resources/droplets/models/droplet_single_create.yml
cat digitalocean/resources/firewalls/models/firewall_rule.yml
sed -n '99,145p' digitalocean/resources/droplets/models/droplet_create.yml
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --find "ssh key" | head -15; echo "==="; redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --find "droplet actions" | head -15
grep -n "servers:" -A5 digitalocean/DigitalOcean-public.v2.yaml | head -20; echo "=== dropcreate resp"; sed -n '1,55p' digitalocean/resources/droplets/responses/droplet_create.yml; echo "=== action_link"; cat digitalocean/shared/models/action_link.yml
cat digitalocean/resources/volumes/models/volumeAction.yml 2>/dev/null | head -40; echo "=== action model"; grep -n "status\|id:\|type:" digitalocean/resources/actions/models/action.yml | head -25
cat digitalocean/resources/volumes/models/volumes_ext4.yml; echo "--- resp volume"; sed -n '1,30p' digitalocean/resources/volumes/responses/volume.yml
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --operation=droplets_get | head -12; redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --operation=volumeActions_get | head -12
```

{% /tab %}
{% tab label="Opus 5 · run 4 · no tree" %}

```bash
ls -la digitalocean/ && wc -l digitalocean/DigitalOcean-public.v2.yaml
grep "^  /v2/(vpcs|droplets|volumes|firewalls)" digitalocean/DigitalOcean-public.v2.yaml
cd digitalocean; sed -n '1295,1320p;1405,1445p;2450,2500p' DigitalOcean-public.v2.yaml
cd digitalocean; ls resources/ resources/vpcs resources/volumes resources/droplets resources/firewalls 2>/dev/null | head -100
cd digitalocean/resources; cat vpcs/vpcs_create.yml; echo "=====MODELS"; ls vpcs/models; echo ===; cat vpcs/models/*.yml | head -120
cd digitalocean/resources; cat volumes/volumes_create.yml; echo "=====ATTACH"; cat volumes/volumeActions_post_byId.yml; echo "=====LS"; ls volumes/models volumes/responses
cd digitalocean/resources; echo "### vpc.yml"; cat vpcs/models/vpc.yml; echo "### resp existing_vpc"; cat vpcs/responses/existing_vpc.yml; echo "### volumes_ext4"; cat volumes/models/volumes_ext4.yml; echo "### volume_base"; cat volumes/models/volume_base.yml; echo "### attach"; cat volumes/models/volume_action_post_attach.yml volumes/models/volume_action_post_base.yml; echo "### resp volume"; cat volumes/responses/volume.yml
cd digitalocean/resources; echo "### droplets_create"; cat droplets/droplets_create.yml; echo "### firewalls_create"; cat firewalls/firewalls_create.yml; ls droplets/models firewalls/models
cd digitalocean/resources; echo "### single_create"; cat droplets/models/droplet_single_create.yml; echo "### droplet_create"; cat droplets/models/droplet_create.yml; echo "### resp droplet_create"; cat droplets/responses/droplet_create.yml | head -60
cd digitalocean/resources; echo "### firewall.yml"; cat firewalls/models/firewall.yml; echo "### firewall_rule"; cat firewalls/models/firewall_rule.yml
cd digitalocean; grep -n "/v2/actions" -A4 DigitalOcean-public.v2.yaml | head -20; echo "### action_link"; cat shared/models/action_link.yml; echo "### droplet action get"; cat resources/droplets/dropletActions_get.yml | head -40; echo "### volumeActions_get"; cat resources/volumes/volumeActions_get.yml | head -40
cd digitalocean; cat shared/models/action.yml 2>/dev/null | head -60; echo "### resp volumeAction"; cat resources/volumes/responses/volumeAction.yml | head -30; echo "### droplet.yml networks"; grep -n "vpc_uuid\|status" resources/droplets/models/droplet.yml | head -20
cd digitalocean; sed -n '40,60p' resources/droplets/models/droplet.yml; echo "### action status"; grep -n "status" -A10 resources/actions/models/action.yml | head -30; echo "### fw resp"; cat resources/firewalls/responses/create_firewall_response.yml | head -25; echo "### ssh_keys list"; grep -n "/v2/ssh_keys" -A4 DigitalOcean-public.v2.yaml | head
cd digitalocean; grep -n "ssh_keys\|account/keys" DigitalOcean-public.v2.yaml | head; grep -n "^  /v2/regions" -A3 DigitalOcean-public.v2.yaml
```

{% /tab %}
{% tab label="Opus 5 · run 4 · tree" %}

```bash
ls && redocly tree --help
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --find "vpc" | head -60
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --find "firewall" | head -60
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --operation=vpcs_create --with-deps | head -120
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --find "volume" | head -40
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --pointer="digitalocean/resources/vpcs/models/vpc.yml" | head -80
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --operation=volumes_create --with-deps | head -80
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --file=digitalocean/resources/vpcs/models/vpc.yml | head -60
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --operation=droplets_create --with-deps | head -60
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --pointer="digitalocean/resources/droplets/models/droplet_create.yml" --with-deps | head -60
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --pointer="digitalocean/resources/vpcs/models/vpc.yml#/vpc_create" --with-deps | head -40; echo ====; redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --pointer="digitalocean/resources/vpcs/models/vpc.yml#/vpc_updatable" --with-deps | head -40
cat digitalocean/resources/vpcs/models/vpc.yml && echo "=====DROPLET" && cat digitalocean/resources/droplets/models/droplet_create.yml
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --operation=firewalls_create --with-deps | head -40; echo "=====ATTACH"; redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --operation=volumeActions_post_byId --with-deps | head -40
cat digitalocean/resources/firewalls/models/firewall_rule.yml; echo "=====VABASE"; cat digitalocean/resources/volumes/models/volume_action_post_base.yml; echo "=====VOLBASE"; cat digitalocean/resources/volumes/models/volume_base.yml
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --find "ssh key" | head -15; echo ===; redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --operation=droplets_get | head -20; echo ===; redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --operation=volumeActions_get|head -20
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --find "droplets_get" | head -8; echo "@@@"; redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --operation=volumeActions_get | head -12; echo "@@@"; cat digitalocean/resources/droplets/responses/droplet_create.yml | head -60
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --path=/v2/actions/{action_id} | head -10
```

{% /tab %}
{% tab label="Opus 5 · run 5 · no tree" %}

```bash
ls -la digitalocean/ && wc -l digitalocean/DigitalOcean-public.v2.yaml
grep "^  /v2/(vpcs|droplets|volumes|firewalls|ssh_keys|actions|sizes|images|regions)[^:]*:" digitalocean/DigitalOcean-public.v2.yaml
ls && echo ---- && sed -n '1301,1320p;1410,1445p;2453,2530p' ../DigitalOcean-public.v2.yaml
cd digitalocean; cat resources/vpcs/vpcs_create.yml; echo "=====DROPLET CREATE"; cat resources/droplets/droplets_create.yml; echo "=====VOL CREATE"; cat resources/volumes/volumes_create.yml; echo "=====VOL ACTION"; cat resources/volumes/volumeActions_post_byId.yml; echo "=====FW CREATE"; cat resources/firewalls/firewalls_create.yml
cd digitalocean; echo "=====VPC MODEL"; cat resources/vpcs/models/vpc.yml; echo "=====DROPLET SINGLE"; cat resources/droplets/models/droplet_single_create.yml; echo "=====VOL EXT4"; cat resources/volumes/models/volumes_ext4.yml; echo "=====ATTACH"; cat resources/volumes/models/volume_action_post_attach.yml
cd digitalocean; echo "=====DROPLET CREATE MODEL"; cat resources/droplets/models/droplet_create.yml; echo "=====VOL BASE"; cat resources/volumes/models/volume_base.yml; echo "===ACTION BASE"; cat resources/volumes/models/volume_action_post_base.yml
cd digitalocean; echo "=====FW MODEL"; cat resources/firewalls/models/firewall.yml; echo "=====FW RULE"; ls resources/firewalls/models/; cat resources/firewalls/models/firewall_rule.yml 2>/dev/null
cd digitalocean; cat resources/droplets/responses/droplet_create.yml; echo "=== ACTION LINK MODEL"; ls resources/droplets/models | head -40; sed -n '1,80p' resources/droplets/models/droplet_create_response.yml 2>/dev/null; echo "=== ACTIONS GET"; cat resources/actions/actions_get.yml; echo "=== ACTION MODEL"; find . -name "action.yml" | head; cat shared/models/action.yml 2>/dev/null | head -60
cd digitalocean; sed -n '1,60p' resources/actions/models/action.yml; echo "=== ACTION LINK"; cat shared/models/action_link.yml; echo "=== VOL ACTION RESP"; cat resources/volumes/responses/volumeAction.yml; echo "=== SSH KEYS"; ls resources/ssh_keys; sed -n '2200,2240p' DigitalOcean-public.v2.yaml
cd digitalocean; grep -n "ssh_keys" DigitalOcean-public.v2.yaml | head; echo "=== SSHCREATE"; sed -n '1,50p' resources/ssh_keys/sshKeys_create.yml; cat resources/ssh_keys/models/sshKeys.yml 2>/dev/null || ls resources/ssh_keys/models; echo "=== SERVERS"; sed -n '1,60p' DigitalOcean-public.v2.yaml | grep -n "url\|servers\|title\|version"
cd digitalocean; grep -n -A12 "  status:" resources/droplets/models/droplet.yml | head -30; grep -n -A6 "vpc_uuid\|networks:" resources/droplets/models/droplet.yml | head -40; echo "=== EXISTING VPC RESP"; cat resources/vpcs/responses/existing_vpc.yml; echo "=== FW RESP"; cat resources/firewalls/responses/create_firewall_response.yml
```

{% /tab %}
{% tab label="Opus 5 · run 5 · tree" %}

```bash
redocly tree --help | head -80
ls -la /Users/tora/bench-run/digitalocean-tree-help-nfsfix-opus-r5/digitalocean/ | head
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --find "vpc" | head -60
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --find "volume" | head -60
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --find "firewall" | head -60
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --find "droplet" | head -80
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --operation=vpcs_create --with-deps | head -120
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --operation=volumes_create --with-deps | head -200
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --file=digitalocean/resources/vpcs/models/vpc.yml | head -60; echo "=====VOLBASE"; redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --file=digitalocean/resources/volumes/models/volume_base.yml | head -40
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --operation=droplets_create --with-deps | head -60
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --operation=firewalls_create --with-deps | head -60
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --operation=volumeActions_post_byId --with-deps | head -60
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --pointer="digitalocean/resources/droplets/models/droplet_create.yml" --with-deps | head -60
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --pointer="digitalocean/resources/vpcs/models/vpc.yml#/vpc_create" --with-deps | head -40; echo ====; redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --pointer="digitalocean/resources/vpcs/models/vpc.yml#/vpc_updatable" --with-deps | head -40
sed -n '1,80p' digitalocean/resources/vpcs/models/vpc.yml
cat digitalocean/resources/droplets/models/droplet_create.yml
cat digitalocean/resources/firewalls/models/firewall_rule.yml; echo "=====FW"; sed -n '1,90p' digitalocean/resources/firewalls/models/firewall.yml
cat digitalocean/resources/volumes/models/volume_base.yml; echo "=====EXT4"; cat digitalocean/resources/volumes/models/volumes_ext4.yml; echo "=====ACTIONBASE"; cat digitalocean/resources/volumes/models/volume_action_post_base.yml
sed -n '1,60p' digitalocean/resources/droplets/responses/droplet_create.yml; echo "=====ACTIONLINK"; cat digitalocean/shared/models/action_link.yml; echo "=====VOLACTRESP"; cat digitalocean/resources/volumes/responses/volumeAction.yml
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --find "ssh key" | head -12; echo ===; redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --find "actions" | head -14
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --path="/v2/actions/{action_id}" | head -20; echo "==="; redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --operation=dropletActions_get | head -20; echo "===VOLACTMODEL"; cat digitalocean/resources/volumes/models/volumeAction.yml
grep -n -A6 "status:" digitalocean/resources/actions/models/action.yml | head -20
```

{% /tab %}
{% /tabs %}

{% /tab %}
{% tab label="Haiku 4.5" %}

{% tabs %}
{% tab label="Haiku 4.5 · run 1 · no tree" %}

```bash
Skill
cat digitalocean/DigitalOcean-public.v2.yaml
grep "/v2/(vpcs|droplets|volumes|firewalls)" digitalocean/DigitalOcean-public.v2.yaml
grep -n "^  /v2/vpcs\|^  /v2/droplets\|^  /v2/volumes\|^  /v2/firewalls" digitalocean/DigitalOcean-public.v2.yaml | head -20
grep -n "^  /v2/vpcs\|^  /v2/volumes\|^  /v2/firewalls" digitalocean/DigitalOcean-public.v2.yaml
sed -n '2493,2593p' digitalocean/DigitalOcean-public.v2.yaml
sed -n '1301,1321p' digitalocean/DigitalOcean-public.v2.yaml
```

{% /tab %}
{% tab label="Haiku 4.5 · run 1 · tree" %}

```bash
redocly tree --help
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --find "droplet create" | head -50
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --find "firewall" | head -50
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --find "vpc network private" | head -50
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --find "vpc" | head -50
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --find "volume attach" | head -50
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --path=/v2/droplets --operation=post
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --component=schemas --name=droplet_single_create | head -100
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --with-deps --path=/v2/droplets --operation=post | grep -A 20 "droplet_single_create"
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --path=/v2/vpcs --operation=post
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --path=/v2/volumes --operation=post
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --path=/v2/volumes/{volume_id}/actions --operation=post | head -100
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --path=/v2/firewalls --operation=post
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --path=/v2/firewalls/{firewall_id}/droplets --operation=post
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --with-deps --path=/v2/droplets --operation=post | grep -i "vpc\|network" | head -20
cat /Users/tora/bench-run/digitalocean-tree-help-nfsfix-haiku-r1/digitalocean/resources/droplets/examples.yml
cat > /private/tmp/claude-501/-Users-tora-bench-run-digitalocean-tree-help-nfsfix-haiku-r1/a3197c47-8f28-4d8d-b4bf-7dcd2978cbff/scratchpad/deploy_flow.json << 'EOF'
{
"deployment_flow": "DigitalOcean private web service with storage and firewall",
"steps": [
"order": 1,
"name": "Create VPC",
"endpoint": "POST /v2/vpcs",
"operation_id": "vpcs_create",
"description": "Create a private network for the server",
"requires": {
"auth": "bearer_auth (vpc:create)"
},
"request_body": {
"name": "web-service-vpc",
"region": "nyc3",
"description": "Private network for web service"
"response_code": 201,
"response_extracts": {
"vpc_uuid": "vpc.id"
"pass_to_next": ["vpc_uuid"]
"order": 2,
"name": "Create Droplet (Server)",
"endpoint": "POST /v2/droplets",
"operation_id": "droplets_create",
"description": "Launch the server in the VPC",
"auth": "bearer_auth (droplet:create)",
"from_previous": ["vpc_uuid"]
"name": "web-service",
"size": "s-1vcpu-1gb",
"image": "ubuntu-22-04-x64",
"vpc_uuid": "${vpc_uuid}",
"ssh_keys": [],
"monitoring": true
"response_code": 202,
"droplet_id": "droplet.id"
"pass_to_next": ["droplet_id"]
"order": 3,
"name": "Create Block Storage Volume",
"endpoint": "POST /v2/volumes",
"operation_id": "volumes_create",
"description": "Create the extra storage volume",
"auth": "bearer_auth (block_storage:create)"
"name": "web-service-storage",
"size_gigabytes": 100,
"filesystem_type": "ext4",
"description": "Storage volume for web service"
"volume_id": "volume.id"
"pass_to_next": ["volume_id"]
"order": 4,
"name": "Attach Volume to Droplet",
"endpoint": "POST /v2/volumes/{volume_id}/actions",
"operation_id": "volumeActions_post_byId",
"description": "Attach the storage volume to the server",
"auth": "bearer_auth (block_storage_action:create)",
"from_previous": ["volume_id", "droplet_id"]
"path_params": {
"volume_id": "${volume_id}"
"type": "attach",
"droplet_id": "${droplet_id}",
"region": "nyc3"
"response_code": 202
"order": 5,
"name": "Create Firewall",
"endpoint": "POST /v2/firewalls",
"operation_id": "firewalls_create",
"description": "Create firewall allowing only SSH and HTTPS",
"auth": "bearer_auth (firewall:create)"
"name": "web-service-firewall",
"inbound_rules": [
"protocol": "tcp",
"ports": "22",
"sources": {
"addresses": ["0.0.0.0/0", "::/0"]
}
"ports": "443",
],
"outbound_rules": [
"ports": "1:65535",
"destinations": {
"protocol": "udp",
]
"firewall_id": "firewall.id"
"pass_to_next": ["firewall_id"]
"order": 6,
"name": "Assign Droplet to Firewall",
"endpoint": "POST /v2/firewalls/{firewall_id}/droplets",
"operation_id": "firewalls_assign_droplets",
"description": "Apply the firewall rules to the server",
"auth": "bearer_auth (firewall:update)",
"from_previous": ["firewall_id", "droplet_id"]
"firewall_id": "${firewall_id}"
"droplet_ids": ["${droplet_id}"]
"response_code": 204
"notes": {
"region": "Use the same region (nyc3) for all resources to ensure connectivity",
"vpc": "The droplet will be placed in the specified VPC. All internal traffic stays private",
"volume_attachment": "The volume will be formatted ext4 and auto-mounted on modern Ubuntu/Debian droplets",
"firewall": "Inbound rules restrict to SSH (22) and HTTPS (443). Outbound allows all TCP/UDP for flexibility",
"status_polling": "POST endpoints return 202 (Accepted) - use the action_links in responses to poll completion",
"template_variables": "Replace ${vpc_uuid}, ${droplet_id}, ${volume_id}, ${firewall_id} with actual values from previous responses"
EOF
cat /private/tmp/claude-501/-Users-tora-bench-run-digitalocean-tree-help-nfsfix-haiku-r1/a3197c47-8f28-4d8d-b4bf-7dcd2978cbff/scratchpad/deploy_flow.json
```

{% /tab %}
{% tab label="Haiku 4.5 · run 2 · no tree" %}

```bash
Skill
cat digitalocean/DigitalOcean-public.v2.yaml
grep "^  - name: (Droplets|VPC|Firewall|Block Storage)" digitalocean/DigitalOcean-public.v2.yaml
grep -n "name: Droplet\|name: VPC\|name: Firewall\|name: Block Storage\|/v2/droplets\|/v2/vpc\|/v2/firewalls" digitalocean/DigitalOcean-public.v2.yaml | head -40
sed -n '2493,2793p' digitalocean/DigitalOcean-public.v2.yaml
sed -n '1301,1501p' digitalocean/DigitalOcean-public.v2.yaml
grep -n "/v2/volumes" digitalocean/DigitalOcean-public.v2.yaml | head -20
sed -n '2453,2503p' digitalocean/DigitalOcean-public.v2.yaml
find digitalocean/resources -name "*vpc*create*" -o -name "*droplet*create*" -o -name "*volume*create*" -o -name "*firewall*create*" | head -10
cat digitalocean/resources/vpcs/vpcs_create.yml
cat digitalocean/resources/vpcs/models/vpc.yml
cat digitalocean/resources/vpcs/responses/existing_vpc.yml
cat digitalocean/resources/droplets/droplets_create.yml
cat digitalocean/resources/droplets/models/droplet_single_create.yml
cat digitalocean/resources/droplets/models/droplet_create.yml
cat digitalocean/resources/volumes/volumes_create.yml
cat digitalocean/resources/volumes/models/volumes_ext4.yml
cat digitalocean/resources/firewalls/firewalls_create.yml
cat digitalocean/resources/volumes/volumeActions_post_byId.yml
```

{% /tab %}
{% tab label="Haiku 4.5 · run 2 · tree" %}

```bash
redocly tree --help
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --find "droplet create"
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --find "firewall"
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --find "network VPC"
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --operation=vpcs_create --with-deps
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --operation=droplets_create --with-deps
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --component=schemas --name=droplet_create
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --component=schemas | head -40
cat /Users/tora/bench-run/digitalocean-tree-help-nfsfix-haiku-r2/digitalocean/resources/droplets/models/droplet_create.yml
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --operation=volumes_create --with-deps
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --find "volume attach"
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --operation=volumeActions_post_byId --with-deps
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --operation=firewalls_create --with-deps
cat /Users/tora/bench-run/digitalocean-tree-help-nfsfix-haiku-r2/digitalocean/resources/firewalls/models/firewall_rule.yml
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --operation=firewalls_assign_droplets --with-deps
cat /Users/tora/bench-run/digitalocean-tree-help-nfsfix-haiku-r2/digitalocean/resources/vpcs/responses/existing_vpc.yml
cat /Users/tora/bench-run/digitalocean-tree-help-nfsfix-haiku-r2/digitalocean/resources/vpcs/models/vpc.yml
cat /Users/tora/bench-run/digitalocean-tree-help-nfsfix-haiku-r2/digitalocean/resources/droplets/responses/droplet_create.yml
cat /Users/tora/bench-run/digitalocean-tree-help-nfsfix-haiku-r2/digitalocean/resources/droplets/models/droplet.yml
cat /Users/tora/bench-run/digitalocean-tree-help-nfsfix-haiku-r2/digitalocean/resources/volumes/responses/volume.yml
cat /Users/tora/bench-run/digitalocean-tree-help-nfsfix-haiku-r2/digitalocean/resources/firewalls/responses/create_firewall_response.yml
```

{% /tab %}
{% tab label="Haiku 4.5 · run 3 · no tree" %}

```bash
Skill
cat digitalocean/DigitalOcean-public.v2.yaml
grep "paths:" digitalocean/DigitalOcean-public.v2.yaml | head -5
sed -n '730,1230p' digitalocean/DigitalOcean-public.v2.yaml
grep "(?:/v2/droplets|/v2/volumes|/v2/firewalls|/v2/vpcs|/v2/networks)" digitalocean/DigitalOcean-public.v2.yaml | head -100
sed -n '1301,1451p' digitalocean/DigitalOcean-public.v2.yaml
sed -n '2453,2553p' digitalocean/DigitalOcean-public.v2.yaml
```

{% /tab %}
{% tab label="Haiku 4.5 · run 3 · tree" %}

```bash
redocly tree --help
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --find="vpc network" 2>/dev/null | head -50
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --find="droplet create" 2>/dev/null | head -50
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --find="volume storage" 2>/dev/null | head -50
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --find="firewall" 2>/dev/null | head -50
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --path=/v2/vpcs --operation=post --with-deps 2>/dev/null
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --path=/v2/droplets --operation=post --with-deps 2>/dev/null
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --path=/v2/volumes --operation=post --with-deps 2>/dev/null
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --path=/v2/firewalls --operation=post --with-deps 2>/dev/null
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --path=/v2/volumes/{volume_id}/actions --operation=post --with-deps 2>/dev/null | head -80
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --path=/v2/firewalls/{firewall_id}/droplets --operation=post --with-deps 2>/dev/null | head -80
```

{% /tab %}
{% tab label="Haiku 4.5 · run 4 · no tree" %}

```bash
Skill
cat digitalocean/DigitalOcean-public.v2.yaml
grep "/v2/vpcs|/v2/droplets|/v2/volumes|/v2/firewalls" digitalocean
cat /Users/tora/.claude/projects/-Users-tora-bench-run-digitalocean-control-nfsv3-haiku-r4/d0ac3879-d57b-4f0b-97e3-2623e22fdea7/tool-results/toolu_01CjCJgkhUpkXEqpVjGqphAQ.txt
sed -n '2493,2543p' digitalocean/DigitalOcean-public.v2.yaml
cat digitalocean/resources/vpcs/vpcs_create.yml
cat digitalocean/resources/droplets/droplets_create.yml
cat digitalocean/resources/droplets/models/droplet_single_create.yml
cat digitalocean/resources/droplets/models/droplet_create.yml
sed -n '100,150p' digitalocean/resources/droplets/models/droplet_create.yml
cat digitalocean/resources/volumes/volumes_create.yml
cat digitalocean/resources/volumes/models/volumes_ext4.yml
cat digitalocean/resources/volumes/volumeActions_post_byId.yml
cat digitalocean/resources/firewalls/firewalls_create.yml
```

{% /tab %}
{% tab label="Haiku 4.5 · run 4 · tree" %}

```bash
redocly tree --help
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --find droplet | head -50
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --find volume | head -50
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --find firewall | head -50
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --find network | head -50
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --find vpc
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --operation=post --path=/v2/vpcs --with-deps
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --operation=post --path=/v2/droplets --with-deps
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --operation=post --path=/v2/volumes --with-deps
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --find "attach" --head=30
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --find "attach" | head -30
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --operation=post --path=/v2/firewalls --with-deps
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --operation=post --path=/v2/volumes/actions --with-deps
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --operation=post --path=/v2/firewalls/{firewall_id}/droplets --with-deps
```

{% /tab %}
{% tab label="Haiku 4.5 · run 5 · no tree" %}

```bash
cat digitalocean/DigitalOcean-public.v2.yaml
grep "/v2/(vpcs|volumes|droplets|firewalls)"
grep "/v2/(vpcs|volumes|droplets|firewalls)" digitalocean/DigitalOcean-public.v2.yaml
sed -n '2450,2550p' digitalocean/DigitalOcean-public.v2.yaml
sed -n '1301,1451p' digitalocean/DigitalOcean-public.v2.yaml
```

{% /tab %}
{% tab label="Haiku 4.5 · run 5 · tree" %}

```bash
Skill
redocly tree --help
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --find "droplet" | head -100
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --find "volume" | head -50
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --find "network" | head -100
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --find "firewall" | head -50
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --find "attach" | head -50
redocly tree digitalocean/DigitalOcean-public.v2.yaml --path=/v2/volumes --format=ai
redocly tree digitalocean/DigitalOcean-public.v2.yaml --path=/v2/volumes/{volume_id}/actions --format=ai
cat /Users/tora/bench-run/digitalocean-tree-help-nfsfix-haiku-r5/digitalocean/resources/vpcs/vpcs_create.yml
cat /Users/tora/bench-run/digitalocean-tree-help-nfsfix-haiku-r5/digitalocean/resources/vpcs/responses/existing_vpc.yml
cat /Users/tora/bench-run/digitalocean-tree-help-nfsfix-haiku-r5/digitalocean/resources/droplets/droplets_create.yml
cat /Users/tora/bench-run/digitalocean-tree-help-nfsfix-haiku-r5/digitalocean/resources/droplets/models/droplet_single_create.yml
cat /Users/tora/bench-run/digitalocean-tree-help-nfsfix-haiku-r5/digitalocean/resources/droplets/models/droplet_create.yml
sed -n '100,150p' /Users/tora/bench-run/digitalocean-tree-help-nfsfix-haiku-r5/digitalocean/resources/droplets/models/droplet_create.yml
cat /Users/tora/bench-run/digitalocean-tree-help-nfsfix-haiku-r5/digitalocean/resources/volumes/volumes_create.yml
cat /Users/tora/bench-run/digitalocean-tree-help-nfsfix-haiku-r5/digitalocean/resources/volumes/volumeActions_post_byId.yml
cat /Users/tora/bench-run/digitalocean-tree-help-nfsfix-haiku-r5/digitalocean/resources/firewalls/firewalls_create.yml
cat /Users/tora/bench-run/digitalocean-tree-help-nfsfix-haiku-r5/digitalocean/resources/firewalls/firewalls_assign_droplets.yml
```

{% /tab %}
{% /tabs %}

{% /tab %}
{% /tabs %}

Opus 5 passes on both sides and pays 33% more context through the index — 2,909 single-operation files named by what they do already are an index, and `cat vpcs/vpcs_create.yml` beats any card.
Sonnet 5 gets every call right in four of five index runs and still passes none of them, because its answers never say how a call authenticates — with the requirement standing on the overview's own `security:` line. Haiku 4.5 lands two of five either way.

{% /tab %}

{% tab label="DigitalOcean NFS" %}

**Description:** 2.62 MB across 2,909 files — the same description as the previous tab.

**Task:** shared storage for a cluster — a network file share in one region reachable from a private network, plus a second export path a different private network can mount.
Expected: `POST /v2/nfs` → `POST /v2/nfs/shares/{share_id}/access_points`.
The point of this task: it is the same description as the previous tab, but a corner DigitalOcean's tutorials do not cover — the mainstream droplet-and-firewall recipe is written up everywhere, network file shares are not. Traps: the share binds to networks through a `vpc_ids` array while an access point takes a single `vpc_id`, and `/` as an export path is reserved for the implicit default.

{% tabs %}
{% tab label="Prompt: no tree" %}

```text
We need shared storage for a cluster: a network file share in one region, reachable from
our private network, plus a second export path that a different private network can
mount. Nothing is set up yet. Work out what our provisioning script has to call.

API description: digitalocean/DigitalOcean-public.v2.yaml

Give me a working flow as JSON in your reply: the steps in order, what each one calls, what it
needs, and what to carry from its response into the next step. It has to work as written.
```

{% /tab %}
{% tab label="Prompt: tree" %}

```text
We need shared storage for a cluster: a network file share in one region, reachable from
our private network, plus a second export path that a different private network can
mount. Nothing is set up yet. Work out what our provisioning script has to call.

API description: digitalocean/DigitalOcean-public.v2.yaml

The Redocly CLI is installed and its `tree` command can search the description for you.
Start with `redocly tree --help` to see what it can select, then work with `--format=ai`:
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai <flags>

Give me a working flow as JSON in your reply: the steps in order, what each one calls, what it
needs, and what to carry from its response into the next step. It has to work as written.
```

{% /tab %}
{% /tabs %}

Context the run added, and the tool calls it took (medians over the working runs):

| Model           |        no tree |        tree | Difference |
| --------------- | -------------: | ----------: | ---------: |
| Sonnet 5 (n=5)  |    17,421 / 16 | 13,015 / 17 |       −25% |
| Opus 5 (n=5)    |     16,427 / 8 | 23,653 / 15 |       +44% |
| Haiku 4.5 (n=5) | 40,843 / 15 ❌ | 12,941 / 18 |          — |

What those runs were billed:

| Model           |  no tree |  tree | Difference |
| --------------- | -------: | ----: | ---------: |
| Sonnet 5 (n=5)  |    $0.53 | $0.43 |       −19% |
| Opus 5 (n=5)    |    $0.72 | $0.77 |        +7% |
| Haiku 4.5 (n=5) | $0.23 ❌ | $0.14 |          — |

Whether each run produced a flow that would run:

| Run               | no tree                                             | tree           |
| ----------------- | --------------------------------------------------- | -------------- |
| Sonnet 5 · run 1  | no share call, no access point call, no auth scheme | works          |
| Sonnet 5 · run 2  | no auth scheme                                      | works          |
| Sonnet 5 · run 3  | no auth scheme                                      | no auth scheme |
| Sonnet 5 · run 4  | no auth scheme                                      | works          |
| Sonnet 5 · run 5  | works                                               | no auth scheme |
| Opus 5 · run 1    | works                                               | works          |
| Opus 5 · run 2    | works                                               | works          |
| Opus 5 · run 3    | works                                               | works          |
| Opus 5 · run 4    | works                                               | works          |
| Opus 5 · run 5    | works                                               | works          |
| Haiku 4.5 · run 1 | no auth scheme                                      | works          |
| Haiku 4.5 · run 2 | no access point call, no auth scheme                | works          |
| Haiku 4.5 · run 3 | no auth scheme                                      | works          |
| Haiku 4.5 · run 4 | no auth scheme                                      | no auth scheme |
| Haiku 4.5 · run 5 | no access point call                                | works          |

A run works when its flow contains `POST /v2/nfs` naming `name`, `size_gib`, `region` and `vpc_ids`, and the access-point create naming `path` and `vpc_id`, under `bearer_auth`.
Creating the private networks first is optional: the task calls them "our" and "a different" private network, which reads as well on ids that already exist.

What each run ran:

{% tabs %}
{% tab label="Sonnet 5" %}

{% tabs %}
{% tab label="Sonnet 5 · run 1 · no tree" %}

```bash
grep "-i \"nfs|file share|network file\"" digitalocean/DigitalOcean-public.v2.yaml
grep "^  /v2/volumes|^  /v2/vpcs" digitalocean/DigitalOcean-public.v2.yaml
sed -n '2453,2528p' digitalocean/DigitalOcean-public.v2.yaml
find digitalocean/resources/volumes digitalocean/resources/vpcs -name "*.yml" | xargs -I{} echo {}
cat digitalocean/resources/volumes/volumes_create.yml
cat digitalocean/resources/volumes/models/volume_action_post_attach.yml
cat digitalocean/resources/volumes/models/volume_action_post_base.yml
cat digitalocean/resources/vpcs/vpcs_create.yml
cat digitalocean/resources/vpcs/vpcs_create_peerings.yml
grep "vpc_uuid|volumes:|user_data" digitalocean/resources/droplets/models/droplet_create.yml
cat digitalocean/resources/droplets/models/droplet_create.yml
grep "^  /v2/droplets:" digitalocean/DigitalOcean-public.v2.yaml
grep -n "networks" -A 15 digitalocean/resources/droplets/models/droplet_full.yml 2>/dev/null | head -40
grep "networks" digitalocean/resources/droplets
grep "networks|v4|private\" | type\" |ip_address" digitalocean/resources/droplets/models/droplet.yml
sed -n '1,40p' digitalocean/resources/droplets/models/network_v4.yml 2>/dev/null
mkdir -p "/private/tmp/claude-501/-Users-tora-bench-run-donfs-control-nfsv3-sonnet-r1/5487e77c-b947-4a0c-912f-a10b3db22a40/scratchpad"
```

{% /tab %}
{% tab label="Sonnet 5 · run 1 · tree" %}

```bash
redocly tree --help
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --find "share" | head -100
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --path /v2/nfs --operation post --with-deps | head -200
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --component schemas --name nfs_request
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --pointer digitalocean/resources/nfs/models/nfs_request.yml
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --pointer digitalocean/resources/nfs/models/nfs_create_response.yml
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --pointer digitalocean/resources/nfs/models/nfs_response.yml
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --file digitalocean/resources/nfs/models/nfs_request.yml
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --file digitalocean/resources/nfs/models/nfs_create_response.yml
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --file digitalocean/resources/nfs/models/nfs_response.yml
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --file digitalocean/resources/nfs/models/access_point_response.yml
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --file digitalocean/resources/nfs/models/access_policy.yml
find . -path "*digitalocean/resources/nfs*" -name "*.yml" | sort
cat ./digitalocean/resources/nfs/models/nfs_request.yml
cat ./digitalocean/resources/nfs/models/access_point_request.yml
cat ./digitalocean/resources/nfs/models/access_policy.yml
cat ./digitalocean/resources/nfs/models/nfs_create_response.yml
cat ./digitalocean/resources/nfs/models/nfs_response.yml
cat ./digitalocean/resources/nfs/models/access_point_response.yml
cat ./digitalocean/resources/nfs/nfs_access_point_create.yml
cat ./digitalocean/resources/nfs/responses/access_point_create.yml
cat ./digitalocean/resources/nfs/parameters.yml
true
```

{% /tab %}
{% tab label="Sonnet 5 · run 2 · no tree" %}

```bash
grep -n -i "nfs\|file.*share\|fileshare" digitalocean/DigitalOcean-public.v2.yaml | head -100
ls -la && echo "---create---" && cat nfs_create.yml
```

{% /tab %}
{% tab label="Sonnet 5 · run 2 · tree" %}

```bash
redocly tree --help
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --find="share nfs" | head -100
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --path=/v2/nfs --operation=post --with-deps
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --component=schemas --name=nfs_create_response
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --component=schemas --name=nfs_response
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --component=schemas --name=access_policy
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --file=digitalocean/resources/nfs/models/nfs_create_response.yml --with-deps
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --file=digitalocean/resources/nfs/models/nfs_response.yml --with-deps
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --file=digitalocean/resources/nfs/models/access_policy.yml --with-deps
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --file=digitalocean/resources/nfs/models/nfs_create_response.yml
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --file=digitalocean/resources/nfs/models/nfs_response.yml
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --file=digitalocean/resources/nfs/models/access_policy.yml
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --file=digitalocean/resources/nfs/models/access_point_response.yml
find digitalocean/resources/nfs -type f | sort
cat digitalocean/resources/nfs/models/nfs_response.yml
cat digitalocean/resources/nfs/models/access_point_request.yml
cat digitalocean/resources/nfs/models/access_point_response.yml
cat digitalocean/resources/nfs/nfs_access_point_create.yml
cat digitalocean/resources/nfs/models/nfs_request.yml
cat digitalocean/resources/nfs/models/access_policy.yml
cat digitalocean/resources/nfs/models/nfs_create_response.yml
cat digitalocean/resources/nfs/responses/access_point_create.yml
cat digitalocean/resources/nfs/models/access_point_action_response.yml
grep -n "share_id_path" -A5 digitalocean/resources/nfs/parameters.yml
```

{% /tab %}
{% tab label="Sonnet 5 · run 3 · no tree" %}

```bash
grep "-i" digitalocean/DigitalOcean-public.v2.yaml
grep "nfs|NFS|file.?share|export.?path|Filesystem" digitalocean/DigitalOcean-public.v2.yaml | head -100
ls digitalocean/resources/nfs/
cat digitalocean/resources/nfs/nfs_create.yml
cat digitalocean/resources/nfs/nfs_access_point_create.yml
cat digitalocean/resources/nfs/models
ls digitalocean/resources/nfs/models/ digitalocean/resources/nfs/responses/
cat digitalocean/resources/nfs/models/nfs_request.yml
cat digitalocean/resources/nfs/models/nfs_response.yml
cat digitalocean/resources/nfs/models/access_point_request.yml
cat digitalocean/resources/nfs/models/access_point_response.yml
cat digitalocean/resources/nfs/models/access_policy.yml
cat digitalocean/resources/nfs/responses/nfs_create.yml
cat digitalocean/resources/nfs/responses/access_point_create.yml
cat digitalocean/resources/nfs/nfs_get.yml
grep "/v2/vpcs" digitalocean/DigitalOcean-public.v2.yaml
grep -n "" -A5 -B1 "^  /v2/vpcs:" digitalocean/DigitalOcean-public.v2.yaml | head -20; echo ---; find digitalocean/resources -iname "*vpc_create*"
sed -n '2493,2518p' digitalocean/DigitalOcean-public.v2.yaml
cat digitalocean/resources/vpcs/vpcs_create.yml
cat digitalocean/resources/nfs/responses/access_point_bad_request.yml
cat digitalocean/resources/vpcs/models/vpc.yml
cat digitalocean/resources/nfs/models/nfs_create_response.yml
cat digitalocean/resources/nfs/parameters.yml
```

{% /tab %}
{% tab label="Sonnet 5 · run 3 · tree" %}

```bash
redocly tree --help | head -100
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --find=nfs | head -150
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --path=/v2/nfs --operation=post --with-deps | head -300
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --component=schemas --name=nfs_create_response | head -80
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --component=schemas --name=nfs_response | head -80
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --file=digitalocean/resources/nfs/models/nfs_response.yml | head -100
cat digitalocean/resources/nfs/models/nfs_response.yml
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --path=/v2/nfs/shares/{share_id}/access_points --operation=post --with-deps | head -200
cat digitalocean/resources/nfs/models/access_point_response.yml
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --path=/v2/nfs/access_points/{access_point_id} --operation=get --with-deps | head -60
sed -n '1,90p' digitalocean/resources/nfs/parameters.yml
cat digitalocean/resources/nfs/models/access_point_request.yml
```

{% /tab %}
{% tab label="Sonnet 5 · run 4 · no tree" %}

```bash
grep "nfs|shared_filesystem|shared-filesystem|SharedFilesystem|file.?share|network file\", \"case_insensitive" digitalocean/DigitalOcean-public.v2.yaml
grep "-i" digitalocean/DigitalOcean-public.v2.yaml
grep "nfs" digitalocean/DigitalOcean-public.v2.yaml | head -100
ls digitalocean/resources/nfs/
cat digitalocean/resources/nfs/nfs_create.yml
cat digitalocean/resources/nfs/models/nfs_request.yml 2>/dev/null; echo "---RESPONSE---"; cat digitalocean/resources/nfs/responses/nfs_create.yml 2>/dev/null
cd digitalocean/resources/nfs; echo "--- nfs_create_response ---"; cat models/nfs_create_response.yml 2>/dev/null; echo "--- nfs share model (search) ---"; ls models;
cd digitalocean/resources/nfs/models; echo "--- nfs_response ---"; cat nfs_response.yml; echo "--- access_point_request ---"; cat access_point_request.yml; echo "--- access_point_response ---"; cat access_point_response.yml; echo "--- access_policy ---"; cat access_policy.yml
cat digitalocean/resources/nfs/nfs_access_point_create.yml
cd digitalocean/resources/nfs; cat responses/access_point_create.yml; echo "---model---"; cat models/access_point_action_response.yml 2>/dev/null
cat digitalocean/resources/nfs/parameters.yml
```

{% /tab %}
{% tab label="Sonnet 5 · run 4 · tree" %}

```bash
redocly tree --help
redocly --version; redocly tree digitalocean/DigitalOcean-public.v2.yaml --help | head -50
which redocly; npm ls -g --depth=0 2>/dev/null | grep -i redocly; npx --yes @redocly/cli@latest --version | tail -5
npx --yes @redocly/cli@latest tree --help | head -80
npm view @redocly/cli version; npm view @redocly/cli versions --json | tail -20
ls; find . -iname "*digitalocean*" 2>/dev/null | head -20
npx --yes @redocly/cli@latest tree digitalocean/DigitalOcean-public.v2.yaml --format=ai | head -50
npm view @redocly/cli@next version
npm view @redocly/cli dist-tags --json
npx --yes @redocly/cli@snapshot tree --help | head -60
ls -la /opt/homebrew/bin/redocly; readlink -f /opt/homebrew/bin/redocly 2>/dev/null; cat /opt/homebrew/bin/redocly 2>/dev/null | head -5; find / -maxdepth 6 -iname "*redocly*" -type d 2>/dev/null | grep -v node_modules/.cache
ls /Users/tora/Desktop/Projects/redocly-cli-tree; cat /Users/tora/Desktop/Projects/redocly-cli-tree/package.json 2>/dev/null | head -20
ls packages/cli/bin 2>/dev/null; find . -maxdepth 3 -iname "cli.js" 2>/dev/null
node /Users/tora/Desktop/Projects/redocly-cli-tree/packages/cli/bin/cli.js tree --help | head -80
alias rtree='node /Users/tora/Desktop/Projects/redocly-cli-tree/packages/cli/bin/cli.js tree'
node /Users/tora/Desktop/Projects/redocly-cli-tree/packages/cli/bin/cli.js tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --find "nfs" | head -100
node /Users/tora/Desktop/Projects/redocly-cli-tree/packages/cli/bin/cli.js tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --path "/v2/nfs" --operation post --with-deps | head -250
node /Users/tora/Desktop/Projects/redocly-cli-tree/packages/cli/bin/cli.js tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --component schemas --name nfs_response | head -100
cd /Users/tora/bench-run/donfs-tree-help-nfsfix-sonnet-r4
CLI="node /Users/tora/Desktop/Projects/redocly-cli-tree/packages/cli/bin/cli.js"
$CLI tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --pointer digitalocean/resources/nfs/models/nfs_create_response.yml
$CLI tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --pointer digitalocean/resources/nfs/models/nfs_response.yml
node /Users/tora/Desktop/Projects/redocly-cli-tree/packages/cli/bin/cli.js tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --pointer digitalocean/resources/nfs/models/nfs_create_response.yml
node /Users/tora/Desktop/Projects/redocly-cli-tree/packages/cli/bin/cli.js tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --file digitalocean/resources/nfs/models/nfs_create_response.yml
cat /Users/tora/bench-run/donfs-tree-help-nfsfix-sonnet-r4/digitalocean/resources/nfs/models/nfs_create_response.yml
cat /Users/tora/bench-run/donfs-tree-help-nfsfix-sonnet-r4/digitalocean/resources/nfs/models/nfs_response.yml
node /Users/tora/Desktop/Projects/redocly-cli-tree/packages/cli/bin/cli.js tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --path "/v2/nfs/shares/{share_id}/access_points" --operation post --with-deps
cat /Users/tora/bench-run/donfs-tree-help-nfsfix-sonnet-r4/digitalocean/resources/nfs/models/access_point_response.yml
node /Users/tora/Desktop/Projects/redocly-cli-tree/packages/cli/bin/cli.js tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --find "list vpc" | head -30
cat /Users/tora/bench-run/donfs-tree-help-nfsfix-sonnet-r4/digitalocean/resources/nfs/models/nfs_request.yml
cat /Users/tora/bench-run/donfs-tree-help-nfsfix-sonnet-r4/digitalocean/resources/nfs/models/access_point_request.yml
cat /Users/tora/bench-run/donfs-tree-help-nfsfix-sonnet-r4/digitalocean/resources/nfs/models/access_policy.yml
cat /Users/tora/bench-run/donfs-tree-help-nfsfix-sonnet-r4/digitalocean/resources/nfs/responses/nfs_create.yml
cat /Users/tora/bench-run/donfs-tree-help-nfsfix-sonnet-r4/digitalocean/resources/nfs/responses/access_point_create.yml
cat /Users/tora/bench-run/donfs-tree-help-nfsfix-sonnet-r4/digitalocean/resources/nfs/nfs_get.yml 2>/dev/null | head -40
cat /Users/tora/bench-run/donfs-tree-help-nfsfix-sonnet-r4/digitalocean/resources/nfs/parameters.yml
node /Users/tora/Desktop/Projects/redocly-cli-tree/packages/cli/bin/cli.js tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --path "/v2/vpcs" --operation get
grep -n "id:\|name:\|region:\|urn:" /Users/tora/bench-run/donfs-tree-help-nfsfix-sonnet-r4/digitalocean/resources/vpcs/models/*.yml 2>/dev/null | head -20
find /Users/tora/bench-run/donfs-tree-help-nfsfix-sonnet-r4/digitalocean/resources/vpcs -iname "*vpc*.yml" | grep -i model
```

{% /tab %}
{% tab label="Sonnet 5 · run 5 · no tree" %}

```bash
grep -n -i "nfs\|file share\|export" digitalocean/DigitalOcean-public.v2.yaml | head -80
D=digitalocean; find $D -path "*resources/nfs*"
cat digitalocean/resources/nfs/models/nfs_request.yml
cat digitalocean/resources/nfs/models/nfs_create_response.yml
cat digitalocean/resources/nfs/models/nfs_response.yml
cat digitalocean/resources/nfs/nfs_access_point_create.yml
cat digitalocean/resources/nfs/models/access_point_request.yml
cat digitalocean/resources/nfs/nfs_create.yml
cat digitalocean/resources/nfs/models/access_point_response.yml
cat digitalocean/resources/nfs/nfs_get.yml
cat digitalocean/resources/nfs/parameters.yml
cat digitalocean/resources/nfs/models/access_policy.yml
cat digitalocean/resources/nfs/models/access_point_get_response.yml
D=digitalocean/resources/nfs; cat $D/responses/access_point_create.yml; echo ---; cat $D/models/access_point_action_response.yml 2>/dev/null; echo ---; cat $D/models/nfs_action.yml
cat digitalocean/resources/nfs/nfs_access_point_get.yml
# write /private/tmp/claude-501/-Users-tora-bench-run-donfs-control-nfsv3-sonnet-r5/f6a72e9b-83d5-49c7-8e79-27f3be177f4c/scratchpad/nfs_flow.json
```

{% /tab %}
{% tab label="Sonnet 5 · run 5 · tree" %}

```bash
redocly tree --help
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --find="nfs" | head -100
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --path=/v2/nfs --operation=post --with-deps | head -300
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --component=schemas --name=nfs_response | head -100
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --component=schemas --name=nfs_create_response | head -100
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --file=digitalocean/resources/nfs/models/nfs_response.yml --with-deps | head -150
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --file=digitalocean/resources/nfs/models/nfs_response.yml | head -150
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --file=digitalocean/resources/nfs/models/nfs_create_response.yml | head -150
find . -path "*nfs*" -name "*.yml" | grep -v examples | sort
cat /Users/tora/bench-run/donfs-tree-help-nfsfix-sonnet-r5/digitalocean/resources/nfs/models/nfs_response.yml
cat /Users/tora/bench-run/donfs-tree-help-nfsfix-sonnet-r5/digitalocean/resources/nfs/models/nfs_request.yml
cat /Users/tora/bench-run/donfs-tree-help-nfsfix-sonnet-r5/digitalocean/resources/nfs/models/access_point_request.yml
cat /Users/tora/bench-run/donfs-tree-help-nfsfix-sonnet-r5/digitalocean/resources/nfs/models/access_point_response.yml
cat /Users/tora/bench-run/donfs-tree-help-nfsfix-sonnet-r5/digitalocean/resources/nfs/models/access_policy.yml
cat /Users/tora/bench-run/donfs-tree-help-nfsfix-sonnet-r5/digitalocean/resources/nfs/nfs_access_point_create.yml
cat /Users/tora/bench-run/donfs-tree-help-nfsfix-sonnet-r5/digitalocean/resources/nfs/responses/access_point_create.yml
cat /Users/tora/bench-run/donfs-tree-help-nfsfix-sonnet-r5/digitalocean/resources/nfs/responses/nfs_create.yml
cat /Users/tora/bench-run/donfs-tree-help-nfsfix-sonnet-r5/digitalocean/resources/nfs/models/nfs_create_response.yml
cat /Users/tora/bench-run/donfs-tree-help-nfsfix-sonnet-r5/digitalocean/resources/nfs/parameters.yml
```

{% /tab %}
{% /tabs %}

{% /tab %}
{% tab label="Opus 5" %}

{% tabs %}
{% tab label="Opus 5 · run 1 · no tree" %}

```bash
grep -n -i "nfs\|share" digitalocean/DigitalOcean-public.v2.yaml | head -100
ls resources/nfs/ && cat resources/nfs/nfs_create.yml resources/nfs/nfs_access_point_create.yml
ls models responses && cat models/nfs_request.yml models/access_point_request.yml
cat models/access_policy.yml models/nfs_response.yml models/access_point_response.yml models/access_point_action_response.yml models/nfs_create_response.yml
cat models/nfs_actions.yml models/nfs_action.yml nfs_actions_create.yml && cat parameters.yml && grep -rn -i "nfsv3\|NFS3\|version 3" . ../../ 2>/dev/null | head -20
cat responses/access_point_bad_request.yml responses/access_point_conflict.yml responses/access_point_create.yml nfs_access_point_get.yml nfs_get.yml | head -120
ls && cat models/vpc_create.yml 2>/dev/null || cat models/*.yml | head -80
cat vpcs_create.yml && sed -n 1,60p responses/*create*.yml && cd ../nfs && sed -n 1,80p responses/nfs_create.yml
sed -n 1,40p vpcs/responses/existing_vpc.yml; sed -n 1,60p nfs/responses/nfs_create.yml
grep -rn "identity_enforcement\|NFS4" --include=*.yml . | grep -v "^./resources/nfs/models/access_policy" | head -30; sed -n 1,80p resources/nfs/responses/nfs_get.yml
```

{% /tab %}
{% tab label="Opus 5 · run 1 · tree" %}

```bash
redocly tree --help | head -80
ls && ls digitalocean | head
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --find "nfs" | head -60
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --find "file share" | head -60
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --operation nfs_create --with-deps | head -150
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --operation nfs_create_access_point --with-deps | head -150
for f in models/nfs_request.yml models/nfs_create_response.yml models/nfs_response.yml models/access_point_request.yml models/access_policy.yml models/access_point_response.yml models/access_point_action_response.yml models/nfs_action.yml parameters.yml; do echo "===== $f"; cat "$f"; done | head -300
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --find "vpc" | head -40
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --find "vpc" | head -40; redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --tag NFS | head -40
cat /Users/tora/bench-run/donfs-tree-help-nfsfix-opus-r1/digitalocean/resources/nfs/parameters.yml; echo ==== ; cat /Users/tora/bench-run/donfs-tree-help-nfsfix-opus-r1/digitalocean/resources/nfs/responses/access_point_create.yml
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --operation vpcs_create --with-deps | head -40; echo "@@@@"; redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --operation nfs_get --with-deps | head -25; echo "@@@@"; redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --operation nfs_list --with-deps | head -25
cat responses/access_point_create.yml responses/nfs_create.yml; echo "@@@ getAP"; cat nfs_access_point_get.yml
cat digitalocean/resources/vpcs/models/vpc.yml; echo "@@@"; grep -rn "host" digitalocean/resources/nfs/ | head -20
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --find "regions list" | head -15; cat digitalocean/resources/nfs/responses/access_point_get.yml | head -50
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --operation nfs_create_action --with-deps | head -20; echo "@@@"; ls digitalocean/resources/nfs/models/; echo "@@@"; cat digitalocean/resources/nfs/models/nfs_action_request.yml 2>/dev/null
sed -n '1,60p' digitalocean/resources/nfs/models/nfs_actions.yml; echo "@@@ desc"; sed -n '1,40p' digitalocean/resources/nfs/nfs_actions_create.yml
```

{% /tab %}
{% tab label="Opus 5 · run 2 · no tree" %}

```bash
grep -n -i "nfs\|file_storage\|shared_file\|share" digitalocean/DigitalOcean-public.v2.yaml | head -80
ls -R && echo "=====" && for f in nfs_create.yml nfs_get.yml nfs_actions_create.yml nfs_access_point_create.yml nfs_access_point_get.yml; do echo "--- $f"; cat $f; done
for f in models/nfs_request.yml models/nfs_response.yml models/access_point_request.yml models/access_point_response.yml models/access_policy.yml models/access_point_action_response.yml parameters.yml responses/nfs_create.yml responses/access_point_create.yml models/nfs_create_response.yml models/nfs_actions.yml; do echo "=== $f"; cat $f; done
cat resources/nfs/responses/nfs_get.yml && echo "=== APGET" && cat resources/nfs/responses/access_point_get.yml && echo "=== VPC" && ls resources/vpcs && echo "---" && cat resources/vpcs/vpcs_create.yml 2>/dev/null | head -60
cat models/vpc.yml && echo "=== resp" && cat responses/existing_vpc.yml
```

{% /tab %}
{% tab label="Opus 5 · run 2 · tree" %}

```bash
redocly tree --help | head -60
ls /Users/tora/bench-run/donfs-tree-help-nfsfix-opus-r2/digitalocean/
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --find="nfs" | head -80
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --find="file share" | head -60
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --operation=nfs_create --with-deps | head -150
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --operation=nfs_create_access_point --with-deps | head -150
for f in models/nfs_request.yml models/access_point_request.yml models/access_policy.yml models/nfs_create_response.yml models/nfs_response.yml models/access_point_response.yml models/access_point_action_response.yml parameters.yml; do echo "=== $f"; cat "$f"; done
redocly tree /Users/tora/bench-run/donfs-tree-help-nfsfix-opus-r2/digitalocean/DigitalOcean-public.v2.yaml --format=ai --find="vpc" | head -40
for f in responses/nfs_create.yml responses/access_point_create.yml models/nfs_action.yml nfs_actions_create.yml nfs_get.yml nfs_access_point_get.yml; do echo "=== $f"; cat "$f"; done
cat vpcs/vpcs_create.yml; echo "=== models"; ls vpcs/models; cat vpcs/models/vpc_base.yml 2>/dev/null; cat vpcs/models/vpc_create.yml 2>/dev/null
cat vpcs/models/vpc.yml; echo "=== resp"; cat vpcs/responses/existing_vpc.yml
cat models/nfs_actions.yml; echo "=== resp"; cat responses/nfs_actions.yml; echo "=== apbad"; cat responses/access_point_bad_request.yml
grep -A4 "^servers:" digitalocean/DigitalOcean-public.v2.yaml | head; redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --find="regions" | head -10
```

{% /tab %}
{% tab label="Opus 5 · run 3 · no tree" %}

```bash
grep -n -i "nfs\|shared_storage\|share" digitalocean/DigitalOcean-public.v2.yaml | head -80
ls && echo "=====" && cat nfs_create.yml
ls models responses && echo "=== nfs_request" && cat models/nfs_request.yml && echo "=== nfs model" && cat models/nfs.yml 2>/dev/null
for f in models/nfs_response.yml models/nfs_create_response.yml responses/nfs_create.yml models/access_point_request.yml models/access_point_response.yml models/access_policy.yml models/access_point_create_response.yml; do echo "=== $f"; cat $f 2>/dev/null; done
for f in nfs_access_point_create.yml responses/access_point_create.yml models/access_point_get_response.yml nfs_actions_create.yml models/nfs_actions.yml models/nfs_action.yml models/nfs_actions_response.yml parameters.yml nfs_get.yml; do echo "=== $f"; cat $f; done
ls && echo "=== create" && cat vpcs_create.yml && echo "=== model" && cat models/vpc.yml 2>/dev/null | head -60
sed -n '/^vpc_create:/,/^$/p' models/vpc.yml && echo "=== resp" && cat responses/existing_vpc.yml && echo "=== ap_get" && cat ../nfs/nfs_access_point_get.yml && echo "=== ap_list" && cat ../nfs/nfs_access_point_list.yml
cat responses/access_point_bad_request.yml responses/access_point_conflict.yml && echo "=== curl ex" && cat examples/curl/nfs_access_point_create.yml examples/curl/nfs_create.yml && sed -n '405,425p' ../../DigitalOcean-public.v2.yaml
```

{% /tab %}
{% tab label="Opus 5 · run 3 · tree" %}

```bash
ls && redocly tree --help
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --find "file share" | head -60; echo ===; redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --find "nfs" | head -60
cd /Users/tora/bench-run/donfs-tree-help-nfsfix-opus-r3; for q in nfs share storage volume filesystem; do echo "--- $q"; redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --find "$q" | head -40; done
cd /Users/tora/bench-run/donfs-tree-help-nfsfix-opus-r3; redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --operation nfs_create --with-deps | head -200
cd /Users/tora/bench-run/donfs-tree-help-nfsfix-opus-r3; for f in models/nfs_request.yml models/nfs_create_response.yml models/nfs_response.yml models/access_point_response.yml models/access_policy.yml; do echo "=== $f"; cat digitalocean/resources/nfs/$f; done
cd /Users/tora/bench-run/donfs-tree-help-nfsfix-opus-r3; redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --operation nfs_create_access_point --with-deps | head -60; echo "=== files"; ls digitalocean/resources/nfs digitalocean/resources/nfs/models digitalocean/resources/nfs/responses
cd /Users/tora/bench-run/donfs-tree-help-nfsfix-opus-r3/digitalocean/resources/nfs; cat models/access_point_request.yml models/access_point_action_response.yml models/nfs_action.yml models/nfs_actions.yml parameters.yml; echo "=== nfs_get"; cat nfs_get.yml models/nfs_get_response.yml; echo "=== ap get"; cat nfs_access_point_get.yml models/access_point_get_response.yml
cd /Users/tora/bench-run/donfs-tree-help-nfsfix-opus-r3; cat digitalocean/resources/nfs/responses/nfs_create.yml digitalocean/resources/nfs/responses/access_point_create.yml; echo === ; redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --find "vpc" | head -30
cd /Users/tora/bench-run/donfs-tree-help-nfsfix-opus-r3; redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --find vpc | head -30
cd /Users/tora/bench-run/donfs-tree-help-nfsfix-opus-r3; redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --operation vpcs_create --with-deps | head -30; echo; cat digitalocean/resources/vpcs/models/vpc*.yml 2>/dev/null | head -80
cd /Users/tora/bench-run/donfs-tree-help-nfsfix-opus-r3/digitalocean/resources/nfs; cat nfs_list.yml | head -30; echo "=== curl examples"; cat examples/curl/nfs_create.yml examples/curl/nfs_access_point_create.yml examples/curl/nfs_get.yml
cd /Users/tora/bench-run/donfs-tree-help-nfsfix-opus-r3/digitalocean/resources/nfs; cat responses/access_point_get.yml responses/nfs_get.yml responses/access_point_list.yml | head -120
```

{% /tab %}
{% tab label="Opus 5 · run 4 · no tree" %}

```bash
ls -la digitalocean/ && wc -l digitalocean/DigitalOcean-public.v2.yaml
grep "(?i)nfs|shared_file|file_share|share" digitalocean/DigitalOcean-public.v2.yaml | head -60
ls digitalocean/resources/nfs/
cat digitalocean/resources/nfs/nfs_create.yml
ls models responses && echo "=== nfs_request ===" && cat models/nfs_request.yml && echo "=== nfs model ===" && ls models
for f in nfs_response.yml nfs_create_response.yml access_point_request.yml access_point_response.yml access_policy.yml access_point_create_response.yml nfs_action.yml nfs_actions.yml; do echo "=== $f ==="; cat $f 2>/dev/null; done
grep -n "vpcs" DigitalOcean-public.v2.yaml | head -30
ls && echo "=== create ===" && cat vpcs_create.yml && echo "=== models ===" && ls models && cat models/vpc.yml 2>/dev/null
cat models/access_point_action_response.yml && echo "=== list op ===" && cat nfs_access_point_list.yml && echo "=== ap_get ===" && cat nfs_access_point_get.yml && echo "=== resp nfs_create ===" && cat responses/nfs_create.yml
cat responses/existing_vpc.yml && echo "=== curl example ===" && cat examples/curl/vpcs_create.yml
cat examples/curl/nfs_create.yml examples/curl/nfs_access_point_create.yml examples/curl/nfs_get.yml 2>/dev/null; echo "=== resp nfs_get ==="; cat responses/nfs_get.yml
grep -n "host" -r . | head; echo "---"; cat responses/access_point_get.yml
```

{% /tab %}
{% tab label="Opus 5 · run 4 · tree" %}

```bash
redocly tree --help | head -80
ls && ls digitalocean | head
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --find "file share" | head -60
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --find "nfs" | head -60
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --operation nfs_create --with-deps | head -150
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --operation nfs_create_access_point --with-deps | head -150
for f in models/nfs_request.yml models/nfs_response.yml models/nfs_create_response.yml models/access_point_request.yml models/access_policy.yml models/access_point_response.yml responses/nfs_create.yml responses/access_point_create.yml models/nfs_action.yml; do echo "=== $f"; cat digitalocean/resources/nfs/$f; done | head -300
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --find "vpc" | head -40
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --operation vpcs_create --with-deps | head -40; echo "###"; cat digitalocean/resources/vpcs/models/vpc_create.yml 2>/dev/null || ls digitalocean/resources/vpcs/models
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --operation nfs_create_action --with-deps | head -40; echo "### GET AP"; redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --operation nfs_get --with-deps | head -25
cat digitalocean/resources/nfs/parameters.yml; echo "=== vpc.yml"; cat digitalocean/resources/vpcs/models/vpc.yml
cat digitalocean/resources/nfs/models/nfs_actions.yml; echo "=== AP get"; redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --operation nfs_get_access_point | head -12
cat responses/access_point_get.yml models/access_point_action_response.yml models/nfs_action.yml responses/access_point_bad_request.yml | head -140
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --find "nfs region availability"|head -10; echo ===; redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --operation nfs_list | head -8
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --operation nfs_list | head -8
```

{% /tab %}
{% tab label="Opus 5 · run 5 · no tree" %}

```bash
grep -n "shared_file_system\|filesystem\|Filesystem\|nfs\|NFS" digitalocean/DigitalOcean-public.v2.yaml | head -80
ls && echo "=== CREATE ===" && cat nfs_create.yml
ls models responses && echo "=== nfs_request ===" && cat models/nfs_request.yml && echo "=== nfs model ===" && cat models/nfs.yml 2>/dev/null
for f in models/nfs_response.yml models/nfs_create_response.yml responses/nfs_create.yml models/access_point_request.yml models/access_point_response.yml models/access_policy.yml models/access_point_create.yml; do echo "=== $f ==="; cat $f 2>/dev/null; done
for f in nfs_access_point_create.yml nfs_get.yml nfs_actions_create.yml parameters.yml models/nfs_actions.yml models/nfs_action.yml responses/access_point_create.yml responses/access_point_conflict.yml responses/access_point_bad_request.yml; do echo "=== $f ==="; cat $f; done
grep -n "/v2/vpcs" DigitalOcean-public.v2.yaml | head -20; echo "---"; cat resources/vpcs/vpcs_create.yml; echo "=== model ==="; ls resources/vpcs/models; cat resources/vpcs/models/vpc.yml 2>/dev/null
cat models/access_point_get_response.yml models/nfs_get_response.yml nfs_access_point_get.yml models/nfs_actions_response.yml; echo "=== curl create ==="; cat examples/curl/nfs_create.yml examples/curl/nfs_access_point_create.yml
```

{% /tab %}
{% tab label="Opus 5 · run 5 · tree" %}

```bash
redocly tree --help | head -100
ls && ls digitalocean | head
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --find "file system" | head -60
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --find "nfs" | head -60
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --operation=nfs_create --with-deps | head -200
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --operation=nfs_create_access_point --with-deps | head -200
for f in models/nfs_request.yml models/nfs_create_response.yml models/nfs_response.yml models/access_point_request.yml models/access_policy.yml models/access_point_response.yml models/access_point_action_response.yml models/nfs_action.yml responses/nfs_create.yml responses/access_point_create.yml parameters.yml; do echo "===== $f"; cat digitalocean/resources/nfs/$f; done | head -400
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --find "vpc" | head -40
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --operation=vpcs_create --with-deps | head -60; echo "#### vpc model"; cat digitalocean/resources/vpcs/models/vpc.yml 2>/dev/null | head -80; ls digitalocean/resources/vpcs/models
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --operation=nfs_get_access_point --with-deps | head -40; echo ====; redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --operation=nfs_get --with-deps | head -40; echo ==== params; sed -n '40,90p' digitalocean/resources/nfs/parameters.yml
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --operation=nfs_get --with-deps | head -30; echo "PARAMS"; sed -n '40,90p' digitalocean/resources/nfs/parameters.yml; echo "GETRESP"; cat digitalocean/resources/nfs/responses/nfs_get.yml digitalocean/resources/nfs/models/nfs_get_response.yml 2>/dev/null | head -60
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --operation=nfs_create_action --with-deps | head -40; echo "ACTIONREQ"; ls digitalocean/resources/nfs/models;
sed -n '1,80p' digitalocean/resources/nfs/nfs_actions_create.yml; echo "=== actions model"; cat digitalocean/resources/nfs/models/nfs_actions.yml
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --operation=nfs_list|head -20; echo ===; redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --operation=nfs_list_access_points|head -20
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --find "regions"|head -10; echo; redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --operation=vpcs_list|head -8
```

{% /tab %}
{% /tabs %}

{% /tab %}
{% tab label="Haiku 4.5" %}

{% tabs %}
{% tab label="Haiku 4.5 · run 1 · no tree" %}

```bash
Skill
cat digitalocean/DigitalOcean-public.v2.yaml
sed -n '1964,2464p' digitalocean/DigitalOcean-public.v2.yaml
ls **/nfs_create.yml
cat digitalocean/resources/nfs/nfs_create.yml
cat digitalocean/resources/nfs/models/nfs_request.yml
cat digitalocean/resources/nfs/nfs_access_point_create.yml
cat digitalocean/resources/nfs/models/access_point_request.yml
cat digitalocean/resources/nfs/models/access_policy.yml
cat digitalocean/resources/nfs/responses/nfs_create.yml
cat digitalocean/resources/nfs/models/nfs_create_response.yml
cat digitalocean/resources/nfs/models/nfs_response.yml
cat digitalocean/resources/nfs/models/access_point_response.yml
cat digitalocean/resources/nfs/nfs_actions_create.yml
```

{% /tab %}
{% tab label="Haiku 4.5 · run 1 · tree" %}

```bash
redocly tree --help
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --find "volume" | head -100
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --find "space" | head -100
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --find "file" | head -100
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --find "mount"
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --tag | grep -i "storage\|nfs\|file" | head -30
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --tag "NFS"
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --operation nfs_create --with-deps
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --operation nfs_create_access_point --with-deps
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --component schemas --name "NfsCreateResponse\|AccessPointResponse"
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --pointer "digitalocean/resources/nfs/models/nfs_response.yml"
cat /Users/tora/bench-run/donfs-tree-help-nfsfix-haiku-r1
ls -la /Users/tora/bench-run/donfs-tree-help-nfsfix-haiku-r1/
cat /Users/tora/bench-run/donfs-tree-help-nfsfix-haiku-r1/digitalocean/resources/nfs/responses/nfs_create.yml
cat /Users/tora/bench-run/donfs-tree-help-nfsfix-haiku-r1/digitalocean/resources/nfs/models/nfs_create_response.yml
cat /Users/tora/bench-run/donfs-tree-help-nfsfix-haiku-r1/digitalocean/resources/nfs/models/nfs_response.yml
cat /Users/tora/bench-run/donfs-tree-help-nfsfix-haiku-r1/digitalocean/resources/nfs/models/access_point_response.yml
cat /Users/tora/bench-run/donfs-tree-help-nfsfix-haiku-r1/digitalocean/resources/nfs/models/access_point_request.yml
cat /Users/tora/bench-run/donfs-tree-help-nfsfix-haiku-r1/digitalocean/resources/nfs/models/access_policy.yml
cat /Users/tora/bench-run/donfs-tree-help-nfsfix-haiku-r1/digitalocean/resources/nfs/responses/access_point_create.yml
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --tag "NFS Actions"
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --find "action" --path="/v2/nfs" | head -50
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --path="/v2/nfs"
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --path="/v2/nfs/{nfs_id}"
```

{% /tab %}
{% tab label="Haiku 4.5 · run 2 · no tree" %}

```bash
Skill
cat digitalocean/DigitalOcean-public.v2.yaml
find /Users/tora/Desktop/Projects/tree-bench-kit-v2 -name "*nfs*" -type f 2>/dev/null | head -20
cat digitalocean/resources/nfs/nfs_create.yml
cat digitalocean/resources/nfs/models/nfs_request.yml
cat digitalocean/resources/nfs/nfs_access_point_create.yml
find /Users/tora/Desktop/Projects/tree-bench-kit-v2 -name "access_point_request.yml" -type f 2>/dev/null
cat digitalocean/resources/nfs/models/access_point_request.yml
cat digitalocean/resources/nfs/responses/nfs_create.yml
cat digitalocean/resources/nfs/models/nfs_create_response.yml
cat digitalocean/resources/nfs/models/nfs_response.yml
find /Users/tora/Desktop/Projects/tree-bench-kit-v2 -name "access_point_response.yml" -type f 2>/dev/null
cat digitalocean/resources/nfs/models/access_point_response.yml
cat digitalocean/resources/nfs/nfs_get.yml
find /Users/tora/Desktop/Projects/tree-bench-kit-v2 -name "access_policy.yml" -type f 2>/dev/null
cat digitalocean/resources/nfs/models/access_policy.yml
grep -r "nfs_access_point_get" digitalocean/resources/nfs/ 2>/dev/null
cat digitalocean/resources/nfs/nfs_access_point_get.yml
```

{% /tab %}
{% tab label="Haiku 4.5 · run 2 · tree" %}

```bash
redocly tree --help
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --find="file"
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --find="nfs"
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --operation=nfs_create --with-deps
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --operation=nfs_create_access_point --with-deps
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --component=schemas --name=nfs_create_response
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --component=schemas | head -50
cat /Users/tora/bench-run/donfs-tree-help-nfsfix-haiku-r2/digitalocean/resources/nfs/models/nfs_response.yml
cat /Users/tora/bench-run/donfs-tree-help-nfsfix-haiku-r2/digitalocean/resources/nfs/models/access_point_response.yml
cat /Users/tora/bench-run/donfs-tree-help-nfsfix-haiku-r2/digitalocean/resources/nfs/models/access_policy.yml
cat /Users/tora/bench-run/donfs-tree-help-nfsfix-haiku-r2/digitalocean/resources/nfs/models/access_point_request.yml
cat /Users/tora/bench-run/donfs-tree-help-nfsfix-haiku-r2/digitalocean/resources/nfs/models/nfs_request.yml
```

{% /tab %}
{% tab label="Haiku 4.5 · run 3 · no tree" %}

```bash
Skill
cat digitalocean/DigitalOcean-public.v2.yaml
grep "paths:.*NFS|/v2/nfs|NFS|export|mount" digitalocean/DigitalOcean-public.v2.yaml | head -200
sed -n '1964,2464p' digitalocean/DigitalOcean-public.v2.yaml
find digitalocean -name "*nfs*" -type f | head -20
cat digitalocean/resources/nfs/nfs_create.yml
cat digitalocean/resources/nfs/models/nfs_request.yml
cat digitalocean/resources/nfs/models/nfs_response.yml
cat digitalocean/resources/nfs/nfs_access_point_create.yml
cat digitalocean/resources/nfs/models/access_point_request.yml
cat digitalocean/resources/nfs/models/access_policy.yml
cat digitalocean/resources/nfs/models/access_point_response.yml
```

{% /tab %}
{% tab label="Haiku 4.5 · run 3 · tree" %}

```bash
redocly tree --help
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --find "file"
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --find "volume"
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --find "space"
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --find "export"
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --find "nfs"
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --operation=post --path=/v2/nfs --with-deps
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --operation=post --path=/v2/nfs/shares --with-deps | head -100
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --path=/v2/nfs/shares/{share_id}/access_points --with-deps
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --operation=post --path=/v2/nfs/shares/{share_id}/access_points --with-deps
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --component=schemas --name=nfs_create_response
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --component=schemas --name=access_point_response | head -50
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --component=schemas | grep -i "nfs\|access"
cat /Users/tora/bench-run/donfs-tree-help-nfsfix-haiku-r3/digitalocean/resources/nfs/models/nfs_create_response.yml
cat /Users/tora/bench-run/donfs-tree-help-nfsfix-haiku-r3/digitalocean/resources/nfs/models/access_point_action_response.yml
cat /Users/tora/bench-run/donfs-tree-help-nfsfix-haiku-r3/digitalocean/resources/nfs/models/nfs_response.yml
cat /Users/tora/bench-run/donfs-tree-help-nfsfix-haiku-r3/digitalocean/resources/nfs/models/access_point_response.yml
cat /Users/tora/bench-run/donfs-tree-help-nfsfix-haiku-r3/digitalocean/resources/nfs/models/access_policy.yml
```

{% /tab %}
{% tab label="Haiku 4.5 · run 4 · no tree" %}

```bash
Skill
cat digitalocean/DigitalOcean-public.v2.yaml
grep "(volumes|storage|file|nfs|mount|export)" digitalocean/DigitalOcean-public.v2.yaml | head -100
ls /Users/tora/Desktop/Projects/tree-bench-kit-v2/specs/digitalocean/resources/nfs/*.yml
cat digitalocean/resources/nfs/nfs_create.yml
cat digitalocean/resources/nfs/models/nfs_request.yml
cat digitalocean/resources/nfs/models/nfs_response.yml
cat digitalocean/resources/nfs/nfs_access_point_create.yml
cat digitalocean/resources/nfs/models/access_point_request.yml
cat digitalocean/resources/nfs/models/access_point_response.yml
cat digitalocean/resources/nfs/models/access_policy.yml
cat digitalocean/resources/nfs/responses/access_point_create.yml
cat digitalocean/resources/nfs/nfs_get.yml
cat digitalocean/resources/nfs/responses/nfs_get.yml
cat digitalocean/resources/nfs/nfs_access_point_get.yml
```

{% /tab %}
{% tab label="Haiku 4.5 · run 4 · tree" %}

```bash
redocly tree --help
redocly tree digitalocean/DigitalOcean-public.v2.yaml --find="volume" --format=ai
redocly tree digitalocean/DigitalOcean-public.v2.yaml --find="network" --format=ai
redocly tree digitalocean/DigitalOcean-public.v2.yaml --find="nfs" --format=ai
redocly tree digitalocean/DigitalOcean-public.v2.yaml --find="file" --format=ai
redocly tree digitalocean/DigitalOcean-public.v2.yaml --operation=post --path=/v2/nfs --with-deps --format=ai
redocly tree digitalocean/DigitalOcean-public.v2.yaml --operation=post --path=/v2/nfs/shares/{share_id}/access_points --with-deps --format=ai
redocly tree digitalocean/DigitalOcean-public.v2.yaml --component=schemas --name=nfs_create_response --format=ai
redocly tree digitalocean/DigitalOcean-public.v2.yaml --component=schemas --name=access_point_response --format=ai
redocly tree digitalocean/DigitalOcean-public.v2.yaml --component=schemas --format=ai | grep -i "nfs\|access" | head -20
cat /Users/tora/bench-run/donfs-tree-help-nfsfix-haiku-r4/digitalocean/resources/nfs/models/nfs_request.yml
cat /Users/tora/bench-run/donfs-tree-help-nfsfix-haiku-r4/digitalocean/resources/nfs/responses/nfs_create.yml
cat /Users/tora/bench-run/donfs-tree-help-nfsfix-haiku-r4/digitalocean/resources/nfs/models/access_point_request.yml
cat /Users/tora/bench-run/donfs-tree-help-nfsfix-haiku-r4/digitalocean/resources/nfs/models/nfs_create_response.yml
cat /Users/tora/bench-run/donfs-tree-help-nfsfix-haiku-r4/digitalocean/resources/nfs/models/access_point_response.yml
cat /Users/tora/bench-run/donfs-tree-help-nfsfix-haiku-r4/digitalocean/resources/nfs/models/access_policy.yml
cat /Users/tora/bench-run/donfs-tree-help-nfsfix-haiku-r4/digitalocean/resources/nfs/models/nfs_response.yml
```

{% /tab %}
{% tab label="Haiku 4.5 · run 5 · no tree" %}

```bash
cat digitalocean/DigitalOcean-public.v2.yaml
cat digitalocean
ls /Users/tora/Desktop/Projects/tree-bench-kit-v2/specs/digitalocean/resources/nfs/*.yml
cat digitalocean/resources/nfs/nfs_create.yml
cat digitalocean/resources/nfs/models/nfs_request.yml
cat digitalocean/resources/nfs/nfs_access_point_create.yml
cat digitalocean/resources/nfs/models/access_point_request.yml
cat digitalocean/resources/nfs/models/nfs_response.yml
cat digitalocean/resources/nfs/models/access_point_response.yml
grep "vpc.*get|vpc.*list" digitalocean/DigitalOcean-public.v2.yaml
cat digitalocean/resources/vpcs/models/vpc_response.yml
ls /Users/tora/Desktop/Projects/tree-bench-kit-v2/specs/digitalocean/resources/vpcs/*.yml
cat digitalocean/resources/vpcs/vpcs_list.yml
cat digitalocean/resources/vpcs/responses/all_vpcs.yml
cat digitalocean/resources/nfs/responses/nfs_create.yml
cat digitalocean/resources/nfs/models/nfs_create_response.yml
cat digitalocean/resources/nfs/responses/access_point_create.yml
cat digitalocean/resources/nfs/models/access_policy.yml
```

{% /tab %}
{% tab label="Haiku 4.5 · run 5 · tree" %}

```bash
Skill
redocly tree --help
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --find="nfs"
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --operation=post --path=/v2/nfs --with-deps
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --operation=post --path=/v2/nfs/shares/{share_id}/access_points --with-deps
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --component=schemas --name=nfs_response
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --component=schemas | grep -i nfs | head -20
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --find="access_point" --with-deps | head -60
cat /Users/tora/bench-run/donfs-tree-help-nfsfix-haiku-r5/digitalocean/resources/nfs/nfs_create.yml
cat /Users/tora/bench-run/donfs-tree-help-nfsfix-haiku-r5/digitalocean/resources/nfs/responses/nfs_create.yml
cat /Users/tora/bench-run/donfs-tree-help-nfsfix-haiku-r5/digitalocean/resources/nfs/models/nfs_create_response.yml
cat /Users/tora/bench-run/donfs-tree-help-nfsfix-haiku-r5/digitalocean/resources/nfs/models/nfs_response.yml
cat /Users/tora/bench-run/donfs-tree-help-nfsfix-haiku-r5/digitalocean/resources/nfs/models/access_point_request.yml
cat /Users/tora/bench-run/donfs-tree-help-nfsfix-haiku-r5/digitalocean/resources/nfs/models/access_policy.yml
cat /Users/tora/bench-run/donfs-tree-help-nfsfix-haiku-r5/digitalocean/resources/nfs/responses/access_point_create.yml
```

{% /tab %}
{% /tabs %}

{% /tab %}
{% /tabs %}

Haiku 4.5 moves from none of five to four of five — the largest single move in the grid, and the same mechanism as the Stripe Climate tab: without the index its answers name the right calls and never say how they authenticate, and with it they quote the `security:` line back.
Sonnet 5 goes from one to three. Opus 5 passes either way and pays 44% more context through the index, because eleven NFS operations are cheap to grep and the cards arrive with the schemas attached.
Read against the previous tab, this is the second prior-contamination control in the grid: the mainstream droplet task and this one sit on the same 2,909 files, and only the corner of the API changed.

{% /tab %}

{% tab label="Cafe API" %}

**Description:** 0.04 MB in one file.

**Task:** a customer app that browses the menu, orders a coffee, and follows the order until it is ready.
Expected: `POST /oauth2/token` → `GET /menu` → `POST /orders` → `GET /orders/{orderId}`.
Trap: ordering requires an OAuth2 token with the `orders:write` scope, minted by a call the task never mentions.

{% tabs %}
{% tab label="Prompt: no tree" %}

```text
I'm building a mobile app for a cafe: the customer browses the menu, orders a coffee,
and follows that order until it's ready. Work out what the app has to call, end to end.

API description: cafe.yaml

Give me a working flow as JSON in your reply: the steps in order, what each one calls, what it
needs, and what to carry from its response into the next step. It has to work as written.
```

{% /tab %}
{% tab label="Prompt: tree" %}

```text
I'm building a mobile app for a cafe: the customer browses the menu, orders a coffee,
and follows that order until it's ready. Work out what the app has to call, end to end.

API description: cafe.yaml

The Redocly CLI is installed and its `tree` command can search the description for you.
Start with `redocly tree --help` to see what it can select, then work with `--format=ai`:
redocly tree cafe.yaml --format=ai <flags>

Give me a working flow as JSON in your reply: the steps in order, what each one calls, what it
needs, and what to carry from its response into the next step. It has to work as written.
```

{% /tab %}
{% /tabs %}

Context the run added, and the tool calls it took (medians over the working runs):

| Model           |    no tree |        tree | Difference |
| --------------- | ---------: | ----------: | ---------: |
| Sonnet 5 (n=5)  | 16,935 / 1 | 10,849 / 10 |       −36% |
| Opus 5 (n=5)    | 16,769 / 1 | 15,375 / 11 |        −8% |
| Haiku 4.5 (n=5) | 15,764 / 1 |  8,773 / 13 |       −44% |

What those runs were billed:

| Model           | no tree |  tree | Difference |
| --------------- | ------: | ----: | ---------: |
| Sonnet 5 (n=5)  |   $0.43 | $0.38 |       −12% |
| Opus 5 (n=5)    |   $0.65 | $0.65 |        −0% |
| Haiku 4.5 (n=5) |   $0.07 | $0.10 |       +43% |

Whether each run produced a flow that would run:

| Run               | no tree | tree          |
| ----------------- | ------- | ------------- |
| Sonnet 5 · run 1  | works   | works         |
| Sonnet 5 · run 2  | works   | works         |
| Sonnet 5 · run 3  | works   | works         |
| Sonnet 5 · run 4  | works   | works         |
| Sonnet 5 · run 5  | works   | works         |
| Opus 5 · run 1    | works   | works         |
| Opus 5 · run 2    | works   | works         |
| Opus 5 · run 3    | works   | works         |
| Opus 5 · run 4    | works   | works         |
| Opus 5 · run 5    | works   | works         |
| Haiku 4.5 · run 1 | works   | works         |
| Haiku 4.5 · run 2 | works   | works         |
| Haiku 4.5 · run 3 | works   | no token call |
| Haiku 4.5 · run 4 | works   | works         |
| Haiku 4.5 · run 5 | works   | no token call |

A run works when its flow contains `POST /oauth2/token`, `GET /menu`, `POST /orders` and `GET /orders/{orderId}`, all against `api.cafe.redocly.com`.

What each run ran:

{% tabs %}
{% tab label="Sonnet 5" %}

{% tabs %}
{% tab label="Sonnet 5 · run 1 · no tree" %}

```bash
cat cafe.yaml
```

{% /tab %}
{% tab label="Sonnet 5 · run 1 · tree" %}

```bash
find / -maxdepth 6 -iname "cafe.yaml" 2>/dev/null
redocly tree --help
redocly tree cafe.yaml --format=ai --operations
redocly tree cafe.yaml --format=ai --path=/menu --operation=get --with-deps
redocly tree cafe.yaml --format=ai --path=/orders --operation=post --with-deps
redocly tree cafe.yaml --format=ai --path=/orders/{orderId} --operation=get --with-deps
redocly tree cafe.yaml --format=ai --path=/oauth2/register --operation=post --with-deps
redocly tree cafe.yaml --format=ai --component=securitySchemes --name=OAuth2 --with-deps || redocly tree cafe.yaml --format=ai --find=oauth2
redocly tree cafe.yaml --format=ai --component=schemas --name=MenuItemList --with-deps
redocly tree cafe.yaml --format=ai --component=schemas --name=Beverage
redocly tree cafe.yaml --format=ai --component=schemas --name=Dessert
redocly tree cafe.yaml --format=ai --component=schemas --name=MenuBaseItem
```

{% /tab %}
{% tab label="Sonnet 5 · run 2 · no tree" %}

```bash
cat cafe.yaml
```

{% /tab %}
{% tab label="Sonnet 5 · run 2 · tree" %}

```bash
redocly tree --help
redocly tree cafe.yaml --format=ai
redocly tree cafe.yaml --format=ai --path=/menu --operation=get --with-deps
redocly tree cafe.yaml --format=ai --path=/orders --operation=post --with-deps
redocly tree cafe.yaml --format=ai --path=/orders/{orderId} --operation=get --with-deps
redocly tree cafe.yaml --format=ai --path=/oauth2/register --operation=post --with-deps
redocly tree cafe.yaml --format=ai --component=securitySchemes
redocly tree cafe.yaml --format=ai --webhook=order-notification --with-deps
redocly tree cafe.yaml --format=ai --component=securitySchemes --name=OAuth2 --with-deps
redocly tree cafe.yaml --format=ai --webhook=order-notification --operation=post --with-deps
redocly tree cafe.yaml --format=ai --component=schemas --name=Beverage
redocly tree cafe.yaml --format=ai --component=schemas --name=MenuBaseItem
```

{% /tab %}
{% tab label="Sonnet 5 · run 3 · no tree" %}

```bash
cat cafe.yaml
Artifact
```

{% /tab %}
{% tab label="Sonnet 5 · run 3 · tree" %}

```bash
redocly tree --help
find / -maxdepth 4 -iname "cafe.yaml" 2>/dev/null
redocly tree /Users/tora/Downloads/cafe.yaml --format=ai --operations
redocly tree /Users/tora/Downloads/cafe.yaml --format=ai --path=/menu --operation=get --with-deps
redocly tree /Users/tora/Downloads/cafe.yaml --format=ai --path=/orders --operation=post --with-deps
redocly tree /Users/tora/Downloads/cafe.yaml --format=ai --path=/orders/{orderId} --operation=get --with-deps
redocly tree /Users/tora/Downloads/cafe.yaml --format=ai --path=/oauth2/register --operation=post --with-deps
redocly tree /Users/tora/Downloads/cafe.yaml --format=ai --component=securitySchemes --with-deps
redocly tree /Users/tora/Downloads/cafe.yaml --format=ai --component=schemas --name=Beverage --with-deps
redocly tree /Users/tora/Downloads/cafe.yaml --format=ai --component=schemas --name=Order --with-deps
grep -n "securitySchemes\|flows\|tokenUrl\|authorizationUrl\|scopes:" /Users/tora/Downloads/cafe.yaml | head -40
sed -n '530,560p' /Users/tora/Downloads/cafe.yaml
redocly tree /Users/tora/Downloads/cafe.yaml --format=ai --path=/menu-item-images/{menuItemId} --operation=get --with-deps
redocly tree /Users/tora/Downloads/cafe.yaml --format=ai --path=/order-items --operation=get --with-deps
redocly tree /Users/tora/Downloads/cafe.yaml --format=ai --webhooks
redocly tree /Users/tora/Downloads/cafe.yaml --format=ai --webhook=order-notification --operation=post --with-deps
```

{% /tab %}
{% tab label="Sonnet 5 · run 4 · no tree" %}

```bash
cat cafe.yaml
```

{% /tab %}
{% tab label="Sonnet 5 · run 4 · tree" %}

```bash
redocly tree --help
redocly tree cafe.yaml --format=ai --operations
redocly tree cafe.yaml --format=ai --path=/menu --operation=get --with-deps
redocly tree cafe.yaml --format=ai --component=schemas --name=Beverage
redocly tree cafe.yaml --format=ai --component=schemas --name=Dessert
redocly tree cafe.yaml --format=ai --component=schemas --name=MenuBaseItem
redocly tree cafe.yaml --format=ai --path=/orders --operation=post --with-deps
redocly tree cafe.yaml --format=ai --path=/orders/{orderId} --operation=get --with-deps
redocly tree cafe.yaml --format=ai --component=securitySchemes
redocly tree cafe.yaml --format=ai --path=/oauth2/register --operation=post --with-deps
redocly tree cafe.yaml --format=ai --component=securitySchemes --name=OAuth2 --with-deps
redocly tree cafe.yaml --format=ai --component=schemas --name=Order --with-deps
redocly tree cafe.yaml --format=ai --component=schemas --name=MenuItemList
redocly tree cafe.yaml --format=ai --component=schemas --name=RegisterClientObject
redocly tree cafe.yaml --format=ai --component=schemas --name=OAuth2Client
```

{% /tab %}
{% tab label="Sonnet 5 · run 5 · no tree" %}

```bash
cat cafe.yaml
```

{% /tab %}
{% tab label="Sonnet 5 · run 5 · tree" %}

```bash
redocly tree --help
redocly tree cafe.yaml --format=ai --operations
redocly tree cafe.yaml --format=ai --path=/menu --operation=get --with-deps
redocly tree cafe.yaml --format=ai --path=/orders --operation=post --with-deps
redocly tree cafe.yaml --format=ai --path=/orders/{orderId} --operation=get --with-deps
redocly tree cafe.yaml --format=ai --path=/oauth2/register --operation=post --with-deps
redocly tree cafe.yaml --format=ai --component=securitySchemes
redocly tree cafe.yaml --format=ai --component=securitySchemes --name=OAuth2 --with-deps
redocly tree cafe.yaml --format=ai --component=schemas --name=Order --with-deps
redocly tree cafe.yaml --format=ai --component=schemas --name=Beverage --with-deps
redocly tree cafe.yaml --format=ai --path=/menu-item-images/{menuItemId} --operation=get --with-deps
# write /private/tmp/claude-501/-Users-tora-bench-run-cafe-tree-help-local-sonnet-r5/5473208f-b541-4fc2-a584-b01e0851b699/scratchpad/cafe-flow.json
```

{% /tab %}
{% /tabs %}

{% /tab %}
{% tab label="Opus 5" %}

{% tabs %}
{% tab label="Opus 5 · run 1 · no tree" %}

```bash
cat cafe.yaml
```

{% /tab %}
{% tab label="Opus 5 · run 1 · tree" %}

```bash
ls -la && redocly tree --help
redocly tree cafe.yaml --format=ai --operations
redocly tree cafe.yaml --format=ai --operation=listMenuItems --with-deps
redocly tree cafe.yaml --format=ai --operation=createOrder --with-deps; echo "=== GET ORDER ==="; redocly tree cafe.yaml --format=ai --operation=getOrderById --with-deps
cd /Users/tora/bench-run/cafe-tree-help-local-opus-r1; redocly tree cafe.yaml --format=ai --operation=registerOAuth2Client --with-deps; echo "=== SEC ==="; redocly tree cafe.yaml --format=ai --component=securitySchemes; echo "=== WEBHOOKS ==="; redocly tree cafe.yaml --format=ai --webhooks
cd /Users/tora/bench-run/cafe-tree-help-local-opus-r1; redocly tree cafe.yaml --format=ai --component=securitySchemes --name=OAuth2 --with-deps; echo "=== ORDER SCHEMA ==="; redocly tree cafe.yaml --format=ai --component=schemas --name=Order --with-deps
cd /Users/tora/bench-run/cafe-tree-help-local-opus-r1; redocly tree cafe.yaml --format=ai --component=schemas --name=MenuItem --with-deps; echo "=== PHOTO ==="; redocly tree cafe.yaml --format=ai --operation=getMenuItemPhoto --with-deps; echo "=== ROOT ==="; redocly tree cafe.yaml --format=ai | head -40
cd /Users/tora/bench-run/cafe-tree-help-local-opus-r1; redocly tree cafe.yaml --format=ai --path=/menu-item-images/{menuItemId}; echo "=== PhotoSize ==="; redocly tree cafe.yaml --format=ai --component=parameters --name=PhotoSize --with-deps; echo "=== MenuBaseItem ==="; redocly tree cafe.yaml --format=ai --component=schemas --name=MenuBaseItem
cd /Users/tora/bench-run/cafe-tree-help-local-opus-r1; redocly tree cafe.yaml --format=ai --operation=updateOrder --with-deps; echo "=== WEBHOOK ==="; redocly tree cafe.yaml --format=ai --webhook=order-notification --operation=post --with-deps
cd /Users/tora/bench-run/cafe-tree-help-local-opus-r1; redocly tree cafe.yaml --format=ai --component=schemas --name=RegisterClientObject; echo "=== Limit ==="; redocly tree cafe.yaml --format=ai --component=parameters --name=Limit; echo "=== OrderId ==="; redocly tree cafe.yaml --format=ai --component=parameters --name=OrderId; echo "=== MenuItemList ==="; redocly tree cafe.yaml --format=ai --component=schemas --name=MenuItemList
```

{% /tab %}
{% tab label="Opus 5 · run 2 · no tree" %}

```bash
cat cafe.yaml
```

{% /tab %}
{% tab label="Opus 5 · run 2 · tree" %}

```bash
ls && redocly tree --help
redocly tree cafe.yaml --format=ai --operations
redocly tree cafe.yaml --format=ai --operation=listMenuItems --with-deps | head -120
redocly tree cafe.yaml --format=ai --operation=createOrder --with-deps | head -80; echo "=========="; redocly tree cafe.yaml --format=ai --operation=getOrderById --with-deps | head -60
redocly tree cafe.yaml --format=ai --webhooks; echo "===REG==="; redocly tree cafe.yaml --format=ai --operation=registerOAuth2Client --with-deps | head -60; echo "===SEC==="; redocly tree cafe.yaml --format=ai --component=securitySchemes
redocly tree cafe.yaml --format=ai --component=securitySchemes --name=OAuth2 --with-deps; echo "===WH==="; redocly tree cafe.yaml --format=ai --webhook=order-notification --operation=post --with-deps | head -40
redocly tree cafe.yaml --format=ai --component=schemas --name=Order --with-deps | head -60
for n in MenuItem Beverage MenuBaseItem MenuItemList Page; do redocly tree cafe.yaml --format=ai --component=schemas --name=$n | head -8; echo "---"; done
redocly tree cafe.yaml --format=ai --component=schemas --name=RegisterClientObject | head -8; echo "===PHOTO==="; redocly tree cafe.yaml --format=ai --operation=getMenuItemPhoto | head -8; echo "===UPD==="; redocly tree cafe.yaml --format=ai --operation=updateOrder | head -8; echo "===LOI==="; redocly tree cafe.yaml --format=ai --operation=listOrderItems | head -8
redocly tree cafe.yaml --format=ai | head -30; echo "===OI==="; redocly tree cafe.yaml --format=ai --component=schemas --name=OrderItem|head -6; echo "===PS==="; redocly tree cafe.yaml --format=ai --component=parameters --name=PhotoSize|head -6
redocly tree cafe.yaml --format=ai --path=/menu-item-images/{menuItemId} | head -20; echo "===FILTER==="; redocly tree cafe.yaml --format=ai --component=parameters --name=Filter|head -6; echo "===LIMIT==="; redocly tree cafe.yaml --format=ai --component=parameters --name=Limit|head -6; echo "===ORDERID==="; redocly tree cafe.yaml --format=ai --component=parameters --name=OrderId|head -6
```

{% /tab %}
{% tab label="Opus 5 · run 3 · no tree" %}

```bash
cat cafe.yaml
```

{% /tab %}
{% tab label="Opus 5 · run 3 · tree" %}

```bash
ls -la && redocly tree --help
redocly tree cafe.yaml --format=ai --operations
redocly tree cafe.yaml --format=ai --operation=registerOAuth2Client --with-deps; echo "=====SEC====="; redocly tree cafe.yaml --format=ai --component=securitySchemes
redocly tree cafe.yaml --format=ai --component=securitySchemes --name=OAuth2 --with-deps; echo "===GLOBAL==="; sed -n '1,32p' cafe.yaml
redocly tree cafe.yaml --format=ai --operation=listMenuItems --with-deps; echo "=========="; redocly tree cafe.yaml --format=ai --operation=createOrder --with-deps
redocly tree cafe.yaml --format=ai --operation=getOrderById --with-deps; echo "===WEBHOOKS==="; redocly tree cafe.yaml --format=ai --webhooks
redocly tree cafe.yaml --format=ai --webhook=order-notification --operation=post --with-deps; echo "===ORDER==="; redocly tree cafe.yaml --format=ai --component=schemas --name=Order --with-deps
redocly tree cafe.yaml --format=ai --component=schemas --name=Beverage --with-deps; echo "===PHOTO==="; redocly tree cafe.yaml --format=ai --operation=getMenuItemPhoto --with-deps; echo "===PATCH==="; redocly tree cafe.yaml --format=ai --operation=updateOrder --with-deps
redocly tree cafe.yaml --format=ai --path=/menu-item-images/{menuItemId}; echo "===PARAMS==="; for p in PhotoSize Limit After OrderId Filter Search Sort; do redocly tree cafe.yaml --format=ai --component=parameters --name=$p; done
redocly tree cafe.yaml --format=ai --component=schemas --name=MenuBaseItem; echo "===RCO==="; redocly tree cafe.yaml --format=ai --component=schemas --name=RegisterClientObject; echo "===OA2C==="; redocly tree cafe.yaml --format=ai --component=schemas --name=OAuth2Client
sed -n '32,112p' /Users/tora/bench-run/cafe-tree-help-local-opus-r3/cafe.yaml
```

{% /tab %}
{% tab label="Opus 5 · run 4 · no tree" %}

```bash
cat cafe.yaml
```

{% /tab %}
{% tab label="Opus 5 · run 4 · tree" %}

```bash
ls && redocly tree --help
redocly tree cafe.yaml --format=ai | head -100
redocly tree cafe.yaml --format=ai --operation=registerOAuth2Client --with-deps | head -120; echo "=====SEC"; redocly tree cafe.yaml --format=ai --component=securitySchemes --with-deps | head -60
redocly tree cafe.yaml --format=ai --component=securitySchemes | head -30; echo "===="; sed -n '1,32p' cafe.yaml; echo "=== SECSCHEMES RAW"; grep -n "securitySchemes" -A 40 cafe.yaml | head -60
for op in listMenuItems getMenuItemPhoto createOrder getOrderById; do echo "########## $op"; redocly tree cafe.yaml --format=ai --operation=$op --with-deps; done
for op in updateOrder listOrderItems orderNotificationWebhook; do echo "########## $op"; redocly tree cafe.yaml --format=ai --operation=$op --with-deps; done; echo "###### photo raw"; sed -n '198,228p' cafe.yaml
for c in Order OrderItem Beverage Dessert MenuBaseItem Page RegisterClientObject; do echo "##### $c"; redocly tree cafe.yaml --format=ai --component=schemas --name=$c --with-deps | head -60; done
sed -n '604,640p' cafe.yaml; echo "=== params"; sed -n '778,822p' cafe.yaml; echo "=== menu filter/search desc"; sed -n '32,80p' cafe.yaml
```

{% /tab %}
{% tab label="Opus 5 · run 5 · no tree" %}

```bash
cat cafe.yaml
```

{% /tab %}
{% tab label="Opus 5 · run 5 · tree" %}

```bash
ls && redocly tree --help
redocly tree cafe.yaml --format=ai --operations
redocly tree cafe.yaml --format=ai --operation=registerOAuth2Client --with-deps; echo "=====MENU====="; redocly tree cafe.yaml --format=ai --operation=listMenuItems --with-deps
redocly tree cafe.yaml --format=ai --operation=createOrder --with-deps; echo "=====GET====="; redocly tree cafe.yaml --format=ai --operation=getOrderById --with-deps
redocly tree cafe.yaml --format=ai --webhooks; echo "=====SEC====="; redocly tree cafe.yaml --format=ai --component=securitySchemes --with-deps; echo "=====ROOT====="; redocly tree cafe.yaml --format=ai
redocly tree cafe.yaml --format=ai --component=securitySchemes --name=OAuth2 --with-deps; echo "=====ORDER====="; redocly tree cafe.yaml --format=ai --component=schemas --name=Order --with-deps
redocly tree cafe.yaml --format=ai --component=schemas --name=MenuItem --with-deps; echo "=====PHOTO====="; redocly tree cafe.yaml --format=ai --operation=getMenuItemPhoto --with-deps
redocly tree cafe.yaml --format=ai --component=parameters --name=PhotoSize --with-deps; redocly tree cafe.yaml --format=ai --component=parameters --name=OrderId --with-deps; redocly tree cafe.yaml --format=ai --component=schemas --name=MenuBaseItem --with-deps | head -40
redocly tree cafe.yaml --format=ai --webhook=order-notification --operation=post --with-deps; echo "=====PATCH====="; redocly tree cafe.yaml --format=ai --operation=updateOrder --with-deps | head -30
redocly tree cafe.yaml --format=ai --component=securitySchemes; echo "===="; redocly tree cafe.yaml --format=ai --component=schemas --name=RegisterClientObject --with-deps|head -12; echo "====LIMIT===="; redocly tree cafe.yaml --format=ai --component=parameters --name=Limit --with-deps|head -10
redocly tree cafe.yaml --format=ai --operation=listOrders | head -12
```

{% /tab %}
{% /tabs %}

{% /tab %}
{% tab label="Haiku 4.5" %}

{% tabs %}
{% tab label="Haiku 4.5 · run 1 · no tree" %}

```bash
cat cafe.yaml
```

{% /tab %}
{% tab label="Haiku 4.5 · run 1 · tree" %}

```bash
redocly tree --help
cat /Users/tora/bench-run/cafe-tree-help-local-haiku-r1
ls -la /Users/tora/bench-run/cafe-tree-help-local-haiku-r1/ | head -20
redocly tree cafe.yaml --format=ai --operations
redocly tree cafe.yaml --format=ai --path=/menu --operation=get --with-deps
redocly tree cafe.yaml --format=ai --path=/orders --operation=post --with-deps
redocly tree cafe.yaml --format=ai --path=/orders/{orderId} --operation=get --with-deps
redocly tree cafe.yaml --format=ai --component=securitySchemes
redocly tree cafe.yaml --format=ai --path=/oauth2/register --operation=post --with-deps
redocly tree cafe.yaml --format=ai --component=schemas --name=MenuItem
redocly tree cafe.yaml --format=ai --component=schemas --name=Order
redocly tree cafe.yaml --format=ai --component=schemas --name=Beverage --with-deps && echo "---" && redocly tree cafe.yaml --format=ai --component=schemas --name=Dessert --with-deps
redocly tree cafe.yaml --format=ai --component=schemas --name=MenuBaseItem
```

{% /tab %}
{% tab label="Haiku 4.5 · run 2 · no tree" %}

```bash
Skill
cat cafe.yaml
```

{% /tab %}
{% tab label="Haiku 4.5 · run 2 · tree" %}

```bash
redocly tree --help
cat /Users/tora/bench-run/cafe-tree-help-local-haiku-r2
ls -la /Users/tora/bench-run/cafe-tree-help-local-haiku-r2/ | head -20
redocly tree cafe.yaml --format=ai --operations
redocly tree cafe.yaml --format=ai --path=/menu --operation=get
redocly tree cafe.yaml --format=ai --path=/orders --operation=post
redocly tree cafe.yaml --format=ai --path=/orders/{orderId} --operation=get
redocly tree cafe.yaml --format=ai --path=/menu-item-images/{menuItemId} --operation=get
redocly tree cafe.yaml --format=ai --component=schemas --name=MenuItem
redocly tree cafe.yaml --format=ai --component=schemas --name=Order
redocly tree cafe.yaml --format=ai --component=schemas --name=Beverage
redocly tree cafe.yaml --format=ai --component=schemas --name=OrderStatus
redocly tree cafe.yaml --format=ai --component=schemas --name=MenuBaseItem
cat /Users/tora/bench-run/cafe-tree-help-local-haiku-r2/cafe.yaml
grep -n "OAuth2\|tokenUrl\|authorizationUrl" /Users/tora/bench-run/cafe-tree-help-local-haiku-r2/cafe.yaml | head -20
```

{% /tab %}
{% tab label="Haiku 4.5 · run 3 · no tree" %}

```bash
cat cafe.yaml
```

{% /tab %}
{% tab label="Haiku 4.5 · run 3 · tree" %}

```bash
redocly tree --help
cat /Users/tora/bench-run/cafe-tree-help-local-haiku-r3
redocly tree /Users/tora/bench-run/cafe-tree-help-local-haiku-r3/cafe.yaml --format=ai --operations
redocly tree /Users/tora/bench-run/cafe-tree-help-local-haiku-r3/cafe.yaml --format=ai --operation=get --path=/menu
redocly tree /Users/tora/bench-run/cafe-tree-help-local-haiku-r3/cafe.yaml --format=ai --operation=post --path=/orders
redocly tree /Users/tora/bench-run/cafe-tree-help-local-haiku-r3/cafe.yaml --format=ai --operation=get --path=/orders/{orderId}
redocly tree /Users/tora/bench-run/cafe-tree-help-local-haiku-r3/cafe.yaml --format=ai --component=schemas --name=MenuItem
redocly tree /Users/tora/bench-run/cafe-tree-help-local-haiku-r3/cafe.yaml --format=ai --operation=get --path=/menu-item-images/{menuItemId}
redocly tree /Users/tora/bench-run/cafe-tree-help-local-haiku-r3/cafe.yaml --format=ai --component=schemas --name=Beverage --with-deps
redocly tree /Users/tora/bench-run/cafe-tree-help-local-haiku-r3/cafe.yaml --format=ai --component=schemas --name=Order --with-deps
```

{% /tab %}
{% tab label="Haiku 4.5 · run 4 · no tree" %}

```bash
cat cafe.yaml
```

{% /tab %}
{% tab label="Haiku 4.5 · run 4 · tree" %}

```bash
cat /Users/tora/bench-run/cafe-tree-help-local-haiku-r4/cafe.yaml
redocly tree --help
redocly tree cafe.yaml --operations --format=ai
redocly tree cafe.yaml --path=/menu --operation=get --format=ai --with-deps
redocly tree cafe.yaml --path=/orders --operation=post --format=ai --with-deps
redocly tree cafe.yaml --path=/orders/{orderId} --operation=get --format=ai --with-deps
redocly tree cafe.yaml --component=schemas --name=MenuItem --format=ai --with-deps
```

{% /tab %}
{% tab label="Haiku 4.5 · run 5 · no tree" %}

```bash
cat cafe.yaml
```

{% /tab %}
{% tab label="Haiku 4.5 · run 5 · tree" %}

```bash
redocly tree --help
redocly tree cafe.yaml --format=ai --operations
redocly tree cafe.yaml --format=ai --path=/menu --operation=get
redocly tree cafe.yaml --format=ai --path=/orders --operation=post
redocly tree cafe.yaml --format=ai --path=/orders --operation=get
redocly tree cafe.yaml --format=ai --path=/menu-item-images --operation=get
redocly tree cafe.yaml --format=ai --path=/menu-item-images/{menuItemId} --operation=get
redocly tree cafe.yaml --format=ai --path=/orders/{orderId} --operation=get
redocly tree cafe.yaml --format=ai --component=schemas --name=Order --with-deps
redocly tree cafe.yaml --format=ai --component=schemas --name=MenuItem --with-deps
redocly tree cafe.yaml --format=ai --component=schemas --name=MenuItemList --with-deps
redocly tree cafe.yaml --format=ai --component=securitySchemes
```

{% /tab %}
{% /tabs %}

{% /tab %}
{% /tabs %}

Sonnet 5 and Opus 5 pass everything; Sonnet 5 answers with 36% less context through the index even here, where the alternative is one read of the whole file.
Haiku 4.5 passes all five control runs and drops two tree runs by losing the token call among the cards.

{% /tab %}

{% /tabs %}

## The grid in one view

How many of the five runs in each cell produced a flow that would run:

| Description      | Model     | no tree | tree |
| ---------------- | --------- | ------: | ---: |
| GitHub REST      | Sonnet 5  |     5/5 |  5/5 |
| GitHub REST      | Opus 5    |     5/5 |  5/5 |
| GitHub REST      | Haiku 4.5 |     1/5 |  0/5 |
| Billing API      | Sonnet 5  |     0/5 |  4/5 |
| Billing API      | Opus 5    |     5/5 |  5/5 |
| Billing API      | Haiku 4.5 |     0/5 |  2/5 |
| Stripe           | Sonnet 5  |     0/5 |  0/5 |
| Stripe           | Opus 5    |     4/5 |  5/5 |
| Stripe           | Haiku 4.5 |     0/5 |  0/5 |
| Stripe Climate   | Sonnet 5  |     4/5 |  5/5 |
| Stripe Climate   | Opus 5    |     5/5 |  5/5 |
| Stripe Climate   | Haiku 4.5 |     0/5 |  5/5 |
| PayPal Orders    | Sonnet 5  |     5/5 |  5/5 |
| PayPal Orders    | Opus 5    |     5/5 |  5/5 |
| PayPal Orders    | Haiku 4.5 |     1/5 |  3/5 |
| DigitalOcean     | Sonnet 5  |     0/5 |  4/5 |
| DigitalOcean     | Opus 5    |     5/5 |  5/5 |
| DigitalOcean     | Haiku 4.5 |     1/5 |  1/5 |
| DigitalOcean NFS | Sonnet 5  |     1/5 |  3/5 |
| DigitalOcean NFS | Opus 5    |     5/5 |  5/5 |
| DigitalOcean NFS | Haiku 4.5 |     0/5 |  4/5 |
| Cafe API         | Sonnet 5  |     5/5 |  5/5 |
| Cafe API         | Opus 5    |     5/5 |  5/5 |
| Cafe API         | Haiku 4.5 |     5/5 |  3/5 |

Context the run added, and the tool calls it took (medians over the working runs; ❌ marks a cell where none work, shown over all five):

| Description      | Model     |        no tree |          tree | Difference |
| ---------------- | --------- | -------------: | ------------: | ---------: |
| GitHub REST      | Sonnet 5  |    12,492 / 12 |    11,336 / 9 |        −9% |
| GitHub REST      | Opus 5    |    16,870 / 11 |   14,681 / 11 |       −13% |
| GitHub REST      | Haiku 4.5 |    13,058 / 11 |  6,880 / 7 ❌ |          — |
| Billing API      | Sonnet 5  | 12,532 / 16 ❌ |   23,098 / 20 |          — |
| Billing API      | Opus 5    |    44,355 / 39 |   35,346 / 20 |       −20% |
| Billing API      | Haiku 4.5 | 25,809 / 18 ❌ |   19,777 / 18 |          — |
| Stripe           | Sonnet 5  | 18,215 / 16 ❌ | 18,908 / 7 ❌ |        +4% |
| Stripe           | Opus 5    |    24,339 / 25 |   33,751 / 17 |       +39% |
| Stripe           | Haiku 4.5 | 35,056 / 14 ❌ | 19,929 / 9 ❌ |       −43% |
| Stripe Climate   | Sonnet 5  |     14,297 / 8 |     8,417 / 7 |       −41% |
| Stripe Climate   | Opus 5    |     14,761 / 8 |     9,888 / 8 |       −33% |
| Stripe Climate   | Haiku 4.5 |  14,305 / 8 ❌ |    9,823 / 12 |          — |
| PayPal Orders    | Sonnet 5  |     9,857 / 12 |   17,435 / 10 |       +77% |
| PayPal Orders    | Opus 5    |    18,038 / 11 |   21,656 / 20 |       +20% |
| PayPal Orders    | Haiku 4.5 |     17,624 / 9 |   19,569 / 14 |       +11% |
| DigitalOcean     | Sonnet 5  | 17,177 / 13 ❌ |   20,377 / 16 |          — |
| DigitalOcean     | Opus 5    |    23,324 / 14 |   26,045 / 19 |       +12% |
| DigitalOcean     | Haiku 4.5 |    24,968 / 19 |   19,839 / 21 |       −21% |
| DigitalOcean NFS | Sonnet 5  |    17,421 / 16 |   13,015 / 17 |       −25% |
| DigitalOcean NFS | Opus 5    |     16,427 / 8 |   23,653 / 15 |       +44% |
| DigitalOcean NFS | Haiku 4.5 | 40,843 / 15 ❌ |   12,941 / 18 |          — |
| Cafe API         | Sonnet 5  |     16,935 / 1 |   10,849 / 10 |       −36% |
| Cafe API         | Opus 5    |     16,769 / 1 |   15,375 / 11 |        −8% |
| Cafe API         | Haiku 4.5 |     15,764 / 1 |    8,773 / 13 |       −44% |

What those runs were billed:

| Description      | Model     |  no tree |     tree | Difference |
| ---------------- | --------- | -------: | -------: | ---------: |
| GitHub REST      | Sonnet 5  |    $0.39 |    $0.33 |       −15% |
| GitHub REST      | Opus 5    |    $0.63 |    $0.60 |        −5% |
| GitHub REST      | Haiku 4.5 |    $0.12 | $0.07 ❌ |          — |
| Billing API      | Sonnet 5  | $0.76 ❌ |    $0.65 |          — |
| Billing API      | Opus 5    |    $1.97 |    $1.12 |       −43% |
| Billing API      | Haiku 4.5 | $0.18 ❌ |    $0.16 |          — |
| Stripe           | Sonnet 5  | $0.59 ❌ | $0.35 ❌ |       −41% |
| Stripe           | Opus 5    |    $1.40 |    $1.16 |       −17% |
| Stripe           | Haiku 4.5 | $0.17 ❌ | $0.12 ❌ |       −29% |
| Stripe Climate   | Sonnet 5  |    $0.33 |    $0.26 |       −21% |
| Stripe Climate   | Opus 5    |    $0.57 |    $0.47 |       −18% |
| Stripe Climate   | Haiku 4.5 | $0.10 ❌ |    $0.10 |          — |
| PayPal Orders    | Sonnet 5  |    $0.40 |    $0.38 |        −5% |
| PayPal Orders    | Opus 5    |    $0.71 |    $0.93 |       +31% |
| PayPal Orders    | Haiku 4.5 |    $0.11 |    $0.12 |        +9% |
| DigitalOcean     | Sonnet 5  | $0.41 ❌ |    $0.47 |          — |
| DigitalOcean     | Opus 5    |    $0.78 |    $0.78 |        −0% |
| DigitalOcean     | Haiku 4.5 |    $0.19 |    $0.18 |        −5% |
| DigitalOcean NFS | Sonnet 5  |    $0.53 |    $0.43 |       −19% |
| DigitalOcean NFS | Opus 5    |    $0.72 |    $0.77 |        +7% |
| DigitalOcean NFS | Haiku 4.5 | $0.23 ❌ |    $0.14 |          — |
| Cafe API         | Sonnet 5  |    $0.43 |    $0.38 |       −12% |
| Cafe API         | Opus 5    |    $0.65 |    $0.65 |        −0% |
| Cafe API         | Haiku 4.5 |    $0.07 |    $0.10 |       +43% |

One hundred fifty-six of 240 runs produced a flow that passes the check: 67 of 120 without the index, 89 of 120 with it.
Four cells move from at most one working run to three or more once the index is there: Sonnet 5 on the billing API and on DigitalOcean, Haiku 4.5 on Stripe Climate and on DigitalOcean NFS. In every one of them the control runs name the right calls and never say how they authenticate.
The clearest counter-example is DigitalOcean: a description already split into 2,909 single-operation files is an index, and the command's cards cost more than reading those files directly.
Stripe splits the difference — the index cannot rescue a plan that starts from a price that does not exist yet, and only Opus 5 avoids that premise.

## What the failures were

| Reason                                                                                      | Runs |
| ------------------------------------------------------------------------------------------- | ---: |
| how a call authenticates is never stated — the key, header, or token is nowhere in the flow |   78 |
| the product (or price's product) is never created, though nothing exists yet                |   25 |
| `POST /v1/prices` is missing — the flow starts from "your price id"                         |   14 |
| no call to mint the GitHub App installation token, though the flow says it uses one         |    9 |
| the plan/price step is missing                                                              |    5 |
| no intent field                                                                             |    3 |
| no attach                                                                                   |    3 |
| no access point call                                                                        |    3 |
| no `POST /oauth2/token`, so the cafe order and its status return 401                        |    2 |
| no tracker call                                                                             |    2 |
| `POST /v2/vpcs` is missing                                                                  |    2 |
| the billing key is sent as `Authorization`, which this API rejects                          |    1 |
| the asset delete is missing                                                                 |    1 |
| no carrier field                                                                            |    1 |
| no capture call                                                                             |    1 |
| the droplet is created outside the VPC — `vpc_uuid` is never set                            |    1 |
| no share call                                                                               |    1 |
| `POST /v2/droplets` is missing                                                              |    1 |
| `POST /v2/volumes` is missing                                                               |    1 |
| `POST /v2/firewalls` is missing                                                             |    1 |

The two big classes are the same ones every earlier round found: authentication that never reaches the request, and a resource the flow depends on but never creates.
Stripe adds a sharper version of the second: the model does not miss the call, it assumes the object — "your price id" — because that is how most Stripe tutorials read.

## How this was measured

Every run is a fresh Claude Code session started from the command line with the task text as its only input, allowed to run shell commands, read files and search them.
Sessions start in a directory holding nothing but the description, outside any repository; the tree runs call a local build of PR #3005 at `0203f1081`.
Each cell holds five runs; the tables give the median over the runs whose flow works.

**context** — from the run's transcript, over the `assistant` records that carry a `message.usage`: a turn's context is `input_tokens + cache_read_input_tokens + cache_creation_input_tokens`, and the table gives the last turn's minus the first turn's.

**cost** — `total_cost_usd` as the run reports it. It moves with the prompt cache, so read it for shape.

**working** — the answer is parsed for the calls it proposes and compared with the flow the description requires: every required call, the host, the required body fields, the authentication. The check accepts any placeholder spelling — `{volume_id}`, `$VOLUME_ID`, a URL carried from an earlier response — and reports only what is nowhere in the answer.
