---
title: Judgment layer
order: 5
description: stratify-judge reads the findings Stratify could not prove and moves each one along the confidence ladder, using a hosted or a local model.
---

## Where proof stops

Stratify resolves calls statically. When cross-file resolution falls short, it reports `possibly unused` at `info` severity instead of a false `unused` at `warn`. That hedge is honest, and it leaves a residue: framework hooks, test helpers, public API surface, and symbols reached only through reflection.

`stratify-judge` reads that residue. It asks a model five specific questions about each finding and moves the finding along the same confidence ladder the engine already uses. No finding is deleted, ever. A dismissed finding drops below the display threshold and keeps its full judgment, every raw probability included, in the JSON.

Measured on Stratify's own repository: all 15 `possibly unused` findings are false positives, and the judgment dismisses all 15 while strengthening none.

The tool is a separate binary in its own repository, [stratify-dev/stratify-judge](https://github.com/stratify-dev/stratify-judge). The engine never calls a model, and nothing about a `stratify check` run changes when you add one.

## Install

Homebrew, from the first tagged release (`v0.1.0`) onward:

```sh
brew install stratify-dev/tap/stratify-judge
```

From source, with a [Rust toolchain](https://rustup.rs):

```sh
cargo install --git https://github.com/stratify-dev/stratify-judge stratify-judge-cli --locked
```

The binary is `stratify-judge`.

## Run it

It reads a JSON report on stdin and writes a report back:

```sh
export TYPESAFE_API_KEY=...
stratify check . --format json | stratify-judge --root .
```

```
info  src/lib.rs:6  possibly unused function `helper`
      jev-latest: reached by a framework (0.91)

73 findings, 9 shown, 64 hidden. Re-run with --show-dismissed to see them.
```

`--root` points at the repository the report describes. The tool walks it itself to read each function's source, the attributes above it, the file's imports, and every other place the name appears, so the model judges the code rather than the finding's one-line message.

`--dry-run` reports how many requests a real run would send and its token estimate, and sends nothing. It counts through the same cache check a real run uses, so a committed cache shows as zero requests. It always exits 0.

Without an API key, the report passes through unchanged and the exit code still follows `--fail-on`. A network failure behaves the same way. Judgment is additive, never a dependency of the scan.

## Two backends

Both models speak the same `POST /v1/systemone` protocol, so one flag switches between them.

| Backend | Endpoint | Key | Model id |
|---|---|---|---|
| `jev` (default) | `https://api.typesafe.ai` | `TYPESAFE_API_KEY`, required | `jev-latest` |
| `laya` | `http://127.0.0.1:8000` | `LAYA_API_KEY`, optional | none sent |

`jev` is TypeSafe's hosted model. `laya` is [Convai's Laya](https://huggingface.co/convaiinnovations/laya), Apache-2.0, served on your own machine, where no source leaves the box:

```sh
pip install 'laya[serve]'
laya-serve --max-len 8192
stratify check . --format json | stratify-judge --root . --backend laya
```

`--max-len 8192` is required. Laya's default checkpoint holds 512 tokens, and 512 tokens of state cannot hold even one dead-code request. Serving it that way trips the context floor on the first finding, with an error naming the backend, its budget, and the finding that overflowed. The tool refuses rather than truncating the evidence and asking about a function it cannot see.

Set the default backend in `stratify.toml` or `stratify-judge.toml`, and add any endpoint of your own:

```toml
[judge]
backend = "laya"

[judge.backends.laya]
url = "http://127.0.0.1:8000"
state_tokens = 8192
api_key_env = "LAYA_API_KEY"
api_key_required = false
```

Resolution order, narrowest wins: the `--backend` flag, then this config key, then `jev`.

## The five questions

Each finding gets the same five, answered as probabilities rather than prose.

| Question | Shape | What it settles |
|---|---|---|
| `framework_invoked` | probability | A DI container, route table, serializer, or plugin registry calls it with no explicit call in source. |
| `test_only` | probability | It exists to support tests: a fixture builder, a helper, an assertion utility. |
| `external_api` | probability | It is public API surface for consumers outside this repository. |
| `resolver_missed_a_call` | probability | A real call site exists that the engine failed to resolve. |
| `explanation` | pick one of seven | Best explanation for the absent call: `framework_invoked`, `test_support`, `public_api`, `entrypoint`, `resolver_limitation`, `genuinely_unused`, or `cannot_tell`. |

The answers drive one of four verdicts, at thresholds you own:

- **Dismiss** drops confidence to `Unknown`, below the display threshold. Any of: a resolved call the engine missed at 0.70, a framework or test-only reading at 0.75, an `entrypoint` or `resolver_limitation` explanation at 0.70.
- **Weaken** steps severity down once, for public API surface above `info`.
- **Strengthen** raises confidence to `Certain`, and only when all four probabilities read below 0.25, the explanation is `genuinely_unused` above 0.70, **and** the engine itself already said `Certain`. A finding the engine hedged is never promoted, whatever the model says. Inverting the engine's own epistemics is the one thing a judgment layer must not do.
- **Keep** leaves the finding as the engine found it. A missing answer always lands here: absence is not evidence.

Override any threshold under `[judge.thresholds.dead_code]`.

## Auditing a run

`--format json` keeps every raw probability on the finding, next to the verdict and the model that produced it. A dismissed finding is still in the report, still carries its judgment, and `--show-dismissed` prints it. Nothing is lost to a threshold you might want to revisit.

Answers cache under `.stratify/judge-cache/`, keyed on the judge's version, the backend, its endpoint, its model, the state, and the question set. Commit the directory: CI then reruns without calling the API, results stay deterministic, and a change to question wording arrives as a reviewable diff of verdicts. An answer from Jev and an answer from Laya never share a key, so switching backends cannot serve you a verdict from a model you did not run.

Today the layer judges `dead_code`. The other five analyses stay untouched.
