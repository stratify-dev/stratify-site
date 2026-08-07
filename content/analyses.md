---
title: The six analyses
order: 2
description: What each Stratify analysis finds, how confidence works, and how to configure layer boundaries.
---

All six analyses run in a single pass over the shared IR, so running every analysis costs one parse of your repository, not six separate tools each reading it on their own.

## Confidence

Every finding carries a confidence level. Confidence records how sure Stratify is about the specific reference behind a finding, and it feeds directly into severity. The type defines three levels, `unknown`, `likely`, and `certain`, but only the last two ever land on a finding today. `unknown` exists for ordering and for defensive handling elsewhere in the codebase, not as a value you'll see in output.

Dead code is where this shows up most. A function reached through a fully resolved, unambiguous call drops out of the report entirely: Stratify is certain it's used. A function reached only through a heuristic cross-file match, or not reached at all, still generates a finding, but the two cases get different severities. A likely-but-unresolved reference produces an info-level "possibly unused" finding. No reference at all produces a warning-level "unused" finding, at certain confidence, because the absence of any use is itself the certain fact.

The other five analyses report at certain confidence throughout: complexity is an exact count, duplication is an exact token match, cycles and boundaries follow deterministic graph rules. Confidence variation is a dead-code-specific signal, not a fuzziness layer across every rule.

## Dead code

Dead code finds functions and methods nothing in your repository calls. Stratify builds one call graph across every file it parses and flags any function no path reaches from an entrypoint.

What makes a finding fire depends on how the call was resolved. Calls within the same file resolve directly, so an unambiguous intra-file call clears the callee outright. Calls across files resolve by matching function names repo-wide, a heuristic rather than a guarantee, so a function reached only through this heuristic stays on the report as possibly unused instead of being cleared.

The most common misreading: assuming every "possibly unused" line is dead code. It usually isn't. A function used only from another file always reports as possibly unused, never fully cleared, because Stratify never upgrades a cross-file name match to certain. This is deliberate: a coincidental name match might clear a genuinely dead function, and Stratify would rather hand you an info-level line to triage than risk a false negative on a warning.

## Duplication

Duplication finds copy-pasted and renamed code blocks. Stratify normalizes every token to its class before comparing: identifiers become `ID`, numbers become `NUM`, strings become `STR`, and keywords, operators, and punctuation stay literal. Two blocks differing only in variable names still match, catching type-2 clones (renamed variables), not only identical text.

A finding fires when a run of normalized tokens repeats somewhere else in the repository, at or above a minimum length. Because normalization strips out language-specific identifier text, the same shape of code matches across two different languages, not only within one file.

The minimum run length defaults to 100 tokens and is tunable per repository:

```toml
[duplication]
min_tokens = 50
```

Lower `min_tokens` to catch smaller fragments. Raise it to cut false positives, since short snippets often look similar without being real duplicates.

## Complexity

Complexity flags functions with high cyclomatic complexity, the count of independent paths through a function's control flow.

A finding fires once a function's complexity exceeds the threshold, and severity ranks by how far past it the function sits: below double the threshold is an info-level finding, and double the threshold or beyond escalates to warning. This ranking separates "worth a look" from "refactor this now" without hiding either from the report.

The habit to build: read the complexity number in the message, not only the severity label. A function reported at info today, sitting a little over the threshold, is often a warning after one more `if` branch gets added.

## Churn hotspots

The churn hotspots analysis crosses complexity with git history: a function's complexity multiplied by how often its file has changed. High complexity in a file nobody touches isn't a hotspot. Neither is a frequently-changed file where every function stays simple. The combination is the risk signal.

A complexity floor keeps trivial functions out of the ranking entirely, no matter how often their file changes. A finding fires once a function clears the floor and its score, complexity times churn, crosses the hotspot threshold.

Hotspots emit at info severity, on purpose. This analysis prioritizes where to spend review time. It doesn't tell you anything is broken, so it never fails a `--fail-on` gate on its own. Treat it as a ranked list to work through, not a defect to fix.

## Dependency cycles

The dependency cycles analysis finds circular imports: file A imports B, B imports C, C imports back to A. Stratify builds this graph from resolved imports and reports each distinct cycle once, no matter how many files sit on it or which file you'd hit it from first.

Resolution happens above the file level where a language groups files into packages. Go packages and Python packages (a directory with an `__init__.py`) collapse to one node in the graph, so an import of the package resolves to a real package-level edge instead of missing the file defining the imported name.

The mistake to avoid: expecting a cycle to point at the two files most directly involved. The reported cycle often runs through several files, and breaking it means removing one edge anywhere along it, not necessarily the one nearest wherever you're looking.

## Layer boundaries

The layer boundaries analysis flags imports crossing an architecture rule you define. This needs a `stratify.toml` at your repository root, or an auto-detected preset (see below). With neither, it reports nothing.

A finding fires when a file in one named layer imports a file in a layer it's forbidden from reaching. Direction matters: a rule forbidding `models` from importing `controllers` says nothing about `controllers` importing `models`.

### Presets

Two presets ship built in. `rails` lays out `controllers`, `models`, `views`, `mailers`, and `jobs`, and stops `models` from importing `controllers`, `views`, or `mailers`. `layered` lays out `controller`, `service`, `repository`, and `domain`, the stack common to Spring, NestJS, and similar frameworks, and stops the lower layers from importing anything above them.

With no `stratify.toml` present, Stratify looks for a marker and applies the matching preset. It applies `rails` when the repository root has an `app/controllers/` directory or a `config/routes.rb` file. It applies `layered` when the root has a `pom.xml` or a `build.gradle`. A root matching neither marker gets no boundary checks at all.

```toml
preset = "rails"
```

### Custom layers and rules

Add your own `[layers]` and `[[forbid]]` entries to extend or override a preset:

```toml
preset = "rails"

[layers]
models = ["lib/models/**"]   # replaces the preset's app/models/** glob

[[forbid]]
from = "models"
to = "jobs"
```

The merge follows one rule per table. Your layer keys replace the preset's keys of the same name, so redefining `models` overrides only `models` and leaves `controllers`, `views`, `mailers`, and `jobs` from the preset untouched. Your `[[forbid]]` rules are added to the preset's, not swapped in for them, so the example above keeps every rails-preset rule and adds one more.

## Coverage

| Analysis | Java | Ruby | TypeScript | Python | Go | Rust |
|---|---|---|---|---|---|---|
| Dead code | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Duplication | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Complexity | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Churn hotspots | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Dependency cycles | ✓ | ✓ | ✓ | ✓ | ✓ | n/a |
| Layer boundaries | ✓ | ✓ | ✓ | ✓ | ✓ | n/a |

Rust gets dead code, duplication, complexity, and churn hotspots today. Dependency cycles and layer boundaries need module and `use` resolution, which isn't built yet, so those two rows report nothing for Rust until it lands.
