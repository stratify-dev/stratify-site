---
title: CI & SARIF
order: 3
description: Run Stratify as a GitHub Action gate and upload SARIF to code scanning.
---

## The GitHub Action

Drop Stratify into any workflow as a quality gate:

```yaml
- uses: actions/checkout@v4
- uses: stratify-dev/stratify@{{VERSION}}
  with:
    path: .
    fail-on: warning
```

The action downloads a prebuilt `stratify` binary instead of compiling from source, so the step starts in seconds. Pin a released tag, like `@{{VERSION}}`, for stable runs across your team. Point at `@main` instead if you want every workflow run to track the newest commit on the default branch.

## Action inputs

| Input | Default | Description |
|---|---|---|
| `path` | `.` | Directory to analyze. |
| `fail-on` | `warning` | Minimum severity that fails the step: `never`, `info`, `warning`, or `error`. |
| `format` | `human` | Output format: `human`, `json`, or `sarif`. |

## SARIF and code scanning

Stratify emits SARIF 2.1.0, the format GitHub and GitLab both render as inline annotations on pull requests.

```sh
stratify check . --format sarif > stratify.sarif
```

Upload the file to GitHub code scanning as a second step:

```yaml
- uses: actions/checkout@v4
- uses: stratify-dev/stratify@{{VERSION}}
  with:
    fail-on: never
- run: stratify check . --format sarif > stratify.sarif
- uses: github/codeql-action/upload-sarif@v4
  with:
    sarif_file: stratify.sarif
```

Set `fail-on: never` on the action step here. You still get every finding in code scanning for review, without the workflow failing on a threshold you haven't decided to enforce yet.
