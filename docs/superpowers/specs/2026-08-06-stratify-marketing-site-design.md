# Stratify marketing site — design

**Date:** 2026-08-06
**Domain:** https://stratify.dynaum.com
**Repo:** `stratify-dev/stratify-site`
**Status:** approved, ready for planning

## Goal

Give Stratify a public home. The landing page sells one idea to a staff engineer at a
company with a mixed stack: one gate, one report shape, every language. The docs pages
carry the depth the README should not.

**Primary action:** copy the GitHub Action YAML into a CI workflow.
**Secondary action:** copy the Homebrew install line.

## Audience

Staff engineers, platform leads, and tech leads who own code quality across several
language ecosystems. They already run per-language linters. The pitch is consolidation:
one binary, one config, one report, six languages.

Not the audience for the landing page: beginners learning static analysis, and buyers
looking for a hosted product. Stratify has no server and no accounts, and the page says so.

## Hosting and DNS

| Concern | Decision |
|---------|----------|
| Repo | New: `stratify-dev/stratify-site` |
| Host | GitHub Pages, deployed from a GitHub Actions artifact |
| Domain | `stratify.dynaum.com`, set in a `CNAME` file at the repo root |
| DNS | New CNAME record `stratify` → `stratify-dev.github.io.` in `dynaum/digitalocean-dns` (`dns.tf`), applied with `terraform apply` |
| TLS | GitHub Pages managed certificate, "Enforce HTTPS" on |

A separate repo, rather than a folder inside `stratify-dev/stratify`, for two reasons.
The engine repo runs a self-scan in CI, and site JavaScript would land in its findings.
Site commits also stay out of the engine's release history.

## Build

A single Node script, `build.mjs`, run by `npm run build`. Output lands in `dist/`,
which is gitignored and produced fresh on every deploy.

**Dependencies (2):**

- `marked` — markdown to HTML.
- `shiki` — build-time syntax highlighting with dual light/dark themes emitted as CSS
  variables. No highlighting JavaScript reaches the browser.

**What the build does:**

1. Resolve the current release version (see "Version resolution").
2. Copy `src/` static assets and `assets/` into `dist/`.
3. Render `src/index.html` with version substitution.
4. For each file in `content/*.md`: parse frontmatter (`title`, `order`, `description`),
   render markdown, highlight code fences, wrap in `templates/docs.html`, write to
   `dist/docs/<slug>/index.html`.
5. Build the sidebar nav from frontmatter `order` and inject it into every docs page.
6. Extract `h2` headings per page into an on-page anchor list.
7. Write prev/next links from the ordered page list.

### Version resolution

Snippets write the literal token `{{VERSION}}` (for example `stratify-dev/stratify@{{VERSION}}`).
At build time the script fetches the latest release tag from
`https://api.github.com/repos/stratify-dev/stratify/releases/latest`.

Failure handling: a network error, a rate limit, or a non-200 response falls back to
`FALLBACK_VERSION`, a constant at the top of `build.mjs`. The build prints a warning to
stderr and exits 0. A failed version lookup never blocks a deploy.

The build fails hard on one condition only: an unresolved `{{...}}` token surviving into
`dist/`. That means a typo in a placeholder name.

### File layout

```
stratify-site/
├── CNAME                       stratify.dynaum.com
├── build.mjs                   the whole build
├── package.json                marked, shiki, scripts: build, test, dev
├── content/
│   ├── install.md
│   ├── analyses.md
│   ├── ci.md
│   └── integrations.md
├── templates/
│   ├── docs.html               docs shell: head, sidebar, article slot, anchors, prev/next
│   ├── head-scripts.html       inline theme-flash guard, shared
│   ├── nav.html                site header, shared
│   └── foot.html               site footer, live region, script tag, shared
├── src/
│   ├── index.html              landing page, hand-written
│   ├── styles.css              tokens + landing styles
│   ├── docs.css                docs shell styles
│   └── theme.js                theme toggle, copy buttons, scroll reveal
├── assets/
│   ├── strata.svg              hero graphic (also inlined into index.html)
│   └── favicon.svg
├── test/
│   └── build.test.mjs
├── docs/superpowers/           spec + plan
└── .github/workflows/deploy.yml
```

### Scripts

| Script | Does |
|--------|------|
| `npm run build` | Builds `dist/` |
| `npm test` | Builds into a temp dir and runs the assertions below |
| `npm run dev` | Builds, then serves `dist/` on port 8000 with `python3 -m http.server`, matching how the other dynaum site repos preview locally |

### Deploy workflow

`.github/workflows/deploy.yml`, triggered on push to `main`, on
`workflow_dispatch`, and weekly on a schedule (so a new engine release refreshes the
version snippets without a site commit).

Steps: checkout → setup-node 20 → `npm ci` → `npm test` → `npm run build` →
`actions/upload-pages-artifact` with `path: dist` → `actions/deploy-pages`.
Permissions: `pages: write`, `id-token: write`.

## Visual design

Concept: **strata**. Horizontal bands are the organizing motif, matching the name and the
real architecture. Six language bands compress into one IR band, the IR fans into six
analysis bands, findings converge, then fan out to surfaces.

### Theme

Light default with a dark toggle. Preference stored in `localStorage` under
`stratify-theme`, falling back to `prefers-color-scheme`. An inline script in `<head>`
sets the theme attribute before first paint to avoid a flash. Tokens are CSS custom
properties on `:root` and `[data-theme="dark"]`, in the same shape as dynaum.com.

### Palette

Accents come from severity, so the site and the tool agree:

| Token | Meaning | Light | Dark |
|-------|---------|-------|------|
| `--sev-info` | info findings | `#1d5fd0` | `#7fa9f5` |
| `--sev-warn` | warning findings | `#9a6100` | `#e8b04b` |
| `--sev-error` | error findings | `#b3261e` | `#f28b82` |
| `--accent` | links, primary button | `#1d5fd0` | `#7fa9f5` |
| `--bg` | page background | `#fbfaf8` | `#12141a` |
| `--fg` | body text | `#1a1c22` | `#e6e8ee` |

Every pair above clears WCAG AA (4.5:1) against its own background. Implementation
verifies each ratio and adjusts lightness only, keeping hue. Severity colors always carry
a text label, never color alone.

### Motion

Strata bands reveal on scroll with a short staggered fade and a small vertical offset.
An `IntersectionObserver` adds a class, CSS does the animation. Every animation sits
inside a `@media (prefers-reduced-motion: no-preference)` guard. With reduced motion the
page renders in its final state, no transitions.

## Landing page

Single page, `src/index.html`, in this order.

1. **Nav** — wordmark, Docs, GitHub, theme toggle. Sticky, condensed on scroll.
2. **Hero** — headline "One binary. Six languages. Six analyses." Sub-line names the
   problem: a polyglot repo with a different quality bar per ecosystem. Primary button
   copies the Action YAML to the clipboard. Secondary copies the brew line. Both show a
   copied confirmation and both work without JavaScript (the snippet stays visible and
   selectable).
3. **Strata graphic** — inline SVG, the visual centerpiece. Six language bands → one IR
   band → six analysis bands → findings → six surfaces. Labeled, readable at mobile
   width, `role="img"` with a text alternative describing the flow.
4. **Terminal card** — real `stratify check .` output, severity-colored, monospace, with
   the command line above it.
5. **Three claims** — six languages and one engine · every finding carries a confidence
   level · runs in CLI, CI, editor, agent, and dashboard.
6. **Six analysis cards** — dead code, duplication, complexity, churn hotspots,
   dependency cycles, layer boundaries. One line each, each linking to its section in
   the analyses doc.
7. **Language matrix** — 6 languages × 6 analyses. Supported cells and Rust's two pending
   cells (cycles, boundaries) both marked, with a footnote naming what Rust needs
   (module and `use` resolution).
8. **Surfaces strip** — CLI, GitHub Action, SARIF, MCP, LSP, OpenTelemetry. Each gets a
   short snippet and a link into the matching doc page.
9. **Closing CTA** — install line, repo link.
10. **Footer** — current version, license, repo, "built by" credit, link to dynaum.com.

## Docs

Four pages under `/docs/`, sharing one shell: top nav, left sidebar listing all four
pages, right-hand on-page anchor list on wide screens, prev/next at the foot.

| Page | Slug | Covers |
|------|------|--------|
| Install & quick start | `/docs/install/` | Homebrew, curl installer, cargo, prebuilt tarballs, first scan, output formats, `--fail-on` as a gate |
| The six analyses | `/docs/analyses/` | What each analysis finds, confidence levels and `possibly unused`, cross-file resolution, package-level imports, plus `stratify.toml` presets and custom `[layers]` / `[[forbid]]` rules under the boundaries section |
| CI & SARIF | `/docs/ci/` | Action usage, the three inputs, pinning a tag, SARIF 2.1.0 output, upload to GitHub code scanning |
| Integrations | `/docs/integrations/` | MCP server and the `analyze` tool, LSP diagnostics, OTLP metrics and the run event, Datadog intake |

Content comes from the current README, expanded where the README is terse. Every version
reference goes through `{{VERSION}}`.

### Source of truth

The README keeps the pitch, install, and 60-second start, and gains one line pointing at
https://stratify.dynaum.com for full docs. The site carries the long form. This split is
stated in the site repo README so future edits land in the right place.

## Accessibility

- Semantic landmarks: `header`, `nav`, `main`, `footer`.
- Skip-to-content link as the first focusable element.
- Visible focus rings on every interactive element.
- The strata SVG has a text alternative; decorative shapes are `aria-hidden`.
- Copy buttons announce their result through an `aria-live="polite"` region.
- Body text meets WCAG AA contrast in both themes.
- Keyboard reachable throughout. No hover-only affordances.

## Performance budget

- No client-side framework. `theme.js` stays under 3 KB.
- No web fonts. System stacks only: `ui-sans-serif, system-ui, ...` for text and
  `ui-monospace, SFMono-Regular, Menlo, monospace` for code.
- Total landing page transfer under 150 KB.
- All CSS in two files, both render-blocking and small.

## Testing

`npm test` runs `test/build.test.mjs`, which builds into a temp directory and asserts:

1. Every file in `content/` produced a page at its expected path.
2. `dist/index.html` exists, contains the hero headline, and carries the same injected header and footer as the docs pages.
3. No `{{` token and no unfilled `<!--SLOT-->` marker survives anywhere in `dist/`.
4. Every same-origin `href` resolves: a path href points at a real file in `dist/`, and a
   fragment href points at an element with a matching `id` on the same page. External
   `http(s)` hrefs and `mailto:` are skipped.
5. The sidebar nav appears on all four docs pages, with all four links.
6. Version substitution replaced `{{VERSION}}` with something matching `v\d+\.\d+\.\d+`.
7. `CNAME` reached `dist/` with the right content.

The version fetch is stubbed in tests through an environment variable
(`STRATIFY_VERSION`), so the suite runs offline and stays deterministic.

Manual QA on top: both themes, mobile and desktop widths, reduced-motion on, keyboard-only
pass, and a Lighthouse run.

## Out of scope

- A blog or changelog on the site. Releases live on GitHub.
- Search across docs.
- Analytics of any kind.
- A WASM in-browser demo. Noted as a future idea, not built now.
- Versioned docs. The site documents the latest release only.

## Rollout

1. Create `stratify-dev/stratify-site` and push the source. CI builds and deploys.
2. Enable GitHub Pages (source: GitHub Actions) and set the custom domain.
3. Add the CNAME record in `digitalocean-dns`, apply, wait for propagation.
4. Enforce HTTPS once the certificate is issued.
5. Add the docs link to the engine README.
6. Refresh the Obsidian note for stratify in the `web` vault.
