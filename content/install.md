---
title: Install & quick start
order: 1
description: Install Stratify with Homebrew, curl, or cargo, then run your first scan.
---

## Install

Pick the method fitting your setup.

### Homebrew

For macOS and Linux, if you already use Homebrew:

```sh
brew install stratify-dev/tap/stratify
```

### One-line installer

For macOS and Linux without Homebrew, run the installer script directly:

```sh
curl --proto '=https' --tlsv1.2 -LsSf https://github.com/stratify-dev/stratify/releases/latest/download/stratify-cli-installer.sh | sh
```

### Prebuilt binaries

For any other platform, or a CI runner where you want to pin an exact build, download a tarball from the [latest release](https://github.com/stratify-dev/stratify/releases/latest).

### From source

For contributors and anyone tracking the newest commit, build with cargo. This needs a [Rust toolchain](https://rustup.rs) installed first.

```sh
cargo install --git https://github.com/stratify-dev/stratify stratify-cli --locked
```

Every method installs the same binary, named `stratify`. Run `stratify --help` to see every command it supports.

## First scan

Run `stratify check` against any directory.

```sh
stratify check .
```

```
warn  Unused.java:2  unused function `neverCalled`
info  App.java:6  possibly unused function `helper`

2 finding(s).
```

Each line follows the same shape: a severity (`warn`, `info`, or `error`), the `file:line` where the finding sits, and a message naming what's wrong. The terminal output doubles as the report, so you know exactly what to fix without opening anything else.

"Possibly unused" and "unused" mark different confidence, not different phrasing. Dead-code detection resolves calls across files, so a function used only from another file still shows up, but as possibly unused rather than a flat unused. Stratify hedges instead of clearing a function it hasn't fully proven used, and hedges instead of staying silent on one it hasn't fully proven dead either.

## Output formats

```sh
stratify check .                 # human-readable, great in a terminal
stratify check . --format json   # structured findings for tooling
stratify check . --format sarif  # SARIF 2.1.0 for code scanning
```

Use `human` when you're reading results yourself in a terminal. Use `json` when a script or another tool consumes the findings. Use `sarif` when uploading to a code-scanning integration.

## Failing the build

`--fail-on` sets the severity threshold for the gate. It takes four values: `never` (the default, always exits 0), `info`, `warning`, and `error`. The moment any finding meets or exceeds the threshold, the command exits with code 1. Below the threshold, it exits 0.

```sh
stratify check . --fail-on warning
```

This flag is what turns a scan into a gate: run it in CI and any warning-or-worse finding stops the build. See [CI and SARIF](/docs/ci/) for wiring this into a GitHub Actions workflow.
