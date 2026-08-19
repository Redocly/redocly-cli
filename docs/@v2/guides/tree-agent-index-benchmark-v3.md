# Where the index pays and where the description already is one

{% admonition type="info" name="Pilot" %}
Measured on a build of PR #3005 at `0203f1081`: Opus 5 twice a cell, Sonnet 5 and Haiku 4.5 five times a cell.
The full grid moves to a published snapshot once one carries this build.
{% /admonition %}

The [second benchmark](./tree-agent-index-benchmark-v2.md) asked whether the flow an agent produces would actually run, over three descriptions that were all one file.
This one adds two descriptions chosen to be hard in new ways — Stripe, whose schemas are enormous, and DigitalOcean, which ships as 2,909 files with one operation each — and asks where an index still earns its place.

Five descriptions, three models, two conditions — 120 runs:

- **no tree** — the task and the path to the description. Neither `tree` nor Redocly is named.
- **tree** — the same task plus two lines: the CLI is installed, and `redocly tree --help` lists what it can select.

Every context and cost cell is the median of the runs in it whose flow works; a cell marked ❌ is one where none did, and its numbers are the median of all its runs.
A difference is printed only where both sides carry the same mark.

## The head-to-heads

{% tabs %}

{% tab label="GitHub REST · 10.0 MB" %}

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
| Opus 5 (n=2)    | 18,798 / 16 |  15,630 / 10 |       −17% |
| Haiku 4.5 (n=5) | 13,058 / 11 | 6,880 / 7 ❌ |          — |

What those runs were billed:

| Model           | no tree |     tree | Difference |
| --------------- | ------: | -------: | ---------: |
| Sonnet 5 (n=5)  |   $0.39 |    $0.33 |       −15% |
| Opus 5 (n=2)    |   $0.69 |    $0.62 |       −10% |
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

Sonnet 5 and Opus 5 pass every run on both sides, with 9% to 17% less context and fewer calls through the index.
Haiku 4.5 fails the same way each time — it declares an installation token it never mints — and its one pass came without the index.

{% /tab %}

{% tab label="Billing API · 1.3 MB" %}

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
| Opus 5 (n=2)    |    45,744 / 51 | 40,281 / 26 |       −12% |
| Haiku 4.5 (n=5) | 25,809 / 18 ❌ | 19,777 / 18 |          — |

What those runs were billed:

| Model           |  no tree |  tree | Difference |
| --------------- | -------: | ----: | ---------: |
| Sonnet 5 (n=5)  | $0.76 ❌ | $0.65 |          — |
| Opus 5 (n=2)    |    $2.38 | $1.14 |       −52% |
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

Opus 5 passes everything; the index halves its price. Sonnet 5 never passes without the index and passes four of five runs with it, and Haiku 4.5 goes from none to two — on this description the failures were always the same missing key header, and the card's `auth:` line is where that answer now comes from.
The sign flips on context for Sonnet 5 (+84%) because its five cheap control runs all produced broken flows: the working answer costs more than the broken one it replaces.

{% /tab %}

{% tab label="Stripe · 6.1 MB" %}

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
| Opus 5 (n=2)    |    24,339 / 36 |   35,908 / 18 |       +48% |
| Haiku 4.5 (n=5) | 35,056 / 14 ❌ | 19,929 / 9 ❌ |       −43% |

What those runs were billed:

| Model           |  no tree |     tree | Difference |
| --------------- | -------: | -------: | ---------: |
| Sonnet 5 (n=5)  | $0.59 ❌ | $0.35 ❌ |       −41% |
| Opus 5 (n=2)    |    $1.54 |    $1.22 |       −21% |
| Haiku 4.5 (n=5) | $0.17 ❌ | $0.12 ❌ |       −29% |

Whether each run produced a flow that would run:

| Run               | no tree                                                              | tree                                                                 |
| ----------------- | -------------------------------------------------------------------- | -------------------------------------------------------------------- |
| Sonnet 5 · run 1  | no auth scheme                                                       | no product call, no price call, no auth scheme                       |
| Sonnet 5 · run 2  | no product call, no price call, no auth scheme                       | no product call, no auth scheme                                      |
| Sonnet 5 · run 3  | no product call, no price call, no auth scheme                       | no product call, no auth scheme                                      |
| Sonnet 5 · run 4  | no product call, no price call, no auth scheme                       | no auth scheme                                                       |
| Sonnet 5 · run 5  | no auth scheme                                                       | no auth scheme                                                       |
| Opus 5 · run 1    | works                                                                | works                                                                |
| Opus 5 · run 2    | works                                                                | works                                                                |
| Haiku 4.5 · run 1 | no product call, no price call, no auth scheme                       | no product call, no price call, no subscription call                 |
| Haiku 4.5 · run 2 | no product call, no price call, no subscription call, no auth scheme | no product call, no price call, no subscription call, no auth scheme |
| Haiku 4.5 · run 3 | no product call, no price call, no auth scheme                       | no product call, no price call, no subscription call, no auth scheme |
| Haiku 4.5 · run 4 | no product call, no price call, no subscription call, no auth scheme | no product call, no price call, no subscription call, no auth scheme |
| Haiku 4.5 · run 5 | no product call, no price call, no auth scheme                       | no product call, no price call, no subscription call, no auth scheme |

A run works when its flow contains `POST /v1/products`, `POST /v1/prices` (the legacy `/v1/plans` also counts) and `POST /v1/subscriptions` naming `customer`, `items` and `trial_period_days`, authenticated with the secret key.
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

Only Opus 5 passes, on both sides. Sonnet 5 and Haiku 4.5 fail every run the same way regardless of condition: they assume a price that already exists — "items[0][price]: your price id" — although the task launches the tier from nothing, and most never say how a call authenticates.
The index does not fix a plan that starts from the wrong premise; it just makes it 41% cheaper for Sonnet 5.

{% /tab %}

{% tab label="DigitalOcean · 2,909 files" %}

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

| Model           |        no tree |           tree | Difference |
| --------------- | -------------: | -------------: | ---------: |
| Sonnet 5 (n=5)  | 18,667 / 16 ❌ | 23,276 / 20 ❌ |       +25% |
| Opus 5 (n=2)    |    19,626 / 14 |    28,664 / 26 |       +46% |
| Haiku 4.5 (n=5) |    40,107 / 17 |    15,483 / 12 |       −61% |

What those runs were billed:

| Model           |  no tree |     tree | Difference |
| --------------- | -------: | -------: | ---------: |
| Sonnet 5 (n=5)  | $0.49 ❌ | $0.54 ❌ |       +10% |
| Opus 5 (n=2)    |    $0.65 |    $0.96 |       +48% |
| Haiku 4.5 (n=5) |    $0.18 |    $0.13 |       −28% |

Whether each run produced a flow that would run:

| Run               | no tree                        | tree                                                                                           |
| ----------------- | ------------------------------ | ---------------------------------------------------------------------------------------------- |
| Sonnet 5 · run 1  | no auth scheme                 | no auth scheme                                                                                 |
| Sonnet 5 · run 2  | no attach call, no auth scheme | no auth scheme                                                                                 |
| Sonnet 5 · run 3  | no attach call, no auth scheme | no vpc call, no droplet call, no volume call, no attach call, no firewall call, no auth scheme |
| Sonnet 5 · run 4  | no attach call, no auth scheme | no auth scheme                                                                                 |
| Sonnet 5 · run 5  | no attach call                 | no attach call, no auth scheme                                                                 |
| Opus 5 · run 1    | works                          | works                                                                                          |
| Opus 5 · run 2    | works                          | works                                                                                          |
| Haiku 4.5 · run 1 | no auth scheme                 | no auth scheme                                                                                 |
| Haiku 4.5 · run 2 | works                          | no attach call, no auth scheme                                                                 |
| Haiku 4.5 · run 3 | no attach call, no auth scheme | works                                                                                          |
| Haiku 4.5 · run 4 | no auth scheme                 | no vpc call, no vpc_uuid, no auth scheme                                                       |
| Haiku 4.5 · run 5 | works                          | no attach call                                                                                 |

A run works when its flow contains `POST /v2/vpcs`, `POST /v2/droplets` with `vpc_uuid`, `POST /v2/volumes`, the attach action with `droplet_id`, and `POST /v2/firewalls` with `inbound_rules` and `droplet_ids`, under `bearer_auth`.

What each run ran:

{% tabs %}
{% tab label="Sonnet 5" %}

{% tabs %}
{% tab label="Sonnet 5 · run 1 · no tree" %}

```bash
wc -l digitalocean/DigitalOcean-public.v2.yaml
grep -n "^\\s*(/v2/vpcs|/v2/droplets|/v2/volumes|/v2/firewalls)[^/]*:" digitalocean/DigitalOcean-public.v2.yaml
grep -n "^  /v2/(vpcs|droplets|volumes|firewalls)[a-zA-Z0-9_/{}]*:" digitalocean/DigitalOcean-public.v2.yaml
awk 'NR==2493,NR==2500' digitalocean/DigitalOcean-public.v2.yaml | head -c 1
sed -n '2493,2523p' digitalocean/DigitalOcean-public.v2.yaml
SPEC_DIR=digitalocean
find "$SPEC_DIR" -path "*resources/vpcs/vpcs_create.yml" -o -path "*resources/droplets/droplets_create.yml" -o -path "*resources/volumes/volume_create.yml" -o -path "*resources/firewalls/firewalls_create.yml" 2>/dev/null
find "$SPEC_DIR" -maxdepth 3 -type d | head -50
find digitalocean/resources/volumes -maxdepth 1 -type f | sort
find digitalocean/resources/volumes -maxdepth 2 | sort
cat digitalocean/resources/vpcs/vpcs_create.yml
SPEC=digitalocean
cat "$SPEC/resources/vpcs/models/vpc.yml" 2>/dev/null | head -100
cat "$SPEC/resources/vpcs/responses/existing_vpc.yml" 2>/dev/null
cat digitalocean/resources/droplets/droplets_create.yml
cat "$SPEC/resources/droplets/models/droplet_single_create.yml"
cat "$SPEC/resources/droplets/models/droplet_create.yml"
cat "$SPEC/resources/droplets/responses/droplet_create.yml"
cat digitalocean/resources/volumes/volumes_create.yml
cat "$SPEC/resources/volumes/models/volume_base.yml"
cat "$SPEC/resources/volumes/responses/volume.yml"
cat "$SPEC/resources/volumes/models/volume_action_post_attach.yml"
cat "$SPEC/resources/volumes/volumeActions_post.yml"
cat "$SPEC/resources/volumes/volumeActions_post_byId.yml" | head -60
cat "$SPEC/resources/volumes/models/attributes.yml"
cat "$SPEC/resources/volumes/models/volume_action_post_base.yml"
cat digitalocean/resources/firewalls/firewalls_create.yml
find "$SPEC/resources/firewalls" -maxdepth 2 -type f | sort
cat "$SPEC/resources/firewalls/responses/create_firewall_response.yml" | head -30
```

{% /tab %}
{% tab label="Sonnet 5 · run 1 · tree" %}

```bash
redocly tree --help
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --tag | head -100
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --tag="VPCs"
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --tag="Droplets"
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --tag="Block Storage"
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --tag="Firewalls"
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --path="/v2/vpcs" --operation=post --with-deps
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --pointer="digitalocean/resources/vpcs/models/vpc.yml#/vpc_create"
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --pointer="digitalocean/resources/vpcs/responses/existing_vpc.yml"
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --file="digitalocean/resources/vpcs/models/vpc.yml"
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --file="digitalocean/resources/vpcs/responses/existing_vpc.yml"
find digitalocean -path "*vpcs/models/vpc.yml" -o -path "*vpcs/responses/existing_vpc.yml" 2>/dev/null
cat digitalocean/resources/vpcs/models/vpc.yml
cat digitalocean/resources/vpcs/responses/existing_vpc.yml
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --path="/v2/droplets" --operation=post --with-deps
cat digitalocean/resources/droplets/models/droplet_single_create.yml
cat digitalocean/resources/droplets/models/droplet_create.yml
cat digitalocean/resources/droplets/responses/droplet_create.yml
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --path="/v2/volumes" --operation=post --with-deps
cat digitalocean/resources/volumes/models/volume_base.yml
cat digitalocean/resources/volumes/responses/volume.yml
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --tag="Block Storage Actions"
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --path="/v2/volumes/{volume_id}/actions" --operation=post --with-deps
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --path="/v2/firewalls" --operation=post --with-deps
cat digitalocean/resources/firewalls/models/firewall_rule.yml
cat digitalocean/resources/firewalls/models/firewall.yml
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --pointer="digitalocean/resources/droplets/models/droplet.yml" | head -20
mkdir -p /private/tmp/claude-501/-Users-tora-bench-run-digitalocean-tree-help-local-sonnet-r1/8b0264c9-049e-49fc-a05d-497f5570d078/scratchpad
```

{% /tab %}
{% tab label="Sonnet 5 · run 2 · no tree" %}

```bash
grep -n "operationId:\|paths:\|  /v2/" "digitalocean/DigitalOcean-public.v2.yaml" | grep -iE "vpcs|droplets|volumes|firewalls" | head -100
awk 'NR==2493,NR==2513' "digitalocean/DigitalOcean-public.v2.yaml"
SPECDIR="digitalocean"; ls "$SPECDIR" | head; find "$SPECDIR" -iname "*vpcs_create*" -o -iname "*droplets_create*" -o -iname "*volumes_create*" -o -iname "*firewalls_create*" -o -iname "*volume_actions*"
cat digitalocean/resources/vpcs/vpcs_create.yml
cat digitalocean/resources/droplets/droplets_create.yml
cat digitalocean/resources/volumes/volumes_create.yml
SPECDIR="digitalocean"; find "$SPECDIR" -iname "*firewalls_create*" ! -path "*examples*"; find "$SPECDIR" -path "*volumes*action*" ! -path "*examples*"
cat digitalocean/resources/firewalls/firewalls_create.yml
cat digitalocean/resources/volumes/models/volume_action_post_attach.yml
SPECDIR="digitalocean"; cat "$SPECDIR/resources/droplets/models/droplet_single_create.yml" 2>/dev/null; echo ---; find "$SPECDIR/resources/droplets" -iname "*droplet_single_create*"
SPECDIR="digitalocean"
cat "$SPECDIR/resources/droplets/models/droplet_create.yml"
cat "$SPECDIR/resources/volumes/models/volume_action_post_base.yml"
grep -n "volumes/{volume_id}/actions" -A3 "$SPECDIR/DigitalOcean-public.v2.yaml"
cat "$SPECDIR/resources/vpcs/responses/existing_vpc.yml" 2>/dev/null
cat "$SPECDIR/resources/droplets/responses/droplet_create.yml" 2>/dev/null
cat "$SPECDIR/resources/volumes/responses/volume.yml" 2>/dev/null
cat "$SPECDIR/resources/firewalls/responses/create_firewall_response.yml" 2>/dev/null
```

{% /tab %}
{% tab label="Sonnet 5 · run 2 · tree" %}

```bash
redocly tree --help
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --find=vpc
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --find=volume
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --find=firewall
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --find=droplet
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --path=/v2/vpcs --operation=post --with-deps
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --path=/v2/droplets --operation=post --with-deps
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --path=/v2/volumes --operation=post --with-deps
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --path=/v2/firewalls --operation=post --with-deps
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --component=schemas --name=droplet_single_create
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --path=/v2/volumes/{volume_id}/actions --operation=post --with-deps
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --pointer="digitalocean/resources/droplets/models/droplet_single_create.yml#/"
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --pointer="digitalocean/resources/droplets/models/droplet_create.yml#/"
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --pointer="digitalocean/resources/vpcs/models/vpc.yml#/vpc_create"
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --pointer="digitalocean/resources/vpcs/responses/existing_vpc.yml#/"
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --pointer="digitalocean/resources/volumes/responses/volume.yml#/"
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --pointer="digitalocean/resources/firewalls/responses/create_firewall_response.yml#/"
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --file=digitalocean/resources/droplets/models/droplet_single_create.yml
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --file=digitalocean/resources/vpcs/models/vpc.yml
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --file=digitalocean/resources/volumes/responses/volume.yml
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --file=digitalocean/resources/firewalls/responses/create_firewall_response.yml
find / -name "DigitalOcean-public.v2.yaml" 2>/dev/null
ls **/DigitalOcean-public.v2.yaml
pwd && ls digitalocean/resources/droplets/models/ | head -30
cat /Users/tora/bench-run/digitalocean-tree-help-local-sonnet-r2/digitalocean/resources/droplets/models/droplet_single_create.yml
cat /Users/tora/bench-run/digitalocean-tree-help-local-sonnet-r2/digitalocean/resources/droplets/models/droplet_create.yml
cat /Users/tora/bench-run/digitalocean-tree-help-local-sonnet-r2/digitalocean/resources/vpcs/models/vpc.yml
cat /Users/tora/bench-run/digitalocean-tree-help-local-sonnet-r2/digitalocean/resources/volumes/responses/volume.yml
cat /Users/tora/bench-run/digitalocean-tree-help-local-sonnet-r2/digitalocean/resources/firewalls/responses/create_firewall_response.yml
cat /Users/tora/bench-run/digitalocean-tree-help-local-sonnet-r2/digitalocean/resources/droplets/responses/droplet_create.yml
Artifact
```

{% /tab %}
{% tab label="Sonnet 5 · run 3 · no tree" %}

```bash
wc -l "digitalocean/DigitalOcean-public.v2.yaml"
grep "^  /v2/(vpcs|droplets|volumes|firewalls)[a-zA-Z_/{}\\-]*:" digitalocean/DigitalOcean-public.v2.yaml
grep "^  /v2/(vpcs|droplets|volumes|firewalls)" digitalocean/DigitalOcean-public.v2.yaml
sed -n '2493,2523p' digitalocean/DigitalOcean-public.v2.yaml
SPEC_DIR="digitalocean"
ls "$SPEC_DIR/resources/vpcs/" 2>/dev/null
find "$SPEC_DIR" -iname "*vpcs_create*"
find "$SPEC_DIR" -iname "*droplets_create*"
find "$SPEC_DIR" -iname "*volumes_create*"
find "$SPEC_DIR" -iname "*volumes_actions*" -o -iname "*volume_actions*"
find "$SPEC_DIR" -iname "*firewalls_create*"
cat digitalocean/resources/vpcs/vpcs_create.yml
cat digitalocean/resources/vpcs/models/vpc.yml
cat digitalocean/resources/droplets/droplets_create.yml
cat digitalocean/resources/droplets/models/droplet_single_create.yml
cat digitalocean/resources/droplets/models/droplet_create.yml
cat digitalocean/resources/volumes/volumes_create.yml
cat digitalocean/resources/firewalls/firewalls_create.yml
cat digitalocean/resources/vpcs/responses/existing_vpc.yml
cat digitalocean/resources/droplets/responses/droplet_create.yml
cat "$SPEC_DIR/resources/volumes/models/volumes_ext4.yml" 2>/dev/null
find "$SPEC_DIR/resources/volumes/models" -iname "*.yml" | xargs -I{} echo {}
cat digitalocean/resources/volumes/responses/volume.yml
cat digitalocean/resources/firewalls/responses/create_firewall_response.yml
# write /private/tmp/claude-501/-Users-tora-bench-run-digitalocean-control-v3-sonnet-r3/dd20ee58-0e25-4aed-b110-a20ef254e734/scratchpad/deploy_flow.json
```

{% /tab %}
{% tab label="Sonnet 5 · run 3 · tree" %}

```bash
redocly tree --help
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --find "vpc" | head -100
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --find "droplet create" | head -50
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --find "volume" | head -60
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --find "firewall" | head -60
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --path=/v2/vpcs --operation=post --with-deps
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --pointer="digitalocean/resources/vpcs/models/vpc.yml#/vpc_create"
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --pointer="digitalocean/resources/vpcs/responses/existing_vpc.yml"
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --file digitalocean/resources/vpcs/models/vpc.yml
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --file digitalocean/resources/vpcs/responses/existing_vpc.yml
find / -path "*/digitalocean/resources/vpcs/models/vpc.yml" 2>/dev/null
ls digitalocean | head; echo "---"; ls digitalocean/resources/vpcs
cat /Users/tora/bench-run/digitalocean-tree-help-local-sonnet-r3/digitalocean/resources/vpcs/models/vpc.yml
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --path=/v2/droplets --operation=post --with-deps
cat /Users/tora/bench-run/digitalocean-tree-help-local-sonnet-r3/digitalocean/resources/droplets/models/droplet_create.yml
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --path=/v2/volumes --operation=post --with-deps | head -20
cat /Users/tora/bench-run/digitalocean-tree-help-local-sonnet-r3/digitalocean/resources/volumes/models/volume_base.yml
cat /Users/tora/bench-run/digitalocean-tree-help-local-sonnet-r3/digitalocean/resources/volumes/models/volumes_ext4.yml
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --path=/v2/firewalls --operation=post --with-deps | head -20
cat /Users/tora/bench-run/digitalocean-tree-help-local-sonnet-r3/digitalocean/resources/firewalls/models/firewall_rule.yml
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --file digitalocean/resources/droplets/responses/droplet_create.yml
cat digitalocean/resources/droplets/responses/droplet_create.yml
cat digitalocean/resources/volumes/responses/volume.yml | head -20
cat digitalocean/resources/vpcs/responses/existing_vpc.yml | head -20
true
```

{% /tab %}
{% tab label="Sonnet 5 · run 4 · no tree" %}

```bash
wc -l digitalocean/DigitalOcean-public.v2.yaml
grep "^  /v2/(vpcs|droplets|volumes|firewalls)" digitalocean/DigitalOcean-public.v2.yaml
sed -n '1301,1371p' digitalocean/DigitalOcean-public.v2.yaml
find digitalocean -iname "*vpcs_create*" -o -iname "*volumes_create*" -o -iname "*droplets_create*" -o -iname "*firewalls_create*" -o -iname "*volumeAction*"
cat digitalocean/resources/vpcs/vpcs_create.yml
cat digitalocean/resources/volumes/volumes_create.yml
cat digitalocean/resources/droplets/droplets_create.yml
cat digitalocean/resources/firewalls/firewalls_create.yml
cat digitalocean/resources/volumes/volumeActions_post.yml
find digitalocean/resources/droplets/models -iname "*single_create*"; echo ---; cat digitalocean/resources/droplets/models/droplet_single_create.yml 2>/dev/null
cat digitalocean/resources/droplets/models/droplet_create.yml
cat digitalocean/resources/vpcs/responses/existing_vpc.yml 2>/dev/null; echo ---MODEL---; find digitalocean/resources/vpcs/models -iname "vpc.yml" -exec cat {} \;
cat digitalocean/resources/volumes/responses/volume.yml 2>/dev/null; echo ---; find digitalocean/resources/volumes/models -iname "volume.yml" -exec cat {} \; | head -40
cat digitalocean/resources/droplets/responses/droplet_create.yml 2>/dev/null | head -60
grep -n "^  id:" -A2 digitalocean/resources/droplets/models/droplet.yml | head -5
# write /private/tmp/claude-501/-Users-tora-bench-run-digitalocean-control-v3-sonnet-r4/2738237b-4581-40e6-a474-eb850287a173/scratchpad/deploy_flow.json
```

{% /tab %}
{% tab label="Sonnet 5 · run 4 · tree" %}

```bash
redocly tree --help
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --find=vpc | head -100
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --operation=droplets_create --with-deps | head -150
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --component=schemas --name=droplet_single_create | head -100
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --pointer=digitalocean/resources/droplets/models/droplet_single_create.yml | head -150
cat digitalocean/resources/droplets/models/droplet_single_create.yml
cat digitalocean/resources/droplets/models/droplet_create.yml
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --find="volume" | head -40
cat digitalocean/resources/volumes/volumes_create.yml | head -60
find digitalocean/resources/volumes -iname "*create*"
cat digitalocean/resources/volumes/models/volumes_ext4.yml
find digitalocean/resources/volumes/models -iname "*.yml" | xargs -I{} echo {}
cat digitalocean/resources/volumes/models/volume_action_post_attach.yml
cat digitalocean/resources/volumes/volumeActions_post_byId.yml
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --find="firewall create" | head -30
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --path=/v2/firewalls --operation=post --with-deps | head -100
cat digitalocean/resources/vpcs/vpcs_create.yml | head -40
cat digitalocean/resources/droplets/responses/droplet_create.yml
cat digitalocean/resources/volumes/responses/volume.yml
cat digitalocean/resources/firewalls/responses/create_firewall_response.yml
cat digitalocean/resources/vpcs/responses/existing_vpc.yml
cat digitalocean/resources/vpcs/models/vpc.yml | head -30
grep -n "vpc_create" -A10 digitalocean/resources/vpcs/models/vpc.yml
```

{% /tab %}
{% tab label="Sonnet 5 · run 5 · no tree" %}

```bash
wc -l digitalocean/DigitalOcean-public.v2.yaml
grep "^  /v2/(vpcs|droplets|volumes|firewalls)" digitalocean/DigitalOcean-public.v2.yaml
sed -n '2493,2523p' digitalocean/DigitalOcean-public.v2.yaml
cd digitalocean
for f in resources/vpcs/vpcs_create.yml resources/droplets/droplets_create.yml resources/volumes/volumes_create.yml resources/firewalls/firewalls_create.yml; do
find . -iname "$(basename $f)" 2>/dev/null
done
cat digitalocean/resources/vpcs/vpcs_create.yml
cat digitalocean/resources/droplets/droplets_create.yml
cat digitalocean/resources/volumes/volumes_create.yml
cat digitalocean/resources/firewalls/firewalls_create.yml
cat resources/droplets/models/droplet_create.yml
```

{% /tab %}
{% tab label="Sonnet 5 · run 5 · tree" %}

```bash
redocly tree --help
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --tag
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --tag="VPCs"
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --tag="Droplets"
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --tag="Block Storage"
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --tag="Firewalls"
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --tag="Block Storage Actions"
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --path=/v2/vpcs --operation=post --with-deps
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --component=schemas --name=vpc | head -60
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --pointer="digitalocean/resources/vpcs/responses/existing_vpc.yml"
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --file=digitalocean/resources/vpcs/models/vpc.yml
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --file=digitalocean/resources/vpcs/responses/existing_vpc.yml
cat /Users/tora/bench-run/digitalocean-tree-help-local-sonnet-r5/digitalocean/resources/vpcs/models/vpc.yml
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --path=/v2/droplets --operation=post --with-deps
cat /Users/tora/bench-run/digitalocean-tree-help-local-sonnet-r5/digitalocean/resources/droplets/models/droplet_create.yml
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --path=/v2/volumes --operation=post --with-deps
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --path=/v2/firewalls --operation=post --with-deps
cat /Users/tora/bench-run/digitalocean-tree-help-local-sonnet-r5/digitalocean/resources/firewalls/models/firewall_rule.yml
cat /Users/tora/bench-run/digitalocean-tree-help-local-sonnet-r5/digitalocean/resources/droplets/responses/droplet_create.yml
cat /Users/tora/bench-run/digitalocean-tree-help-local-sonnet-r5/digitalocean/resources/volumes/responses/volume.yml
```

{% /tab %}
{% /tabs %}

{% /tab %}
{% tab label="Opus 5" %}

{% tabs %}
{% tab label="Opus 5 · run 1 · no tree" %}

```bash
ls digitalocean/ && wc -l digitalocean/DigitalOcean-public.v2.yaml
grep -n "^  /v2/(vpcs|droplets|volumes|firewalls|actions|sizes|images|regions)[^:]*:" digitalocean/DigitalOcean-public.v2.yaml
sed -n '2453,2530p' DigitalOcean-public.v2.yaml && ls resources | head -50
cat vpcs/vpcs_create.yml && echo ==== && cat volumes/volumes_create.yml && echo ==== && cat volumes/volumeActions_post_byId.yml && echo ==== && cat firewalls/firewalls_create.yml
for f in vpcs/models/vpc.yml volumes/volumes_create.yml volumes/volumeActions_post_byId.yml firewalls/firewalls_create.yml; do echo "=== $f"; cat $f; done
for f in volumes/models/volumes_ext4.yml volumes/models/volume_action_post_attach.yml volumes/models/volume_action_post_base.yml droplets/models/droplet_create.yml; do echo "=== $f"; cat $f 2>/dev/null; done; ls volumes/models droplets/models firewalls/models
for f in droplets/models/droplet_single_create.yml firewalls/models/firewall.yml firewalls/models/firewall_rule.yml droplets/droplets_create.yml firewalls/responses/create_firewall_response.yml volumes/responses/volumeAction.yml; do echo "=== $f"; cat $f; done
sed -n '1,80p' droplets/responses/droplet_create.yml; echo "=== example"; sed -n '/droplet_create_response/,/^[a-z_]*:$/p' droplets/examples.yml | head -80
cat shared/models/action_link.yml; echo "=== droplet actions get"; cat resources/droplets/dropletActions_get.yml 2>/dev/null | head -30; ls resources/droplets | grep -i action
```

{% /tab %}
{% tab label="Opus 5 · run 1 · tree" %}

```bash
redocly tree --help | head -60; ls
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --find "vpc" | head -50
cd /Users/tora/bench-run/digitalocean-tree-help-local-opus-r1; redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --operation=vpcs_create --with-deps | head -120
cd /Users/tora/bench-run/digitalocean-tree-help-local-opus-r1; redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --file=digitalocean/resources/vpcs/models/vpc.yml | head -60
cd /Users/tora/bench-run/digitalocean-tree-help-local-opus-r1; redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --pointer="digitalocean/resources/vpcs/models/vpc.yml#/vpc_create"|head -40; echo ===; redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --pointer="digitalocean/resources/vpcs/models/vpc.yml#/vpc_updatable"|head -40; echo ===; redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --pointer="digitalocean/resources/vpcs/responses/existing_vpc.yml"|head -40
cd /Users/tora/bench-run/digitalocean-tree-help-local-opus-r1; for p in 'digitalocean/resources/vpcs/models/vpc.yml#/vpc_create' 'digitalocean/resources/vpcs/models/vpc.yml#/vpc_updatable' 'digitalocean/resources/vpcs/responses/existing_vpc.yml'; do echo "### $p"; redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --pointer="$p" --with-deps|head -30; done
cd /Users/tora/bench-run/digitalocean-tree-help-local-opus-r1/digitalocean/resources; sed -n 1,120p vpcs/models/vpc.yml; echo "=== existing_vpc"; cat vpcs/responses/existing_vpc.yml
cd /Users/tora/bench-run/digitalocean-tree-help-local-opus-r1; for f in "volume" "firewall" "ssh key"; do echo "### $f"; redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --find="$f"|head -30; done
cd /Users/tora/bench-run/digitalocean-tree-help-local-opus-r1; for op in droplets_create volumes_create volumeActions_post_byId firewalls_create; do echo "###### $op"; redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --operation=$op --with-deps|head -40; done
cd /Users/tora/bench-run/digitalocean-tree-help-local-opus-r1/digitalocean/resources; echo "=== droplet_single_create"; cat droplets/models/droplet_single_create.yml; echo "=== droplet_create.yml(model)"; sed -n 1,200p droplets/models/droplet_create.yml
cd /Users/tora/bench-run/digitalocean-tree-help-local-opus-r1/digitalocean/resources; echo "=== volumes_ext4"; cat volumes/models/volumes_ext4.yml; echo "=== volume_base"; cat volumes/models/volume_base.yml; echo "=== attributes"; sed -n 1,80p volumes/models/attributes.yml
cd /Users/tora/bench-run/digitalocean-tree-help-local-opus-r1/digitalocean/resources; echo "=== attach"; cat volumes/models/volume_action_post_attach.yml; echo "=== base"; cat volumes/models/volume_action_post_base.yml; echo "=== volumeAction resp"; cat volumes/responses/volumeAction.yml; echo "=== firewall model"; sed -n 1,200p firewalls/models/firewall.yml
cd /Users/tora/bench-run/digitalocean-tree-help-local-opus-r1/digitalocean/resources; sed -n 1,140p firewalls/models/firewall_rule.yml
cd /Users/tora/bench-run/digitalocean-tree-help-local-opus-r1; cat digitalocean/resources/droplets/responses/droplet_create.yml; echo "=== firewall resp"; cat digitalocean/resources/firewalls/responses/create_firewall_response.yml; echo "=== action_link"; cat digitalocean/shared/models/action_link.yml; echo; redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --find="action status"|head -20
cd /Users/tora/bench-run/digitalocean-tree-help-local-opus-r1; for op in actions_get droplets_get volumeActions_get sshKeys_create; do echo "##### $op"; redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --operation=$op|sed -n 1,6p; done; echo "=== ssh model"; cat digitalocean/resources/ssh_keys/models/sshKeys.yml 2>/dev/null | head -50
cd /Users/tora/bench-run/digitalocean-tree-help-local-opus-r1; redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai|head -20; echo "=== action model"; sed -n 1,60p digitalocean/resources/actions/models/action.yml
```

{% /tab %}
{% tab label="Opus 5 · run 2 · no tree" %}

```bash
ls digitalocean/ && wc -l digitalocean/DigitalOcean-public.v2.yaml
grep -n "^  /v2/(vpcs|droplets|volumes|firewalls|actions|account/keys)[^:]*:" digitalocean/DigitalOcean-public.v2.yaml
cd digitalocean; sed -n '2453,2500p;1301,1315p;1410,1420p;2493,2500p;764,770p' DigitalOcean-public.v2.yaml
cd digitalocean/resources; ls; ls vpcs volumes firewalls droplets 2>/dev/null
cd digitalocean/resources; cat vpcs/vpcs_create.yml; echo ===; ls vpcs/models; cat vpcs/models/*.yml 2>/dev/null | head -80
cd digitalocean/resources; cat volumes/volumes_create.yml; echo ===MODELS; ls volumes/models; echo ===ATTACH; cat volumes/volumeActions_post_byId.yml
cd digitalocean/resources; cat vpcs/models/vpc.yml; echo "--- attributes:"; ls vpcs/attributes; cat vpcs/responses/existing_vpc.yml
cd digitalocean/resources; cat volumes/models/volumes_ext4.yml; echo "--- ATTACH BYID"; cat volumes/volumeActions_post_byId.yml; echo "--- MODELS"; ls volumes/models
cd digitalocean/resources; cat droplets/droplets_create.yml | head -60; echo "--- MODELS"; ls droplets/models; echo "--- single create model"; sed -n '1,200p' droplets/models/droplet_single_create.yml 2>/dev/null
cd digitalocean/resources; cat firewalls/firewalls_create.yml; echo "--- MODELS"; ls firewalls/models; cat firewalls/models/*.yml | head -160
cd digitalocean/resources; cat droplets/models/droplet_create.yml
cd digitalocean/resources; cat droplets/responses/droplet_create.yml; echo "--- ACTIONS GET"; cat actions/actions_get.yml; echo "--- ACTION MODEL"; cat actions/models/*.yml 2>/dev/null | head -70
cd digitalocean/resources; sed -n '740,760p' ../DigitalOcean-public.v2.yaml; echo "--- SSHKEYS"; ls ssh_zzz 2>/dev/null; cat ssh_keys/sshKeys_list.yml | head -25; echo "--- KEY MODEL"; cat ssh_keys/models/*.yml | head -40
cd digitalocean/resources; grep -n -A12 "status:" droplets/models/droplet.yml | head -40; echo "--- VOLUME BASE READ"; cat volumes/models/volume_base_read.yml | head -40; echo "--- VOLACTION RESP"; cat volumes/responses/volumeAction.yml
```

{% /tab %}
{% tab label="Opus 5 · run 2 · tree" %}

```bash
redocly tree --help | head -80
ls && ls digitalocean | head
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --find "vpc" | head -60
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --find "firewall" | head -60
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --find "volume" | head -40
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --tag=Droplets | head -40
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --operation=vpcs_create --with-deps | head -120
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --operation=volumes_create --with-deps | head -160
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --operation=droplets_create --with-deps | head -60
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --operation=firewalls_create --with-deps | head -60
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --file=digitalocean/resources/droplets/models/droplet_single_create.yml --with-deps | head -60; echo ====; redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --file=digitalocean/resources/vpcs/models/vpc.yml --with-deps | head -40
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --file=digitalocean/resources/volumes/models/volumes_ext4.yml --with-deps | head -60; echo ====; redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --operation=volumeActions_post_byId --with-deps | head -40
for f in digitalocean/resources/droplets/models/droplet_single_create.yml digitalocean/resources/vpcs/models/vpc.yml; do echo "=== $f"; redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --file=$f | head -40; done
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --operation=volumeActions_post_byId --with-deps | head -40
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --pointer="digitalocean/resources/droplets/models/droplet_single_create.yml" | head -60
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --pointer="digitalocean/resources/vpcs/models/vpc.yml#/vpc_create" | head -40
cat droplets/models/droplet_single_create.yml && echo "=== droplet_create" && cat droplets/models/droplet_create.yml
cat vpcs/models/vpc.yml && echo "=== volumes_ext4" && cat volumes/models/volumes_ext4.yml && echo "=== volume_base" && cat volumes/models/volume_base.yml
cat firewalls/models/firewall.yml && echo "=== rule" && cat firewalls/models/firewall_rule.yml
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --find "actions" | head -20; echo "=== droplet_create response"; cat droplets/responses/droplet_create.yml; echo "=== action_link"; cat ../shared/models/action_link.yml
cat volumes/models/volume_action_post_attach.yml; echo "=== base"; cat volumes/models/volume_action_post_base.yml; echo "=== resp"; cat volumes/responses/volumeAction.yml
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --tag=Actions | head -20
cat actions/models/action.yml | head -50; echo "=== fw resp"; cat firewalls/responses/create_firewall_response.yml; echo "=== vpc resp"; cat vpcs/responses/existing_vpc.yml
head -40 actions/models/action.yml; echo "=== fw resp"; head -30 firewalls/responses/create_firewall_response.yml; echo "=== vpc resp"; head -30 vpcs/responses/existing_vpc.yml
head -25 volumes/responses/volume.yml
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
grep "/v2/vpcs|/v2/volumes|/v2/droplets|/v2/firewalls" digitalocean/DigitalOcean-public.v2.yaml | head -50
sed -n '2493,2793p' digitalocean/DigitalOcean-public.v2.yaml
find digitalocean/resources -name "*vpc*.yml" -o -name "*droplet*.yml" -o -name "*volume*.yml" -o -name "*firewall*.yml" | head -20
cat digitalocean/resources/vpcs/vpcs_create.yml
cat digitalocean/resources/droplets/droplets_create.yml
find digitalocean/resources -path "*/volumes/*" -name "*.yml" | grep -E "(create|attach)" | head -10
sed -n '2453,2493p' digitalocean/DigitalOcean-public.v2.yaml
cat digitalocean/resources/volumes/volumes_create.yml
cat digitalocean/resources/volumes/volumeActions_post_byId.yml
cat digitalocean/resources/firewalls/firewalls_create.yml
```

{% /tab %}
{% tab label="Haiku 4.5 · run 1 · tree" %}

```bash
redocly tree --help
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --find="network" | head -50
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --find="droplet" | head -50
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --find="volume" | head -50
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --find="firewall" | head -50
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --find="vpc" | head -50
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --path=/v2/vpcs --operation=post --with-deps
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --path=/v2/droplets --operation=post --with-deps
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --path=/v2/volumes --operation=post --with-deps | head -60
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --operation=volumeActions_post_byId --with-deps | head -60
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --path=/v2/firewalls --operation=post --with-deps | head -80
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --operation=firewalls_add_rules --with-deps | head -60
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --operation=firewalls_assign_droplets --with-deps | head -60
```

{% /tab %}
{% tab label="Haiku 4.5 · run 2 · no tree" %}

```bash
Skill
cat digitalocean/DigitalOcean-public.v2.yaml
grep "(VPC|Virtual Private Cloud|Droplets|Volumes|Firewalls|Block Storage)" digitalocean/DigitalOcean-public.v2.yaml | head -100
grep -n "^paths:" digitalocean/DigitalOcean-public.v2.yaml
sed -n '730,1030p' digitalocean/DigitalOcean-public.v2.yaml
grep -n "^  /v2/\(vpcs\|droplets\|volumes\|firewalls\)" digitalocean/DigitalOcean-public.v2.yaml | head -40
sed -n '2493,2593p' digitalocean/DigitalOcean-public.v2.yaml
find digitalocean/resources -name "*vpc*create*" -o -name "*droplet*create*" -o -name "*volume*create*" -o -name "*firewall*create*" | head -10
cat digitalocean/resources/vpcs/vpcs_create.yml
cat digitalocean/resources/droplets/droplets_create.yml
cat digitalocean/resources/volumes/volumes_create.yml
cat digitalocean/resources/firewalls/firewalls_create.yml
cat digitalocean/resources/volumes
find digitalocean/resources/volumes -name "*attach*"
grep -n "volumeActions_attach" digitalocean/DigitalOcean-public.v2.yaml | head -5
sed -n '2461,2491p' digitalocean/DigitalOcean-public.v2.yaml
cat digitalocean/resources/volumes/volumeActions_post_byId.yml
```

{% /tab %}
{% tab label="Haiku 4.5 · run 2 · tree" %}

```bash
redocly tree --help
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --find "droplet" | head -50
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --find "network" | head -50
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --find "firewall" | head -50
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --find "volume" | head -50
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --path=/v2/vpcs --operation=post
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --path=/v2/volumes --operation=post
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --path=/v2/firewalls --operation=post
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --path=/v2/droplets --operation=post
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --path=/v2/volumes/{volume_id}/actions --operation=post
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --component=schemas --name=droplet_single_create
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --path=/v2/firewalls/{firewall_id}/droplets --operation=post
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --component=schemas | grep -i droplet
find digitalocean -name "*droplet*create*" -type f | head -5
find digitalocean -name "*vpc*" -type f | head -5
cat /Users/tora/bench-run/digitalocean-tree-help-local-haiku-r2/digitalocean/resources/droplets/models/droplet_single_create.yml
cat /Users/tora/bench-run/digitalocean-tree-help-local-haiku-r2/digitalocean/resources/vpcs/models/vpc.yml
cat /Users/tora/bench-run/digitalocean-tree-help-local-haiku-r2/digitalocean/resources/droplets/models/droplet_create.yml
```

{% /tab %}
{% tab label="Haiku 4.5 · run 3 · no tree" %}

```bash
Skill
cat digitalocean/DigitalOcean-public.v2.yaml
grep "/v2/volumes" digitalocean/DigitalOcean-public.v2.yaml
grep "/v2/vpcs" digitalocean/DigitalOcean-public.v2.yaml
sed -n '2450,2550p' digitalocean/DigitalOcean-public.v2.yaml
```

{% /tab %}
{% tab label="Haiku 4.5 · run 3 · tree" %}

```bash
Skill
redocly tree --help
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --find "droplet" 2>/dev/null | head -50
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --find "vpc\|volume\|firewall" 2>/dev/null | head -80
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --find "vpc" 2>/dev/null
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --find "volume" 2>/dev/null
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --find "firewall" 2>/dev/null
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --operation=vpcs_create --with-deps 2>/dev/null | head -100
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --operation=droplets_create --with-deps 2>/dev/null | head -100
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --operation=volumes_create --with-deps 2>/dev/null | head -80
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --operation=firewalls_create --with-deps 2>/dev/null | head -100
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --operation=volumeActions_post_byId 2>/dev/null | head -80
```

{% /tab %}
{% tab label="Haiku 4.5 · run 4 · no tree" %}

```bash
cat digitalocean/DigitalOcean-public.v2.yaml
```

{% /tab %}
{% tab label="Haiku 4.5 · run 4 · tree" %}

```bash
redocly tree --help
ls -la digitalocean/DigitalOcean-public.v2.yaml
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --find="droplet" | head -50
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --find="volume" | head -50
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --find="firewall" | head -50
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --path=/v2/droplets --operation=post --with-deps
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --path=/v2/volumes --operation=post --with-deps
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --find="attach" | grep -i volume
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --path=/v2/volumes --operation=post
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --path=/v2/firewalls --operation=post --with-deps
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --operation=volumeActions_post_byId --with-deps
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --path=/v2/firewalls --operation=post --with-deps | grep -A 50 "assign"
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --operation=firewalls_assign_droplets --with-deps
```

{% /tab %}
{% tab label="Haiku 4.5 · run 5 · no tree" %}

```bash
Skill
cat digitalocean/DigitalOcean-public.v2.yaml
grep "/v2/vpcs|/v2/droplets|/v2/volumes|/v2/firewalls" digitalocean | head -100
cat digitalocean/resources/vpcs/examples/curl/vpcs_create.yml
cat digitalocean/resources/droplets/examples/curl/droplets_create.yml
cat digitalocean/resources/volumes/examples/curl/volumes_create.yml
cat digitalocean/resources/volumes/examples/curl/volumeActions_attach.yml
cat digitalocean/resources/firewalls/examples/curl/firewalls_create.yml
cat digitalocean/resources/vpcs/vpcs_create.yml
cat digitalocean/resources/droplets/droplets_create.yml
```

{% /tab %}
{% tab label="Haiku 4.5 · run 5 · tree" %}

```bash
Skill
redocly tree --help
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --find="vpc network private"
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --find="network"
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --find="droplet"
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --find="volume"
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --find="firewall"
redocly tree digitalocean/DigitalOcean-public.v2.yaml --operation=vpcs_create --with-deps
cat /Users/tora/bench-run/digitalocean-tree-help-local-haiku-r5/digitalocean/resources/vpcs/vpcs_create.yml
cat /Users/tora/bench-run/digitalocean-tree-help-local-haiku-r5/digitalocean/resources/vpcs/responses/existing_vpc.yml
cat /Users/tora/bench-run/digitalocean-tree-help-local-haiku-r5/digitalocean/resources/droplets/droplets_create.yml
cat /Users/tora/bench-run/digitalocean-tree-help-local-haiku-r5/digitalocean/resources/droplets/models/droplet_single_create.yml
cat /Users/tora/bench-run/digitalocean-tree-help-local-haiku-r5/digitalocean/resources/droplets/models/droplet_create.yml
cat /Users/tora/bench-run/digitalocean-tree-help-local-haiku-r5/digitalocean/resources/volumes/volumes_create.yml
cat /Users/tora/bench-run/digitalocean-tree-help-local-haiku-r5/digitalocean/resources/volumes/models/volumes_ext4.yml
cat /Users/tora/bench-run/digitalocean-tree-help-local-haiku-r5/digitalocean/resources/firewalls/firewalls_create.yml
cat /Users/tora/bench-run/digitalocean-tree-help-local-haiku-r5/digitalocean/resources/firewalls/models/firewall.yml
cat /Users/tora/bench-run/digitalocean-tree-help-local-haiku-r5/digitalocean/resources/firewalls/models/firewall_rule.yml
cat /Users/tora/bench-run/digitalocean-tree-help-local-haiku-r5/digitalocean/resources/firewalls/firewalls_assign_droplets.yml
```

{% /tab %}
{% /tabs %}

{% /tab %}
{% /tabs %}

Opus 5 passes on both sides and pays 46% more context through the index — 2,909 single-operation files named by what they do already are an index, and `cat vpcs/vpcs_create.yml` beats any card.
Sonnet 5 never passes: it skips the volume-attach action or leaves every call unauthenticated. Haiku 4.5 lands two of five without the index and one with it.

{% /tab %}

{% tab label="Cafe API · 41 KB" %}

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
| Opus 5 (n=2)    | 16,769 / 1 | 15,375 / 11 |        −8% |
| Haiku 4.5 (n=5) | 15,764 / 1 |  8,773 / 13 |       −44% |

What those runs were billed:

| Model           | no tree |  tree | Difference |
| --------------- | ------: | ----: | ---------: |
| Sonnet 5 (n=5)  |   $0.43 | $0.38 |       −12% |
| Opus 5 (n=2)    |   $0.43 | $0.65 |       +51% |
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

Sonnet 5 and Opus 5 pass everything; Sonnet 5 answers with 36% less context through the index even here, where the alternative is one read of a 41 KB file.
Haiku 4.5 passes all five control runs and drops two tree runs by losing the token call among the cards.

{% /tab %}

{% /tabs %}

## The grid in one view

| Description  | Model     |        no tree |           tree | Δ ctx | no tree $ |   tree $ | works | works |
| ------------ | --------- | -------------: | -------------: | ----: | --------: | -------: | ----: | ----: |
| GitHub REST  | Sonnet 5  |    12,492 / 12 |     11,336 / 9 |   −9% |     $0.39 |    $0.33 |   5/5 |   5/5 |
| GitHub REST  | Opus 5    |    18,798 / 16 |    15,630 / 10 |  −17% |     $0.69 |    $0.62 |   2/2 |   2/2 |
| GitHub REST  | Haiku 4.5 |    13,058 / 11 |   6,880 / 7 ❌ |     — |     $0.12 | $0.07 ❌ |   1/5 |   0/5 |
| Billing API  | Sonnet 5  | 12,532 / 16 ❌ |    23,098 / 20 |     — |  $0.76 ❌ |    $0.65 |   0/5 |   4/5 |
| Billing API  | Opus 5    |    45,744 / 51 |    40,281 / 26 |  −12% |     $2.38 |    $1.14 |   2/2 |   2/2 |
| Billing API  | Haiku 4.5 | 25,809 / 18 ❌ |    19,777 / 18 |     — |  $0.18 ❌ |    $0.16 |   0/5 |   2/5 |
| Stripe       | Sonnet 5  | 18,215 / 16 ❌ |  18,908 / 7 ❌ |   +4% |  $0.59 ❌ | $0.35 ❌ |   0/5 |   0/5 |
| Stripe       | Opus 5    |    24,339 / 36 |    35,908 / 18 |  +48% |     $1.54 |    $1.22 |   2/2 |   2/2 |
| Stripe       | Haiku 4.5 | 35,056 / 14 ❌ |  19,929 / 9 ❌ |  −43% |  $0.17 ❌ | $0.12 ❌ |   0/5 |   0/5 |
| DigitalOcean | Sonnet 5  | 18,667 / 16 ❌ | 23,276 / 20 ❌ |  +25% |  $0.49 ❌ | $0.54 ❌ |   0/5 |   0/5 |
| DigitalOcean | Opus 5    |    19,626 / 14 |    28,664 / 26 |  +46% |     $0.65 |    $0.96 |   2/2 |   2/2 |
| DigitalOcean | Haiku 4.5 |    40,107 / 17 |    15,483 / 12 |  −61% |     $0.18 |    $0.13 |   2/5 |   1/5 |
| Cafe API     | Sonnet 5  |     16,935 / 1 |    10,849 / 10 |  −36% |     $0.43 |    $0.38 |   5/5 |   5/5 |
| Cafe API     | Opus 5    |     16,769 / 1 |    15,375 / 11 |   −8% |     $0.43 |    $0.65 |   2/2 |   2/2 |
| Cafe API     | Haiku 4.5 |     15,764 / 1 |     8,773 / 13 |  −44% |     $0.07 |    $0.10 |   5/5 |   3/5 |

Fifty-eight of 120 runs produced a flow that passes the check: 26 of 60 without the index, 32 of 60 with it.
The strongest single move is Sonnet 5 on the billing API — zero of five without the index, four of five with it, on a description whose only consistent failure was the missing `REB-APIKEY` header that the card's `auth:` line now states.
The clearest counter-example is DigitalOcean: a description already split into 2,909 single-operation files is an index, and the command's cards cost more than reading those files directly.
Stripe splits the difference — the index cannot rescue a plan that starts from a price that does not exist yet, and only Opus 5 avoids that premise.

## What the failures were

| Reason                                                                                      | Runs |
| ------------------------------------------------------------------------------------------- | ---: |
| how a call authenticates is never stated — the key, header, or token is nowhere in the flow |   44 |
| the product (or price's product) is never created, though nothing exists yet                |   25 |
| `POST /v1/prices` is missing — the flow starts from "your price id"                         |   14 |
| the volume is created but never attached to the droplet                                     |    9 |
| no call to mint the GitHub App installation token, though the flow says it uses one         |    9 |
| the subscription itself is never created                                                    |    7 |
| the plan/price step is missing                                                              |    5 |
| `POST /v2/vpcs` is missing                                                                  |    2 |
| no `POST /oauth2/token`, so the cafe order and its status return 401                        |    2 |
| the billing key is sent as `Authorization`, which this API rejects                          |    1 |
| `POST /v2/droplets` is missing                                                              |    1 |
| `POST /v2/volumes` is missing                                                               |    1 |
| `POST /v2/firewalls` is missing                                                             |    1 |
| the asset delete is missing                                                                 |    1 |
| the droplet is created outside the VPC — `vpc_uuid` is never set                            |    1 |

The two big classes are the same ones every earlier round found: authentication that never reaches the request, and a resource the flow depends on but never creates.
Stripe adds a sharper version of the second: the model does not miss the call, it assumes the object — "your price id" — because that is how most Stripe tutorials read.

## How this was measured

Every run is a fresh Claude Code session started from the command line with the task text as its only input, allowed to run shell commands, read files and search them.
Sessions start in a directory holding nothing but the description, outside any repository; the tree runs call a local build of PR #3005 at `0203f1081`.
Opus 5 cells hold two runs, Sonnet 5 and Haiku 4.5 cells five; the tables give the median over the runs whose flow works.

**context** — from the run's transcript, over the `assistant` records that carry a `message.usage`: a turn's context is `input_tokens + cache_read_input_tokens + cache_creation_input_tokens`, and the table gives the last turn's minus the first turn's.

**cost** — `total_cost_usd` as the run reports it. It moves with the prompt cache, so read it for shape.

**working** — the answer is parsed for the calls it proposes and compared with the flow the description requires: every required call, the host, the required body fields, the authentication. The check accepts any placeholder spelling — `{volume_id}`, `$VOLUME_ID`, a URL carried from an earlier response — and reports only what is nowhere in the answer.
